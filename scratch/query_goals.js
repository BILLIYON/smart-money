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

async function queryGoals() {
  const { data: users } = await supabase.from("users").select("id, email");
  console.log("Users:", users);

  const { data: goals, error } = await supabase.from("goals").select("*");
  if (error) {
    console.error("Error querying goals:", error);
  } else {
    console.log("Goals in DB:", goals);
  }

  const { data: messages } = await supabase.from("messages").select("role, content").order("created_at", { ascending: false }).limit(5);
  console.log("Recent Assistant Messages:", messages);
}

queryGoals().then(() => process.exit(0));
