const { verifyAdminSession, SESSION_COOKIE_NAME } = require("../lib/auth");

function getSession(req) {
  return verifyAdminSession(req.cookies[SESSION_COOKIE_NAME]);
}

function requireAdminPage(req, res, next) {
  const session = getSession(req);
  if (!session) {
    return res.redirect(`/admin/login?from=${encodeURIComponent(req.originalUrl)}`);
  }
  req.admin = session;
  next();
}

function requireAdminApi(req, res, next) {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.admin = session;
  next();
}

module.exports = { requireAdminPage, requireAdminApi };
