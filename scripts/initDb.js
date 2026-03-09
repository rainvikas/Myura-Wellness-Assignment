require("dotenv").config();

const fs = require("fs");
const path = require("path");

const database = require("../src/config/database");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required before running the database initializer.");
  }

  const schemaPath = path.join(__dirname, "..", "src", "db", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");

  await database.query(schema);
  console.log("Database schema initialized successfully.");
}

main()
  .catch((error) => {
    console.error("Failed to initialize the database schema.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await database.closePool();
  });
