import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client — safe to call in client components.
 * Uses @supabase/ssr so cookies are synced with the server session.
 * Call this per-render (returns a stable singleton internally).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
