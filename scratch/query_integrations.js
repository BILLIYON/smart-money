const { createClient } = require("@supabase/supabase-js");

const url = "https://gmbwrhdoyoinkmtrtbnr.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYndyaGRveW9pbmttdHJ0Ym5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY4OTUzMSwiZXhwIjoyMDkxMjY1NTMxfQ.8uFfLI-KNwj3vLSpvwEhTcwjmD9-KUG5wYFz9FELt7c";

const supabase = createClient(url, serviceKey);

async function main() {
  console.log("Fetching integrations...");
  const { data, error } = await supabase
    .from("user_integrations")
    .select("*")
    .limit(1);
 
  if (error) {
    console.error(error);
    return;
  }
  console.log("Integration sample:", data[0]);
}

main().catch(console.error);
