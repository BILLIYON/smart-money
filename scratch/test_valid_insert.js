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

async function testValidSubmit() {
  console.log("Testing valid insert with custom ID...");
  const slug = "test-buddy-" + Date.now();

  const validBuddy = {
    id: slug,
    name: "Valid Test Buddy",
    tag: "Test Tag",
    description: "Test Desc",
    avatar_content: "🤖",
    avatar_bg: "#123456",
    avatar_is_serif: false,
    banner_color: "linear-gradient(135deg,#0B1E3D,#1A3A6E)",
    category: ["Investing"],
    is_fan_sim: false,
    fan_disclaimer: "Test Disclaimer",
    philosophy: "Test Philosophy",
    ai_model: "claude",
    price_monthly: 0,
    status: "pending",
  };

  const { data, error } = await supabase
    .from("buddies")
    .insert(validBuddy)
    .select("id, name, status");

  if (error) {
    console.error("FAILED INSERT:", error);
  } else {
    console.log("SUCCESSFUL INSERT INTO BUDDIES:", data);
    const { data: pending, error: pendingErr } = await supabase
      .from("buddies")
      .select("id, name, tag, avatar_bg, avatar_content, banner_color, created_at, status")
      .eq("status", "pending");
    console.log("Pending buddies query result:", pending, pendingErr);

    // Clean up
    await supabase.from("buddies").delete().eq("id", data[0].id);
    console.log("Cleaned up test buddy.");
  }
}

testValidSubmit();
