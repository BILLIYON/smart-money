import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
});

async function run() {
  const { rowCount } = await pool.query("UPDATE users SET is_admin = true;");
  console.log("Updated users:", rowCount);
  await pool.end();
}

run();
