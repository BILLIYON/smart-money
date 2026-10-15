import { createServiceSupabaseClient } from "@/lib/supabase-server";

export function createServiceClient() {
  return createServiceSupabaseClient();
}
