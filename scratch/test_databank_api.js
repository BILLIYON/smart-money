const { createClient } = require("@supabase/supabase-js");
const { createServerClient } = require("@supabase/ssr");
const fs = require("fs");
const path = require("path");

const supabaseUrl = "https://gmbwrhdoyoinkmtrtbnr.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYndyaGRveW9pbmttdHJ0Ym5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2ODk1MzEsImV4cCI6MjA5MTI2NTUzMX0.y8R8qRWQPNcVDuJy6W7bLuOJD0EfSbK6Lyc1TZToyas";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFlow() {
  console.log("Attempting sign in...");
  let authRes = await supabase.auth.signInWithPassword({
    email: "adeolujohn495@gmail.com",
    password: "Gvhy7H2F94jdGBP"
  });

  if (authRes.error) {
    console.log("Sign in with Gvhy7H2F94jdGBP failed, trying TestPassword123!...");
    authRes = await supabase.auth.signInWithPassword({
      email: "adeolujohn495@gmail.com",
      password: "TestPassword123!"
    });
  }

  if (authRes.error) {
    console.error("Authentication failed:", authRes.error);
    return;
  }

  const { session } = authRes.data;
  const accessToken = session.access_token;
  console.log("Signed in successfully.");

  // Generate correct chunked cookies using @supabase/ssr
  const cookiesToSet = [];
  const ssrClient = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return []; },
      setAll(cookies) {
        cookiesToSet.push(...cookies);
      }
    }
  });

  await ssrClient.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token
  });

  const cookieHeader = cookiesToSet.map(c => `${c.name}=${c.value}`).join("; ");
  console.log("Cookie header generated successfully.");

  // 1. Wipe existing databank entries for a clean test state
  console.log("Wiping existing DataBank entries...");
  const wipeRes = await fetch("http://localhost:3000/api/databank/wipe", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Cookie": cookieHeader
    }
  });
  console.log("Wipe status:", wipeRes.status, await wipeRes.text());

  // 2. Upload test CSV
  console.log("Uploading test statement...");
  const csvBuffer = fs.readFileSync(path.join(__dirname, "test_statement.csv"));
  const formData = new FormData();
  const blob = new Blob([csvBuffer], { type: "text/csv" });
  formData.append("file", blob, "test_statement.csv");

  const uploadRes = await fetch("http://localhost:3000/api/databank/upload", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Cookie": cookieHeader
    },
    body: formData
  });

  console.log("Upload status:", uploadRes.status);
  const uploadJson = await uploadRes.json();
  console.log("Upload response:", uploadJson);

  // 3. Post manual entry
  console.log("Adding manual entry...");
  const manualRes = await fetch("http://localhost:3000/api/databank/manual", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
      "Cookie": cookieHeader
    },
    body: JSON.stringify({
      entry_type: "expense",
      amount: -500000, // 5000 NGN in kobo
      description: "Pizza Dinner",
      category: "Food & Dining",
      date: new Date().toISOString()
    })
  });

  console.log("Manual entry status:", manualRes.status);
  const manualJson = await manualRes.json();
  console.log("Manual entry response:", manualJson);

  // 4. Fetch context
  console.log("Fetching context...");
  const contextRes = await fetch("http://localhost:3000/api/databank/context", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Cookie": cookieHeader
    }
  });

  console.log("Context status:", contextRes.status);
  const contextJson = await contextRes.json();
  console.log("Context monthlySummary:", contextJson.monthlySummary);
  console.log("Context topCategories:", contextJson.topCategories);
  console.log("Context recentTransactions:", contextJson.recentTransactions);
  console.log("Context netWorth:", contextJson.netWorth);
  console.log("Context savingsBalance:", contextJson.savingsBalance);
}

testFlow();
