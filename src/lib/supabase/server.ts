import { createServiceSupabaseClient } from "@/lib/supabase-server";

export async function createClient() {
  return createServiceSupabaseClient();
}
