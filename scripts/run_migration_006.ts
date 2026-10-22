import { Pool } from "pg";
import fs from "fs";
import path from "path";

const envContent = fs.readFileSync(path.resolve(process.cwd(), "apps/web/.env.local"), "utf8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq > 0) {
    const k = trimmed.slice(0, eq).trim();
    let v = trimmed.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

async function run() {
  const connectionString = process.env.DATABASE_URL!;
  console.log("Connecting to:", connectionString.split("@")[1]);
  const isRemote = connectionString.includes("supabase.com") || connectionString.includes("pooler");
  const pool = new Pool({
    connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
  });

  const sql = fs.readFileSync(path.resolve(process.cwd(), "scripts/migrations/006_partner_feature_controls_and_analytics.sql"), "utf8");
  console.log("Running migration 006...");
  await pool.query(sql);
  console.log("Migration 006 executed successfully!");

  const { rows: features } = await pool.query("SELECT * FROM public.partner_feature_toggles;");
  console.log("Partner features seeded:", features.length);

  const { rows: rules } = await pool.query("SELECT * FROM public.partner_analytics_rules;");
  console.log("Analytics rules seeded:", rules.length);

  await pool.end();
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
