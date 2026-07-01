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

  // Get user from auth.users
  const authRes = await client.query("SELECT id, email FROM auth.users WHERE email = 'methodstechnology1@gmail.com'");
  if (authRes.rows.length === 0) {
    console.error("Auth user not found!");
    await client.end();
    return;
  }
  const authUser = authRes.rows[0];
  console.log("Auth User:", authUser);

  // Get profile from public.users
  const userRes = await client.query("SELECT * FROM public.users WHERE id = $1", [authUser.id]);
  console.log("Public User profile rows count:", userRes.rows.length);
  if (userRes.rows.length > 0) {
    console.log("Profile details:", userRes.rows[0]);
  }

  await client.end();
}

main().catch(console.error);
