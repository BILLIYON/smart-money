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
    env[match[1]] = value;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectColumns() {
  const { data, error } = await supabase.from("buddies").select("*").limit(1);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("ACTUAL COLUMNS IN 'buddies' TABLE:");
    console.log(Object.keys(data[0]));
    console.log("\nSAMPLE ROW:");
    console.log(data[0]);
  }
}

inspectColumns();
