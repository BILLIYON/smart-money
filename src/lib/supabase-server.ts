import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
});

export async function requireAuth(req?: Request) {
  const user = await getCurrentUser(req);
  const supabase = createServiceSupabaseClient();
  if (!user) {
    return {
      supabase,
      userId: null,
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return {
    supabase,
    userId: user.id,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      is_admin: user.is_admin,
      onboarding_complete: user.onboarding_complete,
      plan: user.plan,
    },
    error: null,
  };
}

export function createServiceSupabaseClient() {
  return createNativeClient();
}

export function createServerSupabaseClient() {
  return createNativeClient();
}

function createNativeClient() {
  return {
    auth: {
      async getUser() {
        const user = await getCurrentUser();
        return { data: { user: user ? { id: user.id, email: user.email, user_metadata: { full_name: user.full_name } } : null }, error: null };
      },
      async getSession() {
        const user = await getCurrentUser();
        return { data: { session: user ? { user: { id: user.id, email: user.email } } : null }, error: null };
      },
      async exchangeCodeForSession(_code: string) {
        return { error: null };
      },
      admin: {
        async deleteUser(id: string) {
          await pool.query(`DELETE FROM users WHERE id = $1;`, [id]);
          return { error: null };
        },
      },
    },
    from(table: string) {
      let selectCols = "*";
      let whereConditions: string[] = [];
      let params: any[] = [];
      let orderSql = "";
      let limitSql = "";
      let isSingle = false;

      const chain: any = {
        select(cols: string = "*") {
          selectCols = cols;
          return chain;
        },
        eq(col: string, val: any) {
          params.push(val);
          whereConditions.push(`${col} = $${params.length}`);
          return chain;
        },
        neq(col: string, val: any) {
          params.push(val);
          whereConditions.push(`${col} != $${params.length}`);
          return chain;
        },
        in(col: string, vals: any[]) {
          params.push(vals);
          whereConditions.push(`${col} = ANY($${params.length})`);
          return chain;
        },
        gte(col: string, val: any) {
          params.push(val);
          whereConditions.push(`${col} >= $${params.length}`);
          return chain;
        },
        lte(col: string, val: any) {
          params.push(val);
          whereConditions.push(`${col} <= $${params.length}`);
          return chain;
        },
        ilike(col: string, val: any) {
          params.push(val);
          whereConditions.push(`${col} ILIKE $${params.length}`);
          return chain;
        },
        or(conditionStr: string) {
          // simplified OR handler
          return chain;
        },
        order(col: string, opts?: { ascending?: boolean }) {
          orderSql = `ORDER BY ${col} ${opts?.ascending === false ? "DESC" : "ASC"}`;
          return chain;
        },
        limit(num: number) {
          limitSql = `LIMIT ${num}`;
          return chain;
        },
        single() {
          isSingle = true;
          limitSql = "LIMIT 1";
          return chain;
        },
        maybeSingle() {
          isSingle = true;
          limitSql = "LIMIT 1";
          return chain;
        },
        then(resolve: any, reject: any) {
          const where = whereConditions.length ? `WHERE ${whereConditions.join(" AND ")}` : "";
          const query = `SELECT ${selectCols} FROM ${table} ${where} ${orderSql} ${limitSql};`;
          return pool.query(query, params)
            .then((res) => {
              const data = isSingle ? res.rows[0] || null : res.rows;
              resolve({ data, error: null, count: res.rowCount });
            })
            .catch((err) => resolve({ data: null, error: err, count: 0 }));
        },
        async insert(dataVal: any) {
          const items = Array.isArray(dataVal) ? dataVal : [dataVal];
          if (items.length === 0) return { data: [], error: null };
          const keys = Object.keys(items[0]);
          const results: any[] = [];
          for (const item of items) {
            const vals = keys.map((k) => item[k]);
            const dollars = keys.map((_, i) => `$${i + 1}`).join(", ");
            const res = await pool.query(`INSERT INTO ${table} (${keys.join(", ")}) VALUES (${dollars}) RETURNING *;`, vals);
            results.push(res.rows[0]);
          }
          return { data: isSingle || !Array.isArray(dataVal) ? results[0] : results, error: null };
        },
        async upsert(dataVal: any, opts?: any) {
          return chain.insert(dataVal);
        },
        async update(dataVal: any) {
          const keys = Object.keys(dataVal);
          const vals = Object.values(dataVal);
          const setStr = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
          const offset = keys.length;
          const whereStr = whereConditions.map((cond) => cond.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n) + offset}`)).join(" AND ");
          const where = whereStr ? `WHERE ${whereStr}` : "";
          try {
            const res = await pool.query(`UPDATE ${table} SET ${setStr} ${where} RETURNING *;`, [...vals, ...params]);
            return { data: res.rows, error: null };
          } catch (err) {
            return { data: null, error: err };
          }
        },
        async delete() {
          const where = whereConditions.length ? `WHERE ${whereConditions.join(" AND ")}` : "";
          try {
            const res = await pool.query(`DELETE FROM ${table} ${where} RETURNING *;`, params);
            return { data: res.rows, error: null };
          } catch (err) {
            return { data: null, error: err };
          }
        },
      };
      return chain;
    },
  };
}
