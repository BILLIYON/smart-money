const { createClient } = require("@supabase/supabase-js");

const url = "https://gmbwrhdoyoinkmtrtbnr.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYndyaGRveW9pbmttdHJ0Ym5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2ODk1MzEsImV4cCI6MjA5MTI2NTUzMX0.y8R8qRWQPNcVDuJy6W7bLuOJD0EfSbK6Lyc1TZToyas";

async function main() {
  const supabase = createClient(url, anonKey);
  
  console.log("Signing in...");
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: "adeolujohn495@gmail.com",
    password: "TestPassword123!"
  });

  if (authErr) {
    console.error("Auth error:", authErr);
    return;
  }

  console.log("Signed in successfully. Attempting to insert into user_integrations...");

  const { data, error } = await supabase.from("user_integrations").upsert({
    user_id: auth.user.id,
    provider: "gmail",
    access_token: "test_access_token",
    refresh_token: "test_refresh_token",
    token_expiry: new Date(Date.now() + 3600000).toISOString(),
    connected_at: new Date().toISOString(),
    scopes: ["gmail.readonly"]
  }, { onConflict: "user_id,provider" }).select("*");

  if (error) {
    console.error("Insert error:", error);
  } else {
    console.log("Insert success:", data);
  }
}

main().catch(console.error);
