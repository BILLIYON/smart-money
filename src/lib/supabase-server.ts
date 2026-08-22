import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient as createServerClient } from "./supabase/server";

export { createClient as createServerSupabaseClient } from "./supabase/server";

type AuthResult =
  | {
      supabase: any;
      userId: string;
      user: any;
      error: null;
    }
  | { supabase: null; userId: null; user: null; error: NextResponse };

/**
 * Validates the native PostgreSQL session and returns { supabase, userId, user } or a 401 response.
 */
export async function requireAuth(): Promise<AuthResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      supabase: null,
      userId: null,
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const client = await createServerClient();
  return { supabase: client, userId: user.id, user, error: null };
}

/** Service-role fallback shim */
export function createServiceSupabaseClient() {
  return {
    from: (table: string) => {
      // Return a basic table proxy
      return {
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
      };
    },
  };
}
