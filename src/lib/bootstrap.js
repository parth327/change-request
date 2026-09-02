const { execFileSync } = require("child_process");
const path = require("path");
const bcrypt = require("bcryptjs");
const { prisma } = require("./db");
const { withRetry } = require("./withRetry");

// Prisma throws P2021 ("table does not exist") when the schema hasn't been
// pushed to the database yet — e.g. a brand new Neon project, or a fresh
// clone that skipped `prisma db push`. Wrapped in withRetry because a
// free-tier Neon compute that's been idle needs a few seconds to wake up,
// and the very first connection attempt after a cold start can drop.
async function tablesExist() {
  try {
    await withRetry(() => prisma.$queryRaw`SELECT 1 FROM "Settings" LIMIT 1`, { retries: 5, delayMs: 1500 });
    return true;
  } catch (err) {
    if (err.code === "P2021" || /does not exist/i.test(String(err.message))) return false;
    throw err;
  }
}

// Applies the schema in prisma/schema.prisma to the database, creating any
// missing tables/columns. Safe to run repeatedly — it's a no-op once the
// database already matches the schema.
function pushSchema() {
  console.log("Database schema is missing or out of date — creating it from prisma/schema.prisma...");
  execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["prisma", "db", "push", "--accept-data-loss", "--skip-generate"], {
    cwd: path.join(__dirname, "..", ".."),
    stdio: "inherit"
  });
}

// The admin account and the single Settings row are configuration, not
// user data — keeping them in sync with .env on every boot means a changed
// ADMIN_PASSWORD takes effect without a separate manual seed step.
async function ensureAdminAndSettings() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await prisma.admin.upsert({
      where: { email: ADMIN_EMAIL },
      update: { passwordHash, name: ADMIN_NAME || "Admin" },
      create: { email: ADMIN_EMAIL, passwordHash, name: ADMIN_NAME || "Admin" }
    });
  }
  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, approvalMode: "SINGLE" } });
}

// A request can't be submitted with zero active recipients (see
// workflow.initializeApprovals). That's correct behavior once the app is
// configured, but on a brand new local setup it makes the form look broken.
// Seed one recipient from the admin account so the happy path works
// out of the box; real routing can be added/edited at /admin/recipients.
async function ensureDefaultRecipient() {
  const count = await prisma.recipient.count();
  if (count > 0) return;
  const { ADMIN_EMAIL, ADMIN_NAME } = process.env;
  if (!ADMIN_EMAIL) return;
  await prisma.recipient.create({
    data: { name: ADMIN_NAME || "Admin", email: ADMIN_EMAIL, level: 1, active: true }
  });
  console.log(`No recipients existed — added a default one (${ADMIN_EMAIL}). Manage recipients at /admin/recipients.`);
}

async function bootstrapDatabase() {
  if (!(await tablesExist())) {
    pushSchema();
  }
  await ensureAdminAndSettings();
  await ensureDefaultRecipient();
}

module.exports = { bootstrapDatabase };
