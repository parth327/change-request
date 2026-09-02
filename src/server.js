const { validateEnv, port } = require("./config/env");

validateEnv();

const app = require("./app");
const { bootstrapDatabase } = require("./lib/bootstrap");

bootstrapDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`CLIMS server listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("\nFailed to prepare the database:\n", err);
    process.exit(1);
  });
