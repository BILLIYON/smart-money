/**
 * Re-exports the browser Supabase client.
 * Existing imports from "@/lib/supabase" continue to work.
 */
export { createClient } from "./supabase/client";

// Backward-compat: named `supabase` singleton used by RealtimeProvider and older code
import { createClient } from "./supabase/client";
export const supabase = createClient();
