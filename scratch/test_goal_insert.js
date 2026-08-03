const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envText = fs.readFileSync(envPath, "utf8");
  envText.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function testGoalInsert() {
  const userId = "315d21b8-dfd2-4651-a82e-41b1b41931c3"; // adeolujohn495@gmail.com

  console.log("Testing insert with 'Dec 2026' as date...");
  const { data: res1, error: err1 } = await supabase.from("goals").insert({
    user_id: userId,
    buddy_id: "contrarian",
    title: "Test Dec 2026 Goal",
    target_amount: 50000000,
    current_amount: 0,
    target_date: "Dec 2026",
    status: "active",
  });
  console.log("Result 1 (Dec 2026):", { res1, err1 });

  console.log("Testing insert with valid date '2026-12-01'...");
  const { data: res2, error: err2 } = await supabase.from("goals").insert({
    user_id: userId,
    buddy_id: "contrarian",
    title: "Test Valid Date Goal",
    target_amount: 50000000,
    current_amount: 0,
    target_date: "2026-12-01",
    status: "active",
  }).select();
  console.log("Result 2 (2026-12-01):", { res2, err2 });
}

testGoalInsert().then(() => process.exit(0));
