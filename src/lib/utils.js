const { customAlphabet } = require("nanoid");
const { z } = require("zod");

const numeric = customAlphabet("0123456789", 6);
const urlSafe = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  32
);

function generateRefCode() {
  return `CR-${numeric()}`;
}

function generateToken() {
  return urlSafe();
}

// Escapes user-supplied text before it's interpolated into raw HTML strings
// (used in email templates, which are hand-built strings, not EJS-rendered —
// EJS's `<%= %>` already escapes automatically in the views).
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Mirrors the source Google Form: Email (required), Date (required),
// Description of proposed change (required), Reason for change (optional).
const changeRequestSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
  changeDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date."),
  description: z.string().trim().min(1, "Description of proposed change is required.").max(4000),
  reason: z.string().trim().max(4000).optional().or(z.literal(""))
});

const decisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().trim().max(4000).optional().or(z.literal(""))
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

const recipientCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  level: z.coerce.number().int().min(1).max(50).default(1)
});

const recipientUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().email().optional(),
  level: z.coerce.number().int().min(1).max(50).optional(),
  active: z.coerce.boolean().optional()
});

const settingsUpdateSchema = z.object({ approvalMode: z.enum(["SINGLE", "HIERARCHICAL"]) });

const trackLookupSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  refCode: z.string().trim().min(1, "Enter your reference code.").max(50)
});

// changeDate is a pure calendar date (from a <input type="date">, stored as
// UTC midnight for a "YYYY-MM-DD" string per the ECMAScript date-parsing
// spec). Formatting must pin timeZone: "UTC" — otherwise a server running
// behind UTC (most non-Indian/Asian hosting regions, e.g. Render's US
// datacenters) would roll UTC midnight back to the previous local day.
function formatDate(d) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC"
  }).format(new Date(d));
}

function formatDateTime(d) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(d));
}

function daysSince(d) {
  const ms = Date.now() - new Date(d).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// Builds the site's own origin for links in emails. Prefers an explicit
// APP_ORIGIN (recommended behind a proxy/custom domain); falls back to
// what Express sees on the request (requires `trust proxy` to be set
// correctly when deployed behind a load balancer).
function getOrigin(req) {
  return process.env.APP_ORIGIN || `${req.protocol}://${req.get("host")}`;
}

module.exports = {
  generateRefCode,
  generateToken,
  escapeHtml,
  changeRequestSchema,
  decisionSchema,
  loginSchema,
  recipientCreateSchema,
  recipientUpdateSchema,
  settingsUpdateSchema,
  trackLookupSchema,
  formatDate,
  formatDateTime,
  daysSince,
  getOrigin
};
