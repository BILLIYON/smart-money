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

  console.log("Selecting databank entries matching John/Abioye...");
  const res = await client.query(`
    SELECT id, source, entry_type, amount, description, category, entry_date, created_at 
    FROM public.databank_entries
    WHERE description ILIKE '%John%' OR description ILIKE '%Abioye%';
  `);

  console.log("Entries count:", res.rows.length);
  console.log(JSON.stringify(res.rows, null, 2));

  await client.end();
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
