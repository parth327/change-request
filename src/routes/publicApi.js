const express = require("express");
const { prisma } = require("../lib/db");
const { changeRequestSchema, decisionSchema, trackLookupSchema, generateRefCode, getOrigin } = require("../lib/utils");
const { initializeApprovals, applyDecision } = require("../lib/workflow");
const { sendSubmitterConfirmation, sendRecipientReviewRequest, sendDecisionEmail } = require("../lib/email");
const { submitLimiter, decideLimiter, trackLimiter } = require("../lib/rateLimiters");
const { withRetry } = require("../lib/withRetry");

const router = express.Router();

router.post("/submit", submitLimiter, async (req, res) => {
  const parsed = changeRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid submission.", issues: parsed.error.flatten().fieldErrors });
  }

  const settings = await withRetry(() => prisma.settings.findUnique({ where: { id: 1 } }));
  const approvalMode = settings?.approvalMode ?? "SINGLE";

  const created = await withRetry(() =>
    prisma.changeRequest.create({
      data: {
        refCode: generateRefCode(),
        submitterEmail: parsed.data.email,
        changeDate: new Date(parsed.data.changeDate),
        description: parsed.data.description,
        reason: parsed.data.reason || null,
        approvalMode
      }
    })
  );

  let toNotify;
  try {
    toNotify = await initializeApprovals(created.id, approvalMode);
  } catch (err) {
    // Roll back the orphaned request if there are no recipients to notify.
    await prisma.changeRequest.delete({ where: { id: created.id } }).catch(() => {});
    return res.status(500).json({ error: err.message || "Could not start the approval workflow." });
  }

  const origin = getOrigin(req);

  const emailJobs = [
    sendSubmitterConfirmation({
      submitterEmail: created.submitterEmail,
      refCode: created.refCode,
      changeDate: created.changeDate,
      description: created.description,
      reason: created.reason
    }),
    ...toNotify.map((a) =>
      sendRecipientReviewRequest({
        recipientEmail: a.recipient.email,
        recipientName: a.recipient.name,
        refCode: created.refCode,
        submitterEmail: created.submitterEmail,
        changeDate: created.changeDate,
        description: created.description,
        reason: created.reason,
        reviewUrl: `${origin}/review/${a.token}`
      })
    )
  ];

  const results = await Promise.allSettled(emailJobs);
  results.filter((r) => r.status === "rejected").forEach((r) => console.error("Notification email failed:", r.reason));

  res.json({ id: created.id, refCode: created.refCode });
});

router.post("/track", trackLimiter, async (req, res) => {
  const parsed = trackLookupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Enter a valid email and reference code." });
  }
  const request = await withRetry(() =>
    prisma.changeRequest.findFirst({
      where: {
        refCode: { equals: parsed.data.refCode, mode: "insensitive" },
        submitterEmail: { equals: parsed.data.email, mode: "insensitive" }
      }
    })
  );
  if (!request) {
    return res.status(404).json({ error: "No request matches that email and reference code." });
  }
  res.json({ id: request.id });
});

router.post("/review/:token/decide", decideLimiter, async (req, res) => {
  const parsed = decisionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid submission." });
  }

  const result = await withRetry(() => applyDecision(req.params.token, parsed.data.decision, parsed.data.comment || null));

  if (result.kind === "not-found") {
    return res.status(404).json({ error: "This review link is not valid." });
  }

  if (result.kind === "already-decided") {
    return res.json({ message: "This request has already been decided.", status: result.requestStatus });
  }

  if (result.kind === "finalized") {
    const request = await prisma.changeRequest.findUnique({ where: { id: result.requestId } });
    if (request) {
      sendDecisionEmail({
        submitterEmail: request.submitterEmail,
        refCode: request.refCode,
        decision: result.status,
        decidedByName: result.deciderName || "the approver",
        comment: parsed.data.comment || null
      }).catch((err) => console.error("Failed to send decision email:", err));
    }
    return res.json({ message: "Decision recorded.", status: result.status });
  }

  if (result.kind === "advanced") {
    const request = await prisma.changeRequest.findUnique({ where: { id: result.requestId } });
    const origin = getOrigin(req);
    if (request) {
      Promise.allSettled(
        result.toNotify.map((a) =>
          sendRecipientReviewRequest({
            recipientEmail: a.recipient.email,
            recipientName: a.recipient.name,
            refCode: request.refCode,
            submitterEmail: request.submitterEmail,
            changeDate: request.changeDate,
            description: request.description,
            reason: request.reason,
            reviewUrl: `${origin}/review/${a.token}`
          })
        )
      ).then((results) =>
        results.filter((r) => r.status === "rejected").forEach((r) => console.error("Notification email failed:", r.reason))
      );
    }
    return res.json({ message: "Your decision was recorded and sent to the next approver." });
  }

  // result.kind === "waiting"
  res.json({ message: "Your decision was recorded. Waiting on the other approver(s) at this stage." });
});

module.exports = router;
