import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
});

async function run() {
  const { rows } = await pool.query("SELECT email FROM users;");
  console.log('Auth users:', rows.map(u => u.email));
  await pool.end();
}

run();
