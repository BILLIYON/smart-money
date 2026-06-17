const { createClient } = require("@supabase/supabase-js");
const { createServerClient } = require("@supabase/ssr");

const supabaseUrl = "https://gmbwrhdoyoinkmtrtbnr.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYndyaGRveW9pbmttdHJ0Ym5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2ODk1MzEsImV4cCI6MjA5MTI2NTUzMX0.y8R8qRWQPNcVDuJy6W7bLuOJD0EfSbK6Lyc1TZToyas";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Signing in...");
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
    console.error("Sign in failed:", authRes.error);
    return;
  }

  const { session } = authRes.data;
  console.log("Signed in successfully. User ID:", session.user.id);

  // Generate chunked cookies using @supabase/ssr
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

  console.log("Fetching Gmail status API...");
  const statusRes = await fetch("http://localhost:3000/api/databank/gmail/status", {
    headers: {
      "Cookie": cookieHeader
    }
  });
  console.log("Gmail status API HTTP Code:", statusRes.status);
  console.log("Gmail status API body:", await statusRes.json());

  console.log("Fetching sources summary API...");
  const summaryRes = await fetch("http://localhost:3000/api/databank/sources-summary", {
    headers: {
      "Cookie": cookieHeader
    }
  });
  console.log("Sources summary API HTTP Code:", summaryRes.status);
  console.log("Sources summary API body:", await summaryRes.json());
}

run().catch(console.error);
