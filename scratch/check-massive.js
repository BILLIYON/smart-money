// Run: node scratch/check-massive.js
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://gmbwrhdoyoinkmtrtbnr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYndyaGRveW9pbmttdHJ0Ym5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY4OTUzMSwiZXhwIjoyMDkxMjY1NTMxfQ.8uFfLI-KNwj3vLSpvwEhTcwjmD9-KUG5wYFz9FELt7c"
);

async function run() {
  const { data, error } = await supabase
    .from("databank_entries")
    .select("entry_type, amount, description");
    
  if (error) {
    console.error(error);
    return;
  }
  
  let income = 0;
  let expense = 0;
  
  data.forEach(e => {
    if (e.entry_type === "income") income += e.amount;
    if (e.entry_type === "expense") expense += Math.abs(e.amount);
  });
  
  console.log("Total entries:", data.length);
  console.log("Total income (kobo):", income);
  console.log("Total expense (kobo):", expense);
  
  const sorted = data.sort((a,b) => Math.abs(b.amount) - Math.abs(a.amount));
  console.log("Top 3 amounts:");
  console.log(sorted.slice(0, 3));
}

run();
