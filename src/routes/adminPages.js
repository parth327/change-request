const express = require("express");
const { prisma } = require("../lib/db");
const { requireAdminPage } = require("../middleware/requireAdmin");
const { formatDate, formatDateTime, daysSince } = require("../lib/utils");

const router = express.Router();

router.get("/login", (req, res) => {
  res.render("admin-login", { from: req.query.from || "/admin" });
});

router.use(requireAdminPage);

const PAGE_SIZE = 20;

router.get("/", async (req, res) => {
  const [requests, total, pending, approved, rejected] = await Promise.all([
    prisma.changeRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: { approvals: { include: { recipient: true } } },
      take: PAGE_SIZE
    }),
    prisma.changeRequest.count(),
    prisma.changeRequest.count({ where: { status: "PENDING" } }),
    prisma.changeRequest.count({ where: { status: "APPROVED" } }),
    prisma.changeRequest.count({ where: { status: "REJECTED" } })
  ]);
  const counts = { total, pending, approved, rejected };
  res.render("admin-dashboard", {
    requests,
    counts,
    page: 1,
    pageSize: PAGE_SIZE,
    formatDate,
    formatDateTime,
    daysSince,
    admin: req.admin
  });
});

router.get("/requests/:id", async (req, res) => {
  const request = await prisma.changeRequest.findUnique({
    where: { id: req.params.id },
    include: { approvals: { include: { recipient: true }, orderBy: { level: "asc" } } }
  });
  if (!request) return res.status(404).render("404", { path: req.path });
  res.render("admin-request-detail", { request, formatDate, formatDateTime, admin: req.admin });
});

router.get("/recipients", async (req, res) => {
  const recipients = await prisma.recipient.findMany({
    orderBy: [{ active: "desc" }, { level: "asc" }, { name: "asc" }]
  });
  res.render("admin-recipients", { recipients, admin: req.admin });
});

router.get("/settings", async (req, res) => {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, approvalMode: "SINGLE" }
  });
  res.render("admin-settings", { settings, admin: req.admin });
});

module.exports = router;
