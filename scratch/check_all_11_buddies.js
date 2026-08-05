const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envText = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAndSeed() {
  const { data, error } = await supabase.from("buddies").select("id, name, status, ai_model, price_monthly");
  if (error) {
    console.error("Error querying buddies:", error);
    return;
  }
  
  console.log(`Total buddies in DB: ${data.length}`);
  data.forEach(b => {
    console.log(`  - [${b.id}] ${b.name} (${b.ai_model}, status: ${b.status}, ₦${b.price_monthly / 100}/mo)`);
  });

  const expectedIds = ['contrarian', 'closer', 'academic', 'lagos', 'architect', 'buffett', 'cardone', 'kiyosaki', 'trump', 'ramsey', 'lynch'];
  const missing = expectedIds.filter(id => !data.some(b => b.id === id));
  
  if (missing.length > 0) {
    console.log("Missing buddies:", missing);
    console.log("Running seed script to add missing buddies...");
    require('./run_seed.js');
  } else {
    console.log("\n✅ All 11 default buddies are present and verified in the database!");
  }
}

checkAndSeed().catch(console.error);
