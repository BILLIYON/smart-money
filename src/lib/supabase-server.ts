/**
 * Re-exports server-side helpers.
 * Existing imports from "@/lib/supabase-server" continue to work.
 */
export { createClient as createServerSupabaseClient } from "./supabase/server";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "./supabase/server";

/** Service-role client — bypasses RLS. Use only in trusted server contexts. */
export function createServiceSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

type AuthResult =
  | {
      supabase: Awaited<ReturnType<typeof createServerClient>>;
      userId: string;
      error: null;
    }
  | { supabase: null; userId: null; error: NextResponse };

/**
 * Validates the session and returns { supabase, userId } or a 401 response.
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase: null,
      userId: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { supabase, userId: user.id, error: null };
}
