const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("Service Key Available:", !!serviceKey);

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

async function testInsert() {
  // Get first user in database
  const { data: users, error: userErr } = await supabase.from("users").select("id, email").limit(1);
  console.log("Users in DB:", users, userErr);

  if (!users || users.length === 0) {
    console.log("No users in DB");
    return;
  }

  const userId = users[0].id;
  console.log("Testing goal insert for user:", userId);

  const { data: inserted, error: insertErr } = await supabase.from("goals").insert({
    user_id: userId,
    buddy_id: "contrarian",
    title: "Test Manual Goal Creation",
    target_amount: 5000000,
    current_amount: 1000000,
    status: "active"
  }).select();

  console.log("Insert result:", { inserted, insertErr });
}

testInsert();
