import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_COOKIE_NAME = "smart_money_session";
const SECRET_KEY = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "smart-money-secret-key-32-chars-min!!";

export type AuthUser = {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  onboarding_complete: boolean;
  plan: string;
};

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
}

// ── Password Security ──────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

// ── Session Token Crypto (HMAC Signed JSON) ───────────────

export function signToken(payload: Record<string, any>): string {
  const dataStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const hmac = crypto.createHmac("sha256", SECRET_KEY).update(dataStr).digest("base64url");
  return `${dataStr}.${hmac}`;
}

export function verifyToken<T = Record<string, any>>(token: string): T | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [dataStr, signature] = parts;
    const expectedHmac = crypto.createHmac("sha256", SECRET_KEY).update(dataStr).digest("base64url");
    
    // Constant-time check
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedHmac))) {
      return null;
    }
    const jsonStr = Buffer.from(dataStr, "base64url").toString("utf8");
    const parsed = JSON.parse(jsonStr);
    
    // Check expiry if present
    if (parsed.exp && Date.now() > parsed.exp) {
      return null;
    }
    return parsed as T;
  } catch {
    return null;
  }
}

// ── Database User Queries ──────────────────────────────────

export async function findUserByEmail(email: string): Promise<AuthUser & { password_hash: string | null } | null> {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.is_admin, u.onboarding_complete, u.plan, 
              COALESCE(u.password_hash, a.encrypted_password) AS password_hash 
       FROM public.users u
       LEFT JOIN auth.users a ON a.id = u.id
       WHERE LOWER(u.email) = LOWER($1) LIMIT 1;`,
      [email.trim()]
    );
    return rows[0] || null;
  } finally {
    await pool.end();
  }
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `SELECT id, email, full_name, is_admin, onboarding_complete, plan FROM public.users WHERE id = $1 LIMIT 1;`,
      [id]
    );
    return rows[0] || null;
  } finally {
    await pool.end();
  }
}

export async function updateUserPassword(userId: string, newPasswordHash: string): Promise<void> {
  const pool = getPool();
  try {
    await pool.query(`UPDATE public.users SET password_hash = $1 WHERE id = $2;`, [newPasswordHash, userId]);
    await pool.query(`UPDATE auth.users SET encrypted_password = $1 WHERE id = $2;`, [newPasswordHash, userId]);
  } finally {
    await pool.end();
  }
}

export async function createUser(payload: {
  email: string;
  password_hash?: string | null;
  full_name?: string | null;
}): Promise<AuthUser & { password_hash: string | null }> {
  const pool = getPool();
  const cleanEmail = payload.email.trim().toLowerCase();
  try {
    const { rows } = await pool.query(
      `INSERT INTO public.users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name, is_admin, onboarding_complete, plan;`,
      [cleanEmail, payload.password_hash || null, payload.full_name || null]
    );

    const user = rows[0];
    if (user && user.id) {
      await pool.query(
        `INSERT INTO auth.users (id, email, encrypted_password)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password;`,
        [user.id, cleanEmail, payload.password_hash || null]
      ).catch(() => {});
    }

    return user;
  } finally {
    await pool.end();
  }
}

// ── Session Cookie Management ──────────────────────────────

export async function setSessionCookie(user: AuthUser) {
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const token = signToken({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    is_admin: user.is_admin,
    exp,
  });

  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    });
  } catch (err) {
    console.warn("[setSessionCookie] Notice: cookies() outside request store context");
  }
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentUser(req?: Request): Promise<AuthUser | null> {
  let token: string | undefined;

  if (req) {
    // Check Authorization header or Cookie header
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
    if (match) {
      token = match[1];
    } else {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }
  } else {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // Ignore if called outside server request context
    }
  }

  if (!token) return null;
  const verified = verifyToken<{ id: string; email: string }>(token);
  if (!verified?.id) return null;

  // Re-verify against database for current user state
  return findUserById(verified.id);
}

export async function requireAuth(req?: Request) {
  const user = await getCurrentUser(req);
  if (!user) {
    const { NextResponse } = await import("next/server");
    return {
      userId: null,
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { userId: user.id, user, error: null };
}
