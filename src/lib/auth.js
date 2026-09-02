const jwt = require("jsonwebtoken");
const { authSecret, isProduction } = require("../config/env");

const SESSION_COOKIE_NAME = "clims_admin_session";
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours

function signAdminSession(payload) {
  return jwt.sign(payload, authSecret, { expiresIn: "8h" });
}

function verifyAdminSession(token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, authSecret);
    return { adminId: payload.adminId, email: payload.email, name: payload.name ?? null };
  } catch {
    return null;
  }
}

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict", // admin cookie never needs to be sent cross-site
  path: "/",
  maxAge: SESSION_MAX_AGE_MS
};

module.exports = {
  SESSION_COOKIE_NAME,
  signAdminSession,
  verifyAdminSession,
  cookieOptions
};
