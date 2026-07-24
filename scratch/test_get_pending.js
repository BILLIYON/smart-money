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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testGetPending() {
  console.log("Testing getPendingBuddies query...");
  const { data, error } = await supabase
    .from("buddies")
    .select("id, name, tag, avatar_bg, avatar_content, banner_color, created_at, creator_id")
    .eq("status", "pending");

  if (error) {
    console.error("Query error:", error);
  } else {
    console.log("Query success:", data);
  }
}

testGetPending();
