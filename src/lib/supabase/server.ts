import { cache } from "react";
import { getCurrentUser } from "@/lib/auth";
import { Pool } from "pg";

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
}

/**
 * Native PostgreSQL Server Authentication & Query Client.
 * Replaces Supabase Auth and JS Client with direct PostgreSQL queries.
 */
export const createClient = cache(async () => {
  const user = await getCurrentUser();

  return {
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
    from: (table: string) => ({
      select: (cols?: string) => ({
        eq: (colName: string, val: any) => ({
          single: async () => {
            if (table === "users" && colName === "id" && user && user.id === val) {
              return { data: user, error: null };
            }
            const pool = getPool();
            try {
              const { rows } = await pool.query(
                `SELECT ${cols || "*"} FROM public.${table} WHERE "${colName}" = $1 LIMIT 1;`,
                [val]
              );
              return { data: rows[0] || null, error: null };
            } catch (err: any) {
              return { data: null, error: err };
            } finally {
              await pool.end();
            }
          },
        }),
      }),
      update: (updates: Record<string, any>) => ({
        eq: (colName: string, val: any) => async () => {
          const pool = getPool();
          try {
            const keys = Object.keys(updates);
            const setClause = keys.map((k, i) => `"${k}" = $${i + 2}`).join(", ");
            const values = keys.map((k) => updates[k]);
            await pool.query(
              `UPDATE public.${table} SET ${setClause} WHERE "${colName}" = $1;`,
              [val, ...values]
            );
            return { error: null };
          } catch (err: any) {
            return { error: err };
          } finally {
            await pool.end();
          }
        },
      }),
    }),
  };
});
