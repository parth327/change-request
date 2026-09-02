const { isProduction } = require("../config/env");

function notFoundHandler(req, res) {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found." });
  }
  res.status(404).render("404", { path: req.path });
}

// Must be registered last, with 4 args, for Express to treat it as an error handler.
function errorHandler(err, req, res, _next) {
  console.error(err);

  const status = err.status || 500;
  const message = isProduction || status === 500 ? "Something went wrong. Please try again." : err.message;

  if (req.path.startsWith("/api/")) {
    return res.status(status).json({ error: message });
  }
  res.status(status).render("error", { message });
}

module.exports = { notFoundHandler, errorHandler };
