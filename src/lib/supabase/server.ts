import { cache } from "react";
import { getCurrentUser } from "@/lib/auth";
import { PostgrestClient } from "@supabase/postgrest-js";

/**
 * Native PostgreSQL Server Authentication & Query Client.
 * Uses PostgrestClient to interact with local PostgREST database engine.
 */
export const createClient = cache(async () => {
  const user = await getCurrentUser();
  const url = process.env.LOCAL_DB_URL || "http://127.0.0.1:3001";
  const postgrest = new PostgrestClient(url);

  return Object.assign(postgrest, {
    auth: {
      getUser: async () => ({
        data: { user },
        error: user ? null : new Error("Unauthorized"),
      }),
      getSession: async () => ({
        data: { session: user ? { user } : null },
        error: user ? null : new Error("Unauthorized"),
      }),
    },
  });
});

