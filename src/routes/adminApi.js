const express = require("express");
const bcrypt = require("bcryptjs");
const { prisma } = require("../lib/db");
const { requireAdminApi } = require("../middleware/requireAdmin");
const { signAdminSession, SESSION_COOKIE_NAME, cookieOptions } = require("../lib/auth");
const { sendRecipientReviewRequest } = require("../lib/email");
const { loginLimiter } = require("../lib/rateLimiters");
const {
  loginSchema,
  recipientCreateSchema,
  recipientUpdateSchema,
  settingsUpdateSchema,
  formatDate,
  formatDateTime,
  getOrigin
} = require("../lib/utils");

const router = express.Router();

// A hash of a random, never-used password. Comparing against this when the
// looked-up admin doesn't exist keeps the login response time consistent
// whether or not the email is registered, avoiding an email-enumeration
// timing side-channel.
const DUMMY_HASH = "$2a$12$SHi60Qj/TC0fRNlMPBUYVOtKbBBzOmvigYYop6gTZPiLxb3yuhiJm";

router.post("/login", loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Enter a valid email and password." });
  }

  const admin = await prisma.admin.findUnique({ where: { email: parsed.data.email } });
  const valid = await bcrypt.compare(parsed.data.password, admin ? admin.passwordHash : DUMMY_HASH);

  if (!admin || !valid) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  const token = signAdminSession({ adminId: admin.id, email: admin.email, name: admin.name });
  res.cookie(SESSION_COOKIE_NAME, token, cookieOptions);
  res.json({ ok: true });
});

router.post("/logout", (req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
});

// Everything below requires an authenticated admin session.
router.use(requireAdminApi);

// --- Recipients ---

router.get("/recipients", async (req, res) => {
  const recipients = await prisma.recipient.findMany({
    orderBy: [{ active: "desc" }, { level: "asc" }, { name: "asc" }]
  });
  res.json({ recipients });
});

router.post("/recipients", async (req, res) => {
  const parsed = recipientCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Enter a valid name, email, and level." });
  }
  const existing = await prisma.recipient.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return res.status(409).json({ error: "A recipient with this email already exists." });
  }
  const recipient = await prisma.recipient.create({ data: parsed.data });
  res.status(201).json({ recipient });
});

router.patch("/recipients/:id", async (req, res) => {
  const parsed = recipientUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid update." });
  }
  try {
    const recipient = await prisma.recipient.update({ where: { id: req.params.id }, data: parsed.data });
    res.json({ recipient });
  } catch {
    res.status(400).json({ error: "Recipient not found or email already in use." });
  }
});

// --- Requests ---

const REQUESTS_PAGE_SIZE = 20;

router.get("/requests", async (req, res) => {
  const status = req.query.status;
  const q = req.query.q?.trim();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);

  const where = {
    ...(status && ["PENDING", "APPROVED", "REJECTED"].includes(status) ? { status } : {}),
    ...(q
      ? {
          OR: [
            { refCode: { contains: q, mode: "insensitive" } },
            { submitterEmail: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } }
          ]
        }
      : {})
  };

  const [requests, total] = await Promise.all([
    prisma.changeRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { approvals: { include: { recipient: true } } },
      skip: (page - 1) * REQUESTS_PAGE_SIZE,
      take: REQUESTS_PAGE_SIZE
    }),
    prisma.changeRequest.count({ where })
  ]);

  res.json({ requests, total, page, pageSize: REQUESTS_PAGE_SIZE });
});

router.get("/requests/:id", async (req, res) => {
  const request = await prisma.changeRequest.findUnique({
    where: { id: req.params.id },
    include: { approvals: { include: { recipient: true }, orderBy: { level: "asc" } } }
  });
  if (!request) return res.status(404).json({ error: "Not found." });
  res.json({ request });
});

// Re-sends the review email to whichever recipients are currently NOTIFIED
// on a request — useful if the original email was lost, filtered as spam,
// or a recipient simply needs a nudge. Only ever targets approvals that are
// still awaiting a decision.
router.post("/requests/:id/resend", async (req, res) => {
  const request = await prisma.changeRequest.findUnique({
    where: { id: req.params.id },
    include: { approvals: { where: { status: "NOTIFIED" }, include: { recipient: true } } }
  });
  if (!request) return res.status(404).json({ error: "Not found." });
  if (request.status !== "PENDING") {
    return res.status(400).json({ error: "This request is already decided." });
  }
  if (request.approvals.length === 0) {
    return res.status(400).json({ error: "No approver is currently awaiting notification." });
  }

  const origin = getOrigin(req);
  await Promise.allSettled(
    request.approvals.map((a) =>
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
  );

  res.json({ message: `Resent to ${request.approvals.length} recipient(s).` });
});

// --- Settings ---

router.get("/settings", async (req, res) => {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, approvalMode: "SINGLE" }
  });
  res.json({ settings });
});

router.patch("/settings", async (req, res) => {
  const parsed = settingsUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid approval mode." });
  }
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: { approvalMode: parsed.data.approvalMode },
    create: { id: 1, approvalMode: parsed.data.approvalMode }
  });
  res.json({ settings });
});

// --- Export ---

function csvEscape(value) {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

router.get("/export", async (req, res) => {
  const requests = await prisma.changeRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { approvals: { include: { recipient: true }, orderBy: { level: "asc" } } }
  });

  const header = [
    "Reference",
    "Submitted",
    "Submitter Email",
    "Date of Change",
    "Description",
    "Reason",
    "Status",
    "Approval Mode",
    "Decisions"
  ];

  const rows = requests.map((r) => {
    const decisions = r.approvals
      .filter((a) => a.status === "APPROVED" || a.status === "REJECTED")
      .map((a) => `${a.recipient.name}: ${a.status}${a.comment ? ` (${a.comment})` : ""}`)
      .join(" | ");

    return [
      r.refCode,
      formatDateTime(r.createdAt),
      r.submitterEmail,
      formatDate(r.changeDate),
      r.description,
      r.reason || "",
      r.status,
      r.approvalMode,
      decisions
    ];
  });

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  res.setHeader("content-type", "text/csv; charset=utf-8");
  res.setHeader("content-disposition", `attachment; filename="change-requests-${Date.now()}.csv"`);
  res.send(csv);
});

module.exports = router;
