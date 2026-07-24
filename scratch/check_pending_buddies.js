const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envText = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBuddies() {
  console.log("Checking buddies table...");
  const { data: allBuddies, error: err1 } = await supabase.from('buddies').select('*');
  if (err1) {
    console.error("Error fetching all buddies:", err1);
  } else {
    console.log(`Total rows in buddies table: ${allBuddies ? allBuddies.length : 0}`);
    if (allBuddies && allBuddies.length > 0) {
      console.log("Statuses in buddies table:", allBuddies.map(b => ({ id: b.id, name: b.name, status: b.status, creator_id: b.creator_id })));
    }
  }

  console.log("\nTesting getPendingBuddies query...");
  const { data: pendingData, error: err2 } = await supabase
    .from("buddies")
    .select("id, name, tag, avatar_bg, avatar_content, banner_color, created_at, creator:users!creator_id(email)")
    .eq("status", "pending");
  if (err2) {
    console.error("Error in getPendingBuddies query:", err2);
  } else {
    console.log("Pending data:", pendingData);
  }
}

checkBuddies();
