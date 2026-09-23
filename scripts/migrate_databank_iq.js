const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val.replace(/^["']|["']$/g, "");
        }
      }
    }
  }
}

loadEnv();

const dbUrls = [
  { name: "Remote / Configured DB", url: process.env.DATABASE_URL },
  { name: "Local DB", url: "postgresql://postgres@127.0.0.1:5432/smart_money" },
].filter((d) => Boolean(d.url));

async function runMigration() {
  for (const db of dbUrls) {
    console.log(`\n--- Running Migration on ${db.name} ---`);
    const isRemote = db.url.includes("supabase.com") || db.url.includes("pooler") || db.url.includes("aws-");
    const pool = new Pool({
      connectionString: db.url,
      ssl: isRemote ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
    });

    try {
      // 1. Create merchant_rules table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.merchant_rules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          merchant_name TEXT NOT NULL,
          category TEXT NOT NULL,
          intent TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          last_confirmed TIMESTAMPTZ DEFAULT NOW(),
          CONSTRAINT uq_user_merchant UNIQUE (user_id, merchant_name)
        );
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_merchant_rules_user_id ON public.merchant_rules (user_id);
      `);
      console.log("✓ Created public.merchant_rules table and index");

      // 2. Add intent column to databank_entries
      await pool.query(`
        ALTER TABLE public.databank_entries 
        ADD COLUMN IF NOT EXISTS intent TEXT;
      `);
      console.log("✓ Added 'intent' column to public.databank_entries");

      // 3. Add databank_iq_score & databank_iq_level to users
      await pool.query(`
        ALTER TABLE public.users 
        ADD COLUMN IF NOT EXISTS databank_iq_score INT DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS databank_iq_level TEXT DEFAULT NULL;
      `);
      console.log("✓ Added databank_iq_score & databank_iq_level to public.users");

      console.log(`✓ Migration succeeded on ${db.name}`);
    } catch (err) {
      console.error(`Migration error on ${db.name}:`, err.message);
    } finally {
      await pool.end();
    }
  }
}

runMigration()
  .then(() => {
    console.log("\nMigration completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal migration failure:", err);
    process.exit(1);
  });
