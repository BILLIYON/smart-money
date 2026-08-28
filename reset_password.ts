import { Pool } from "pg";
import { hashPassword } from "./src/lib/auth";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
});

async function run() {
  const email = 'methodstechnology1@gmail.com';
  const hash = await hashPassword('Password123!');
  const { rowCount } = await pool.query("UPDATE users SET password_hash = $1 WHERE email = $2;", [hash, email]);
  console.log('Password updated successfully for', email, rowCount);
  await pool.end();
}

run();
