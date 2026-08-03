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

async function checkLatestChat() {
  console.log("=== USERS ===");
  const { data: users } = await supabase.from("users").select("id, email");
  console.log(users);

  console.log("\n=== RECENT MESSAGES ===");
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);
  console.log(messages);

  console.log("\n=== GOALS ===");
  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: false });
  console.log(goals);
}

checkLatestChat().then(() => process.exit(0));
