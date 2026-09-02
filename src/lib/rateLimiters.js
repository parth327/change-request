const rateLimit = require("express-rate-limit");

function jsonLimitHandler(req, res) {
  res.status(429).json({ error: "Too many requests. Please try again later." });
}

const submitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonLimitHandler
});

const decideLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonLimitHandler
});

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonLimitHandler
});

// Guards against brute-forcing (email, refCode) pairs to fish for a valid
// request — same budget as admin login, since it's the same shape of risk.
const trackLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonLimitHandler
});

module.exports = { submitLimiter, decideLimiter, loginLimiter, trackLimiter };
