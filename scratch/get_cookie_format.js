const { createServerClient } = require("@supabase/ssr");
const { createClient } = require("@supabase/supabase-js");

const supabaseAnon = createClient(
  "https://gmbwrhdoyoinkmtrtbnr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYndyaGRveW9pbmttdHJ0Ym5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2ODk1MzEsImV4cCI6MjA5MTI2NTUzMX0.y8R8qRWQPNcVDuJy6W7bLuOJD0EfSbK6Lyc1TZToyas"
);

async function getCookies() {
  const { data, error } = await supabaseAnon.auth.signInWithPassword({
    email: "adeolujohn495@gmail.com",
    password: "TestPassword123!"
  });

  if (error) {
    console.error("Sign in failed:", error);
    return;
  }

  const session = data.session;
  console.log("Logged in!");

  const cookiesToSet = [];
  const client = createServerClient(
    "https://gmbwrhdoyoinkmtrtbnr.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYndyaGRveW9pbmttdHJ0Ym5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2ODk1MzEsImV4cCI6MjA5MTI2NTUzMX0.y8R8qRWQPNcVDuJy6W7bLuOJD0EfSbK6Lyc1TZToyas",
    {
      cookies: {
        getAll() { return []; },
        setAll(cookies) {
          cookiesToSet.push(...cookies);
        }
      }
    }
  );

  await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token
  });

  console.log("Cookies set by @supabase/ssr:");
  console.log(JSON.stringify(cookiesToSet, null, 2));
}

getCookies();
