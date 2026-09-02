const { prisma } = require("./db");
const { generateToken } = require("./utils");

async function getActiveRecipients() {
  return prisma.recipient.findMany({
    where: { active: true },
    orderBy: [{ level: "asc" }, { name: "asc" }]
  });
}

/**
 * Called right after a ChangeRequest row is created. Creates one
 * RequestApproval per active recipient, and marks the ones that should
 * be emailed immediately as NOTIFIED (all of them in SINGLE mode; only
 * the lowest level in HIERARCHICAL mode). Returns those to notify.
 */
async function initializeApprovals(requestId, mode) {
  const recipients = await getActiveRecipients();
  if (recipients.length === 0) {
    throw new Error("No active recipients configured. Add one in the admin panel first.");
  }

  const created = await Promise.all(
    recipients.map((r) =>
      prisma.requestApproval.create({
        data: {
          requestId,
          recipientId: r.id,
          level: r.level,
          token: generateToken(),
          status: "PENDING"
        },
        include: { recipient: true }
      })
    )
  );

  const toNotify =
    mode === "SINGLE"
      ? created
      : created.filter((a) => a.level === Math.min(...created.map((x) => x.level)));

  await prisma.requestApproval.updateMany({
    where: { id: { in: toNotify.map((a) => a.id) } },
    data: { status: "NOTIFIED", notifiedAt: new Date() }
  });

  return toNotify;
}

/**
 * Applies one recipient's decision, identified by their unique review token.
 * Handles both SINGLE (first decision wins) and HIERARCHICAL (must clear
 * every recipient at a level before advancing; any rejection ends it).
 *
 * The whole thing runs inside a Serializable transaction: two recipients
 * deciding within milliseconds of each other (both in SINGLE mode, or the
 * last two approvers clearing the same HIERARCHICAL level at once) both
 * read the same "still PENDING" state before either write commits, so
 * without isolation both could finalize the request independently and
 * leave contradictory rows behind. Serializable makes Postgres abort one
 * side with a P2034 conflict instead; the caller (publicApi.js) already
 * wraps this call in withRetry, which retries on P2034, and the retry
 * re-reads the now-committed state and resolves correctly (typically as
 * "already-decided" or "waiting").
 *
 * Returns one of:
 *   { kind: "not-found" }
 *   { kind: "already-decided", requestStatus }
 *   { kind: "waiting", requestId, refCode, deciderName }        // hierarchical: level not fully cleared yet
 *   { kind: "advanced", toNotify, requestId, refCode, deciderName } // hierarchical: moved to next level
 *   { kind: "finalized", status, requestId, refCode, deciderName }
 */
async function applyDecision(token, decision, comment) {
  return prisma.$transaction(
    async (tx) => {
      const approval = await tx.requestApproval.findUnique({
        where: { token },
        include: { request: true, recipient: true }
      });
      if (!approval) return { kind: "not-found" };

      if (
        approval.request.status !== "PENDING" ||
        approval.status === "APPROVED" ||
        approval.status === "REJECTED"
      ) {
        return { kind: "already-decided", requestStatus: approval.request.status };
      }

      await tx.requestApproval.update({
        where: { id: approval.id },
        data: { status: decision, comment: comment || null, decidedAt: new Date() }
      });

      const common = {
        requestId: approval.requestId,
        refCode: approval.request.refCode,
        deciderName: approval.recipient.name
      };

      // Any rejection, in either mode, ends the request immediately.
      if (decision === "REJECTED") {
        await tx.changeRequest.update({ where: { id: approval.requestId }, data: { status: "REJECTED" } });
        await tx.requestApproval.updateMany({
          where: {
            requestId: approval.requestId,
            id: { not: approval.id },
            status: { in: ["PENDING", "NOTIFIED"] }
          },
          data: { status: "SKIPPED" }
        });
        return { kind: "finalized", status: "REJECTED", ...common };
      }

      // APPROVED
      if (approval.request.approvalMode === "SINGLE") {
        await tx.changeRequest.update({ where: { id: approval.requestId }, data: { status: "APPROVED" } });
        await tx.requestApproval.updateMany({
          where: {
            requestId: approval.requestId,
            id: { not: approval.id },
            status: { in: ["PENDING", "NOTIFIED"] }
          },
          data: { status: "SKIPPED" }
        });
        return { kind: "finalized", status: "APPROVED", ...common };
      }

      // HIERARCHICAL — every recipient at this level must approve before advancing.
      const siblingsStillPending = await tx.requestApproval.count({
        where: {
          requestId: approval.requestId,
          level: approval.level,
          id: { not: approval.id },
          status: { in: ["PENDING", "NOTIFIED"] }
        }
      });
      if (siblingsStillPending > 0) {
        return { kind: "waiting", ...common };
      }

      const remaining = await tx.requestApproval.findMany({
        where: { requestId: approval.requestId, status: "PENDING" },
        include: { recipient: true },
        orderBy: { level: "asc" }
      });

      if (remaining.length === 0) {
        await tx.changeRequest.update({ where: { id: approval.requestId }, data: { status: "APPROVED" } });
        return { kind: "finalized", status: "APPROVED", ...common };
      }

      const nextLevel = Math.min(...remaining.map((a) => a.level));
      const toNotify = remaining.filter((a) => a.level === nextLevel);
      await tx.requestApproval.updateMany({
        where: { id: { in: toNotify.map((a) => a.id) } },
        data: { status: "NOTIFIED", notifiedAt: new Date() }
      });

      return { kind: "advanced", toNotify, ...common };
    },
    { isolationLevel: "Serializable" }
  );
}

module.exports = { getActiveRecipients, initializeApprovals, applyDecision };
