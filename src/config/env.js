require("dotenv").config();

const REQUIRED = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "BREVO_API_KEY",
  "EMAIL_FROM_ADDRESS"
];

function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key] || process.env[key].trim() === "");
  if (missing.length > 0) {
    console.error(
      `\nMissing required environment variable(s): ${missing.join(", ")}\n` +
        "Copy .env.example to .env and fill these in before starting the server.\n"
    );
    process.exit(1);
  }
  if (process.env.AUTH_SECRET.length < 16) {
    console.error("\nAUTH_SECRET must be at least 16 characters. Generate one with: openssl rand -hex 32\n");
    process.exit(1);
  }
}

module.exports = {
  validateEnv,
  isProduction: process.env.NODE_ENV === "production",
  port: parseInt(process.env.PORT || "3000", 10),
  authSecret: process.env.AUTH_SECRET,
  brevoApiKey: process.env.BREVO_API_KEY,
  emailFromAddress: process.env.EMAIL_FROM_ADDRESS,
  emailFromName: process.env.EMAIL_FROM_NAME || "CLIMS Change Requests",
  appOrigin: process.env.APP_ORIGIN || null // e.g. https://requests.yourcompany.com — used to build review links
};
