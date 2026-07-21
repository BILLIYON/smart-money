// Run: node scratch/check-schema.js
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://gmbwrhdoyoinkmtrtbnr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYndyaGRveW9pbmttdHJ0Ym5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY4OTUzMSwiZXhwIjoyMDkxMjY1NTMxfQ.8uFfLI-KNwj3vLSpvwEhTcwjmD9-KUG5wYFz9FELt7c"
);

async function run() {
  const { data, error } = await supabase.rpc('get_schema_info', {});
  // Or just query the information_schema directly
  const { data: cols, error: colsErr } = await supabase
    .from('databank_entries')
    .select('amount')
    .limit(1);
    
  console.log("Type of amount:", typeof cols[0].amount);
}

run();
