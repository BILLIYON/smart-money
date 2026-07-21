// Run: node scratch/check-entries.js
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://gmbwrhdoyoinkmtrtbnr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYndyaGRveW9pbmttdHJ0Ym5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY4OTUzMSwiZXhwIjoyMDkxMjY1NTMxfQ.8uFfLI-KNwj3vLSpvwEhTcwjmD9-KUG5wYFz9FELt7c"
);

async function run() {
  const { data, error } = await supabase
    .from("databank_entries")
    .select("*")
    .order("amount", { ascending: false })
    .limit(10);
    
  if (error) {
    console.error(error);
    return;
  }
  
  console.log(JSON.stringify(data, null, 2));
}

run();
