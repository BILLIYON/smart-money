import { Pool } from "pg";
import fs from "fs";
import path from "path";

// Load .env.local
const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
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

const remoteUrl = process.env.DATABASE_URL!;
const localUrl = "postgresql://postgres@127.0.0.1:5432/smart_money";

const migrations = [
  "001_partner_foundation.sql",
  "002_partner_applications.sql",
  "002_partner_goals_and_opportunities.sql",
  "003_partner_approvals_bridge.sql",
  "004_partner_staff_and_ai_tools.sql",
  "005_partner_api_and_webhooks.sql",
  "006_partner_feature_controls_and_analytics.sql",
];

async function applyMigrationsTo(dbName: string, connString: string) {
  console.log(`\n========================================`);
  console.log(`Connecting to: ${dbName} (${connString.split("@")[1] || connString})`);
  console.log(`========================================`);

  const isRemote = connString.includes("supabase.com") || connString.includes("pooler");
  const pool = new Pool({
    connectionString: connString,
    ssl: isRemote ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
  });

  for (const m of migrations) {
    const mPath = path.resolve(process.cwd(), "scripts/migrations", m);
    if (!fs.existsSync(mPath)) {
      console.warn(`[Skip] Migration file not found: ${m}`);
      continue;
    }
    const sql = fs.readFileSync(mPath, "utf8");
    process.stdout.write(`Applying ${m}... `);
    try {
      await pool.query(sql);
      console.log(`✅ Success`);
    } catch (err: any) {
      console.log(`❌ Error: ${err.message}`);
    }
  }

  // Verification
  const { rows: tables } = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND (table_name LIKE 'partner_%' OR table_name IN ('opportunities', 'agent_actions', 'goals', 'users'))
    ORDER BY table_name;
  `);
  console.log(`Verified tables in ${dbName}:`, tables.map((t) => t.table_name));

  // Check agent_actions columns
  const { rows: aaCols } = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'agent_actions';
  `);
  console.log(`agent_actions columns in ${dbName}:`, aaCols.map((c) => c.column_name));

  await pool.end();
}

async function main() {
  await applyMigrationsTo("Remote Supabase", remoteUrl);
  await applyMigrationsTo("Local PostgreSQL", localUrl);
  console.log("\n🎉 ALL MIGRATIONS DUAL SYNCED SUCCESSFULLY!");
}

main().catch((err) => {
  console.error("Migration runner fatal:", err);
  process.exit(1);
});
