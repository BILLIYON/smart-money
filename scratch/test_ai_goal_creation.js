const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envText = fs.readFileSync(envPath, "utf8");
  envText.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

function parseIsoDate(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  const monthYearMatch = str.match(/^([a-zA-Z]+)\s+(\d{2,4})$/);
  if (monthYearMatch) {
    const monthName = monthYearMatch[1];
    let year = monthYearMatch[2];
    if (year.length === 2) year = `20${year}`;
    const d = new Date(`${monthName} 1, ${year}`);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }
  return null;
}

function parseAmountToKobo(rawAmt) {
  if (typeof rawAmt === "number") {
    return Math.round(Math.abs(rawAmt) * 100);
  }
  if (!rawAmt) return 0;
  const str = String(rawAmt).toLowerCase().trim();
  let multiplier = 1;
  if (str.endsWith("k")) multiplier = 1000;
  else if (str.endsWith("m")) multiplier = 1000000;

  const numericPart = parseFloat(str.replace(/[^0-9.]/g, "")) || 0;
  return Math.round(Math.abs(numericPart * multiplier) * 100);
}

async function testGoalCreation() {
  const userId = "315d21b8-dfd2-4651-a82e-41b1b41931c3"; // user ID

  console.log("Simulating AI Goal Creation from 'Dec 2026' string...");
  const dateStr = "Dec 2026";
  const validDate = parseIsoDate(dateStr);
  console.log(`Converted '${dateStr}' to ISO date: '${validDate}'`);

  const rawAmt = "₦500,000";
  const koboAmt = parseAmountToKobo(rawAmt);
  console.log(`Converted '${rawAmt}' to kobo: ${koboAmt} (₦${koboAmt / 100})`);

  const { data, error } = await supabase.from("goals").insert({
    user_id: userId,
    buddy_id: "contrarian",
    title: "Emergency Fund Goal",
    target_amount: koboAmt,
    current_amount: 0,
    target_date: validDate,
    status: "active",
  }).select();

  if (error) {
    console.error("Goal Insert Error:", error);
  } else {
    console.log("SUCCESS! Created Goal in Database:", data);
  }
}

testGoalCreation().then(() => process.exit(0));
