import { createClient } from "@supabase/supabase-js";
import { getDatabankContextForUser } from "../src/lib/databank-context";

const url = "https://gmbwrhdoyoinkmtrtbnr.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYndyaGRveW9pbmttdHJ0Ym5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY4OTUzMSwiZXhwIjoyMDkxMjY1NTMxfQ.8uFfLI-KNwj3vLSpvwEhTcwjmD9-KUG5wYFz9FELt7c";

const supabase = createClient(url, serviceKey);

async function main() {
  const userId = '1d8e4391-5fee-4e0b-b104-d41ed9888e9f';
  console.log("Fetching context using getDatabankContextForUser...");
  const ctx = await getDatabankContextForUser(supabase, userId);
  console.log("Returned context object:", JSON.stringify(ctx, null, 2));
}

main().catch(console.error);
