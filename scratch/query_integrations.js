const { createClient } = require("@supabase/supabase-js");

const url = "https://gmbwrhdoyoinkmtrtbnr.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYndyaGRveW9pbmttdHJ0Ym5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY4OTUzMSwiZXhwIjoyMDkxMjY1NTMxfQ.8uFfLI-KNwj3vLSpvwEhTcwjmD9-KUG5wYFz9FELt7c";

const supabase = createClient(url, serviceKey);

async function main() {
  const userId = '315d21b8-dfd2-4651-a82e-41b1b41931c3'; // adeolujohn495@gmail.com
  console.log("Fetching integrations for user:", userId);
  const { data, error } = await supabase
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error(error);
    return;
  }
  console.log("Integrations:", data);
}

main().catch(console.error);
