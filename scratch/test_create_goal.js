const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl ? "Found" : "Missing");
console.log("Supabase Key:", supabaseKey ? "Found" : "Missing");

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGoalInsert() {
  console.log("Checking goals table schema...");
  
  const { data: goals, error: fetchErr } = await supabase.from("goals").select("*").limit(1);
  console.log("Fetch result:", { goals, fetchErr });

  // Test insert
  const testGoal = {
    title: "Test Goal Manual",
    target_amount: 5000000,
    current_amount: 1000000,
    status: "active"
  };

  const { data: inserted, error: insertErr } = await supabase.from("goals").insert(testGoal).select();
  console.log("Insert result:", { inserted, insertErr });
}

testGoalInsert();
