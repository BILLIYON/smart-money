const { createClient } = require("@supabase/supabase-js");

const url = "https://gmbwrhdoyoinkmtrtbnr.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYndyaGRveW9pbmttdHJ0Ym5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY4OTUzMSwiZXhwIjoyMDkxMjY1NTMxfQ.8uFfLI-KNwj3vLSpvwEhTcwjmD9-KUG5wYFz9FELt7c";

const supabase = createClient(url, serviceKey);

async function main() {
  console.log("Fetching users...");
  const { data: users, error: uErr } = await supabase.from("users").select("id, email, onboarding_complete");
  if (uErr) {
    console.error(uErr);
    return;
  }
  console.log("Users:", users);

  console.log("Fetching databank_entries...");
  const { data: entries, error: eErr } = await supabase.from("databank_entries").select("*");
  if (eErr) {
    console.error(eErr);
    return;
  }
  console.log("Total entries in database:", entries.length);
  console.log("Sample entries:", entries.slice(0, 10));
}

main().catch(console.error);
