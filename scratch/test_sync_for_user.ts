import { createClient } from "@supabase/supabase-js";
import { syncGmailForUser } from "../src/lib/gmail";
import * as fs from "fs";
import * as path from "path";

// Load .env.local
try {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        // Remove trailing \r
        val = val.replace(/\r$/, "").trim();
        // Remove quotes if present
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[key] = val;
      }
    }
  }
} catch (e) {
  console.error("Failed to load .env.local:", e);
}

const url = "https://gmbwrhdoyoinkmtrtbnr.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYndyaGRveW9pbmttdHJ0Ym5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY4OTUzMSwiZXhwIjoyMDkxMjY1NTMxfQ.8uFfLI-KNwj3vLSpvwEhTcwjmD9-KUG5wYFz9FELt7c";
const supabase = createClient(url, serviceKey);

async function main() {
  const email = "johnadeolu2@gmail.com";
  
  // Find user ID
  const { data: users, error: userErr } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (userErr || !users) {
    console.error("User not found:", userErr);
    return;
  }
  const userId = users.id;
  console.log(`User ID for ${email} is ${userId}`);

  // Fetch their integration
  const { data: integration, error: intErr } = await supabase
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "gmail")
    .single();

  if (intErr || !integration) {
    console.error("Gmail integration not found for user:", intErr);
    return;
  }
  console.log("Integration data:", {
    provider: integration.provider,
    last_synced_at: integration.last_synced_at,
    metadata: integration.metadata,
  });

  console.log("Starting Gmail sync...");
  try {
    const result = await syncGmailForUser(userId, true, (progress, count) => {
      console.log(`Progress: ${progress}%, Synced entries count: ${count}`);
    });
    console.log("Sync completed successfully:", result);
  } catch (err: any) {
    console.error("Sync failed with error:", err.message, err.stack);
  }
}

main().catch(console.error);
