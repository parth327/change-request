const express = require("express");
const { prisma } = require("../lib/db");
const { formatDate, formatDateTime } = require("../lib/utils");

const router = express.Router();

router.get("/", (req, res) => {
  res.render("form");
});

// Also serves as the submitter's ongoing status tracker — the link is
// stable and re-fetches live data on every visit, so bookmarking it (or
// looking it back up via /track) always reflects the current decision,
// not just the moment of submission.
router.get("/success/:id", async (req, res) => {
  const request = await prisma.changeRequest.findUnique({
    where: { id: req.params.id },
    include: { approvals: { include: { recipient: true }, orderBy: { level: "asc" } } }
  });
  if (!request) {
    return res.status(404).render("404", { path: req.path });
  }
  res.render("success", { request, formatDate, formatDateTime });
});

router.get("/track", (req, res) => {
  res.render("track");
});

router.get("/review/:token", async (req, res) => {
  const approval = await prisma.requestApproval.findUnique({
    where: { token: req.params.token },
    include: { request: true, recipient: true }
  });
  res.render("review", { approval, token: req.params.token, formatDate });
});

module.exports = router;
