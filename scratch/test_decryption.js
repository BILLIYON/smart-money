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
} catch (e) {}

const { decrypt } = require("../src/lib/crypto.ts");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: integrations } = await supabase
    .from("user_integrations")
    .select("*")
    .eq("provider", "gmail");
  
  for (const integration of integrations || []) {
    console.log("User:", integration.user_id);
    try {
      const access = decrypt(integration.access_token);
      console.log("  Decrypted access token successfully! Length:", access.length);
    } catch (e) {
      console.error("  Failed to decrypt access token:", e.message);
    }
  }
}

run();
