const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const client = new Client({
  user: "postgres.gmbwrhdoyoinkmtrtbnr",
  password: "D$C#3RbT_%XG7a?",
  host: "aws-0-eu-west-1.pooler.supabase.com",
  port: 6543,
  database: "postgres",
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log("Reading migration SQL...");
  const sqlPath = path.join(__dirname, "..", "supabase", "migrations", "008_agent_limits.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  console.log("SQL to execute:\n", sql);

  try {
    await client.connect();
    console.log("Connected to PostgreSQL database!");
    await client.query(sql);
    console.log("Migration applied successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();
