const { Client } = require("pg");

async function main() {
  const client = new Client({
    user: "postgres.gmbwrhdoyoinkmtrtbnr",
    password: "D$C#3RbT_%XG7a?",
    host: "aws-0-eu-west-1.pooler.supabase.com",
    port: 6543,
    database: "postgres",
    ssl: { rejectUnauthorized: false }
  });

  console.log("Connecting to Supabase Postgres database...");
  await client.connect();
  console.log("Connected successfully!");

  console.log("Adding column avatar_is_serif to buddies table if not exists...");
  await client.query(`
    ALTER TABLE buddies 
    ADD COLUMN IF NOT EXISTS avatar_is_serif boolean DEFAULT false;
  `);
  console.log("Column avatar_is_serif verified/added!");

  console.log("Creating table hidden_buddies if not exists...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS hidden_buddies (
      buddy_id text PRIMARY KEY,
      created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
    );
  `);
  console.log("Table hidden_buddies verified/created!");

  await client.end();
  console.log("Migration complete!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
