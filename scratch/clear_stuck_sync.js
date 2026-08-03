const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Read .env.local manually
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

if (!supabaseUrl || !serviceKey) {
  console.error("Missing env vars", { supabaseUrl: !!supabaseUrl, serviceKey: !!serviceKey });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function clearStuckSync() {
  console.log("Fetching user integrations with active sync flags...");
  const { data, error } = await supabase
    .from("user_integrations")
    .select("user_id, provider, metadata")
    .eq("provider", "gmail");

  if (error) {
    console.error("Error fetching integrations:", error);
    return;
  }

  for (const row of data || []) {
    const meta = row.metadata || {};
    if (meta.is_syncing || meta.sync_progress !== null) {
      console.log(`Clearing stuck sync for user: ${row.user_id}`);
      const updatedMeta = {
        ...meta,
        is_syncing: false,
        sync_progress: null,
        sync_message: "Sync reset",
        sync_updated_at: new Date().toISOString(),
      };
      const { error: updateErr } = await supabase
        .from("user_integrations")
        .update({ metadata: updatedMeta })
        .eq("user_id", row.user_id)
        .eq("provider", "gmail");

      if (updateErr) {
        console.error("Failed to update:", updateErr);
      } else {
        console.log("Successfully cleared stuck sync flags!");
      }
    }
  }
}

clearStuckSync().then(() => process.exit(0));
