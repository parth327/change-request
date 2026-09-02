const path = require("path");
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const { isProduction } = require("./config/env");
const { icon } = require("./lib/icons");
const publicPages = require("./routes/publicPages");
const publicApi = require("./routes/publicApi");
const adminPages = require("./routes/adminPages");
const adminApi = require("./routes/adminApi");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();

// Needed so req.protocol / req.get('host') are correct behind Render's
// (or any) reverse proxy — otherwise generated review links can end up
// with the wrong scheme.
app.set("trust proxy", 1);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));

app.use(
  helmet({
    contentSecurityPolicy: false // the app has no third-party scripts; enable/tune this if you add any
  })
);
app.use(morgan(isProduction ? "combined" : "dev"));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "..", "public")));

app.use((req, res, next) => {
  res.locals.icon = icon;
  next();
});

app.use("/api", publicApi);
app.use("/api/admin", adminApi);
app.use("/admin", adminPages);
app.use("/", publicPages);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
