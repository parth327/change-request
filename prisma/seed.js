const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Admin";

  if (!email || !password) {
    throw new Error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD in your environment before running the seed script."
    );
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: { passwordHash, name },
    create: { email, passwordHash, name }
  });

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, approvalMode: "SINGLE" }
  });

  console.log(`Admin ready: ${admin.email}`);
  console.log("Settings row ready (default approval mode: SINGLE).");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
