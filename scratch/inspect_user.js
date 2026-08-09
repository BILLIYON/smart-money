const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local variables
try {
  const envContent = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
  envContent.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
      process.env[key] = val;
    }
  });
} catch (e) {
  console.warn("Could not read .env.local file. Proceeding with existing env variables.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: integrations, error } = await supabase
    .from("user_integrations")
    .select("*")
    .eq("provider", "gmail");
  
  if (error) {
    console.error("Error fetching integrations:", error);
    return;
  }
  console.log("Integrations count:", integrations?.length);
  for (const integration of integrations || []) {
    console.log("User:", integration.user_id);
    console.log("Last synced at:", integration.last_synced_at);
    console.log("Metadata:", JSON.stringify(integration.metadata, null, 2));
  }
  
  console.log("ENV GROQ:", !!process.env.GROQ_API_KEY);
  console.log("ENV GEMINI:", !!process.env.GOOGLE_AI_API_KEY);
  console.log("ENV OPENAI:", !!process.env.OPENAI_API_KEY);
}

run();
