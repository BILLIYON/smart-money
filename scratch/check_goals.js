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

  await client.connect();
  console.log("Connected successfully!");

  const res = await client.query("SELECT * FROM public.goals");
  console.log("Goals count:", res.rows.length);
  console.log(JSON.stringify(res.rows, null, 2));

  await client.end();
}

main().catch(console.error);
