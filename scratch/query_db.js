const { createClient } = require("@supabase/supabase-js");

const url = "https://gmbwrhdoyoinkmtrtbnr.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYndyaGRveW9pbmttdHJ0Ym5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY4OTUzMSwiZXhwIjoyMDkxMjY1NTMxfQ.8uFfLI-KNwj3vLSpvwEhTcwjmD9-KUG5wYFz9FELt7c";

const supabase = createClient(url, serviceKey);

async function main() {
  console.log("Fetching databank_entries...");
  const { data: entries, error: eErr } = await supabase.from("databank_entries").select("*");
  if (eErr) {
    console.error(eErr);
    return;
  }
  console.log("Total entries in database:", entries.length);
  
  const smallEntries = entries.filter(e => Math.abs(e.amount) < 10000);
  console.log("Small entries (< 10000):", smallEntries);

  const amounts = entries.map(e => e.amount);
  console.log("Min amount:", Math.min(...amounts));
  console.log("Max amount:", Math.max(...amounts));
}

main().catch(console.error);
