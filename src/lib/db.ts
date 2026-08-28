import { Pool } from "pg";
import { dbCache } from "@/lib/cache";
import { hashPassword, updateUserPassword } from "@/lib/auth";

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
}

export type OnboardingPayload = {
  userId: string;
  goal: string;
  buddyId: string;
  connectedSources: string[];
};

export async function completeOnboarding(payload: OnboardingPayload) {
  const pool = getPool();
  try {
    await pool.query(
      `UPDATE public.users SET onboarding_complete = true, primary_goal = $1, selected_buddy_id = $2, connected_sources = $3, onboarded_at = NOW() WHERE id = $4;`,
      [payload.goal, payload.buddyId, payload.connectedSources, payload.userId]
    );
  } finally {
    await pool.end();
  }
}

export async function isAdmin(userId: string): Promise<boolean> {
  const pool = getPool();
  try {
    const { rows } = await pool.query(`SELECT is_admin FROM public.users WHERE id = $1 LIMIT 1;`, [userId]);
    return Boolean(rows[0]?.is_admin);
  } finally {
    await pool.end();
  }
}

// ── Admin queries ──────────────────────────────────────────

export async function getAdminStats() {
  return dbCache.getOrFetch("admin:stats", async () => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
    });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      { rows: uRows },
      { rows: bRows },
      { rows: pRows },
      { rows: mRows },
    ] = await Promise.all([
      pool.query("SELECT count(*) FROM users;"),
      pool.query("SELECT count(*) FROM buddies WHERE status = 'live';"),
      pool.query("SELECT count(*) FROM buddies WHERE status = 'pending';"),
      pool.query("SELECT count(*) FROM messages WHERE created_at >= $1;", [todayStart.toISOString()]),
    ]);
    await pool.end();

    return {
      totalUsers: parseInt(uRows[0]?.count || "0", 10),
      activeBuddies: parseInt(bRows[0]?.count || "0", 10),
      pendingApprovals: parseInt(pRows[0]?.count || "0", 10),
      messagesToday: parseInt(mRows[0]?.count || "0", 10),
    };
  }, 15);
}

export type RecentSignup = {
  id: string;
  email: string | null;
  plan: string;
  created_at: string;
  last_active: string | null;
};

export async function getRecentSignups(limit = 20): Promise<RecentSignup[]> {
  return dbCache.getOrFetch(`admin:signups:${limit}`, async () => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
    });
    const { rows } = await pool.query(
      `
      SELECT id, email, plan, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT $1;
      `,
      [limit]
    );
    await pool.end();

    return rows.map((r: any) => ({
      id: r.id,
      email: r.email,
      plan: r.plan,
      created_at: r.created_at,
      last_active: r.created_at,
    }));
  }, 15);
}

export const ADMIN_PAGE_SIZE = 20;

export type AdminUser = {
  id: string;
  email: string | null;
  plan: string;
  created_at: string;
  last_active: string | null;
  is_admin: boolean;
};

export async function getAdminUsers(
  page: number,
  search: string
): Promise<{ users: AdminUser[]; total: number }> {
  const pool = getPool();
  const limit = ADMIN_PAGE_SIZE;
  const offset = (page - 1) * ADMIN_PAGE_SIZE;
  try {
    const searchPattern = `%${search.trim().toLowerCase()}%`;
    const countRes = await pool.query(
      `SELECT count(*)::int as count FROM public.users ${search.trim() ? "WHERE LOWER(email) LIKE $1" : ""};`,
      search.trim() ? [searchPattern] : []
    );
    const total = countRes.rows[0]?.count ?? 0;

    const dataRes = await pool.query(
      `SELECT id, email, plan, created_at, is_admin FROM public.users
       ${search.trim() ? "WHERE LOWER(email) LIKE $1" : ""}
       ORDER BY created_at DESC LIMIT ${search.trim() ? "$2" : "$1"} OFFSET ${search.trim() ? "$3" : "$2"};`,
      search.trim() ? [searchPattern, limit, offset] : [limit, offset]
    );

    const users = dataRes.rows.map((row) => ({
      id: row.id,
      email: row.email,
      plan: row.plan || "free",
      created_at: row.created_at,
      last_active: row.created_at,
      is_admin: row.is_admin ?? false,
    }));

    return { users, total };
  } finally {
    await pool.end();
  }
}

export async function deleteUser(userId: string): Promise<void> {
  const pool = getPool();
  try {
    await pool.query(`DELETE FROM public.users WHERE id = $1;`, [userId]);
    await pool.query(`DELETE FROM auth.users WHERE id = $1;`, [userId]).catch(() => {});
  } finally {
    await pool.end();
  }
}

export async function changeUserPassword(userId: string, password: string): Promise<void> {
  const hash = await hashPassword(password);
  await updateUserPassword(userId, hash);
}

export async function toggleAdminRole(userId: string, isAdmin: boolean): Promise<void> {
  const pool = getPool();
  try {
    await pool.query(`UPDATE public.users SET is_admin = $1 WHERE id = $2;`, [isAdmin, userId]);
  } finally {
    await pool.end();
  }
}

export async function bulkDeleteUsers(userIds: string[]): Promise<void> {
  const pool = getPool();
  try {
    await pool.query(`DELETE FROM public.users WHERE id = ANY($1);`, [userIds]);
    await pool.query(`DELETE FROM auth.users WHERE id = ANY($1);`, [userIds]).catch(() => {});
  } finally {
    await pool.end();
  }
}

export type PendingBuddy = {
  id: string;
  name: string;
  tag: string | null;
  description: string | null;
  philosophy: string | null;
  avatar_bg: string | null;
  avatar_content: string | null;
  avatar_is_serif: boolean | null;
  banner_color: string | null;
  category: string[] | null;
  is_fan_sim: boolean | null;
  fan_disclaimer: string | null;
  ai_model: string | null;
  price_monthly: number | null;
  created_at: string;
  status: string;
  rejection_reason: string | null;
  creator_email: string | null;
};

export async function getPendingBuddies(): Promise<PendingBuddy[]> {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `SELECT b.id, b.name, b.tag, b.description, b.philosophy, b.avatar_bg, b.avatar_content, b.avatar_is_serif, b.banner_color, b.category, b.is_fan_sim, b.fan_disclaimer, b.ai_model, b.price_monthly, b.created_at, b.status, b.rejection_reason, u.email as creator_email
       FROM buddies b
       LEFT JOIN users u ON u.id = b.creator_id
       WHERE b.status IN ('pending', 'revision_requested', 'flagged', 'rejected', 'in_review', 'review')
       ORDER BY b.created_at DESC;`
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      tag: row.tag,
      description: row.description,
      philosophy: row.philosophy,
      avatar_bg: row.avatar_bg,
      avatar_content: row.avatar_content,
      avatar_is_serif: row.avatar_is_serif,
      banner_color: row.banner_color,
      category: Array.isArray(row.category) ? row.category : row.category ? [row.category] : [],
      is_fan_sim: row.is_fan_sim,
      fan_disclaimer: row.fan_disclaimer,
      ai_model: row.ai_model,
      price_monthly: row.price_monthly,
      created_at: row.created_at,
      status: row.status,
      rejection_reason: row.rejection_reason,
      creator_email: row.creator_email ?? null,
    }));
  } finally {
    await pool.end();
  }
}

export async function approveBuddy(id: string): Promise<void> {
  const pool = getPool();
  try {
    await pool.query(`UPDATE buddies SET status = 'approved', rejection_reason = NULL WHERE id = $1;`, [id]);
  } finally {
    await pool.end();
  }
}

export async function requestBuddyRevision(id: string, feedback: string): Promise<void> {
  const pool = getPool();
  try {
    await pool.query(`UPDATE buddies SET status = 'revision_requested', rejection_reason = $1 WHERE id = $2;`, [feedback, id]);
  } finally {
    await pool.end();
  }
}

export async function flagBuddyViolation(id: string, reason: string): Promise<void> {
  const pool = getPool();
  try {
    await pool.query(`UPDATE buddies SET status = 'flagged', rejection_reason = $1 WHERE id = $2;`, [reason, id]);
  } finally {
    await pool.end();
  }
}

export async function rejectBuddy(id: string, reason: string): Promise<void> {
  const pool = getPool();
  try {
    await pool.query(`UPDATE buddies SET status = 'rejected', rejection_reason = $1 WHERE id = $2;`, [reason, id]);
  } finally {
    await pool.end();
  }
}

export type BuddySubmission = {
  buddyName: string;
  tag: string;
  desc: string;
  avatarContent: string;
  avatarBg: string;
  avatarIsSerif: boolean;
  bannerColor: string;
  categories: string[];
  isFanSim: boolean;
  disclaimer: string;
  philosophy: string;
  samples: string[];
  includes: string[];
  priceNote: string;
  tone: number;
  delivery: number;
  register: number;
  signaturePhrase: string;
  willNotAdviseOn: string;
  model: string;
  triggers: boolean[];
  maxNotifs: number;
  price: string;
  customPrice: string;
};

export async function submitBuddy(
  config: BuddySubmission & { editBuddyId?: string },
  creatorId: string,
  isAdmin: boolean = false
): Promise<string> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });

  const editId = config.editBuddyId?.trim();
  let existingBuddy: any = null;

  if (editId) {
    const { rows } = await pool.query("SELECT * FROM buddies WHERE id = $1 LIMIT 1;", [editId]).catch(() => ({ rows: [] }));
    existingBuddy = rows[0] || null;
  }

  const slug = editId || (config.buddyName
    ? config.buddyName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36)
    : "custom-buddy-" + Date.now().toString(36));

  const priceMonthly = config.price === "free" ? 0 : Number(config.customPrice || config.price || 0);

  const categories = Array.isArray(config.categories) && config.categories.length > 0 
    ? config.categories 
    : ["General"];

  const modelVal = config.model ? config.model.toLowerCase() : "claude";

  // Build composite philosophy that incorporates personality sliders, catchphrase, and boundaries
  const toneLabel = (config.tone ?? 50) > 66 ? "Aggressive & High-Conviction" : (config.tone ?? 50) > 33 ? "Balanced & Pragmatic" : "Conservative & Risk-Averse";
  const deliveryLabel = (config.delivery ?? 50) > 66 ? "Blunt & Direct" : (config.delivery ?? 50) > 33 ? "Clear & Empathetic" : "Soft & Encouraging";
  const registerLabel = (config.register ?? 50) > 66 ? "Casual & Conversational" : (config.register ?? 50) > 33 ? "Professional & Accessible" : "Formal & Structured";

  const philosophyParts = [
    config.philosophy?.trim(),
    `\n[Personality & Voice Directives]`,
    `• Tone: ${toneLabel}`,
    `• Delivery Style: ${deliveryLabel}`,
    `• Register: ${registerLabel}`,
    config.signaturePhrase?.trim() ? `• Signature Phrase: "${config.signaturePhrase.trim()}"` : null,
    config.willNotAdviseOn?.trim() ? `• Strict Boundaries (Will NOT advise on): ${config.willNotAdviseOn.trim()}` : null,
    (config as any).dnaKeywords?.length ? `• Ingested Persona DNA Tags: ${(config as any).dnaKeywords.map((k: string) => `#${k}`).join(", ")}` : null,
    (config as any).rawDnaText?.trim() ? `\n[Ingested Biography & Transcript DNA]\n${(config as any).rawDnaText.trim()}` : null,
    (config as any).urls?.length ? `\n[Ingested Article & Web DNA]\n${(config as any).urls.map((u: any) => `• ${u.title || u.url}`).join("\n")}` : null,
  ].filter(Boolean);

  const fullPhilosophy = philosophyParts.join("\n");

  const targetStatus = existingBuddy
    ? (existingBuddy.status === "approved" || existingBuddy.status === "live" ? existingBuddy.status : "pending")
    : "pending";

  const isUuid = Boolean(creatorId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(creatorId));
  const validCreatorId = isUuid ? creatorId : existingBuddy?.creator_id || null;

  const query = `
    INSERT INTO buddies (
      id, name, tag, description, avatar_content, avatar_bg, avatar_is_serif,
      banner_color, category, is_fan_sim, fan_disclaimer, philosophy, ai_model,
      price_monthly, rating, review_count, creator_id, status, rejection_reason, created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      tag = EXCLUDED.tag,
      description = EXCLUDED.description,
      avatar_content = EXCLUDED.avatar_content,
      avatar_bg = EXCLUDED.avatar_bg,
      avatar_is_serif = EXCLUDED.avatar_is_serif,
      banner_color = EXCLUDED.banner_color,
      category = EXCLUDED.category,
      is_fan_sim = EXCLUDED.is_fan_sim,
      fan_disclaimer = EXCLUDED.fan_disclaimer,
      philosophy = EXCLUDED.philosophy,
      ai_model = EXCLUDED.ai_model,
      price_monthly = EXCLUDED.price_monthly,
      status = EXCLUDED.status,
      rejection_reason = EXCLUDED.rejection_reason;
  `;

  const values = [
    slug,
    config.buddyName || "Untitled Buddy",
    config.tag || "",
    config.desc || "",
    config.avatarContent || "🤖",
    config.avatarBg || "#1A3A6E",
    config.avatarIsSerif ?? false,
    config.bannerColor || "linear-gradient(135deg,#0B1E3D,#1A3A6E)",
    categories,
    config.isFanSim ?? false,
    config.disclaimer || null,
    fullPhilosophy,
    modelVal,
    isNaN(priceMonthly) ? 0 : priceMonthly,
    existingBuddy?.rating ?? 5.0,
    existingBuddy?.review_count ?? 0,
    validCreatorId,
    targetStatus,
    null,
  ];

  await pool.query(query, values);
  await pool.end();

  dbCache.clear();
  dbCache.invalidatePattern("buddies");
  return slug;
}

export type CommunityBuddyRow = {
  id: string;
  name: string;
  tag: string | null;
  description: string | null;
  avatar_content: string | null;
  avatar_bg: string | null;
  avatar_is_serif: boolean | null;
  banner_color: string | null;
  categories: string[] | null;
  is_fan_sim: boolean | null;
  disclaimer: string | null;
  philosophy: string | null;
  samples: string[] | null;
  includes: string[] | null;
  price_note: string | null;
  model: string | null;
  price: string | null;
  custom_price: string | null;
  rating?: string;
  review_count?: string;
};

export async function getHiddenBuddyIds(): Promise<string[]> {
  return dbCache.getOrFetch("buddies:hidden", async () => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
    });
    await pool.query("CREATE TABLE IF NOT EXISTS hidden_buddies (buddy_id TEXT PRIMARY KEY);");
    const { rows } = await pool.query("SELECT buddy_id FROM hidden_buddies;").catch(() => ({ rows: [] }));
    await pool.end();
    return rows.map((r: { buddy_id: string }) => r.buddy_id);
  }, 30);
}

export async function hideBuddy(buddyId: string): Promise<void> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
  await pool.query("CREATE TABLE IF NOT EXISTS hidden_buddies (buddy_id TEXT PRIMARY KEY);");
  await pool.query(
    "INSERT INTO hidden_buddies (buddy_id) VALUES ($1) ON CONFLICT (buddy_id) DO NOTHING;",
    [buddyId]
  );
  await pool.end();
  dbCache.invalidatePattern("buddies");
}

export async function unhideBuddy(buddyId: string): Promise<void> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
  await pool.query("CREATE TABLE IF NOT EXISTS hidden_buddies (buddy_id TEXT PRIMARY KEY);");
  await pool.query("DELETE FROM hidden_buddies WHERE buddy_id = $1;", [buddyId]);
  await pool.end();
  dbCache.invalidatePattern("buddies");
}

export type DbBuddy = {
  id: string;
  name: string;
  tag: string | null;
  description: string | null;
  philosophy: string | null;
  price_monthly: number;
  ai_model: string;
  banner_color: string | null;
  avatar_bg: string | null;
  avatar_content: string | null;
  avatar_is_serif: boolean | null;
  rating: number;
  review_count: number;
  is_fan_sim: boolean;
  fan_disclaimer: string | null;
  creator_id: string | null;
  status: string;
  category: string[] | null;
  created_at: string;
  rejection_reason: string | null;
};

export async function getAllDbBuddies(): Promise<DbBuddy[]> {
  return dbCache.getOrFetch("buddies:all", async () => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
    });
    const { rows } = await pool.query("SELECT * FROM buddies ORDER BY created_at DESC;");
    await pool.end();
    return rows ?? [];
  }, 30);
}

export async function getDbBuddyById(id: string): Promise<DbBuddy | null> {
  return dbCache.getOrFetch(`buddy:${id}`, async () => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
    });
    const { rows } = await pool.query("SELECT * FROM buddies WHERE id = $1 LIMIT 1;", [id]);
    await pool.end();
    return rows[0] ?? null;
  }, 30);
}

export async function createDbBuddy(payload: Partial<DbBuddy>): Promise<DbBuddy> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
  const id = payload.id || (payload.name ? payload.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") : `buddy-${Date.now()}`);
  
  const record = {
    id,
    name: payload.name || "Untitled Buddy",
    tag: payload.tag || "",
    description: payload.description || "",
    philosophy: payload.philosophy || "",
    price_monthly: payload.price_monthly ?? 0,
    ai_model: payload.ai_model || "claude",
    banner_color: payload.banner_color || "linear-gradient(135deg,#0B1E3D,#1A3A6E)",
    avatar_bg: payload.avatar_bg || "#1A3A6E",
    avatar_content: payload.avatar_content || "🤖",
    avatar_is_serif: payload.avatar_is_serif ?? false,
    rating: payload.rating ?? 4.8,
    review_count: payload.review_count ?? 1,
    is_fan_sim: payload.is_fan_sim ?? false,
    fan_disclaimer: payload.fan_disclaimer || null,
    creator_id: payload.creator_id || null,
    status: payload.status || "pending",
    category: payload.category || ["General"],
  };

  const query = `
    INSERT INTO buddies (
      id, name, tag, description, philosophy, price_monthly, ai_model,
      banner_color, avatar_bg, avatar_content, avatar_is_serif, rating,
      review_count, is_fan_sim, fan_disclaimer, creator_id, status, category
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
    ) RETURNING *;
  `;

  try {
    const { rows } = await pool.query(query, [
      record.id, record.name, record.tag, record.description, record.philosophy,
      record.price_monthly, record.ai_model, record.banner_color, record.avatar_bg,
      record.avatar_content, record.avatar_is_serif, record.rating, record.review_count,
      record.is_fan_sim, record.fan_disclaimer, record.creator_id, record.status, record.category
    ]);
    await pool.end();
    dbCache.invalidatePattern("buddies");
    return rows[0];
  } catch (error: any) {
    await pool.end();
    console.error("[createDbBuddy] Error:", error);
    throw error;
  }
}

export async function updateDbBuddy(id: string, payload: Partial<DbBuddy>): Promise<DbBuddy> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });

  const keys = Object.keys(payload);
  const setCols = keys.map((k, idx) => `"${k}" = $${idx + 2}`).join(", ");
  const vals = keys.map((k) => (payload as any)[k]);

  const query = `UPDATE buddies SET ${setCols} WHERE id = $1 RETURNING *;`;
  try {
    const { rows } = await pool.query(query, [id, ...vals]);
    await pool.end();
    dbCache.invalidatePattern("buddies");
    dbCache.invalidate(`buddy:${id}`);
    return rows[0];
  } catch (error: any) {
    await pool.end();
    console.error("[updateDbBuddy] Error:", error);
    throw error;
  }
}

export async function deleteDbBuddy(id: string): Promise<void> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
  await pool.query("CREATE TABLE IF NOT EXISTS hidden_buddies (buddy_id TEXT PRIMARY KEY);");
  await pool.query("DELETE FROM hidden_buddies WHERE buddy_id = $1;", [id]).catch(() => {});
  await pool.query("DELETE FROM buddies WHERE id = $1;", [id]);
  await pool.end();
  dbCache.invalidatePattern("buddies");
  dbCache.invalidate(`buddy:${id}`);
}

export async function getApprovedCommunityBuddies(): Promise<CommunityBuddyRow[]> {
  return dbCache.getOrFetch("buddies:approved", async () => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
    });
    const { rows } = await pool.query(`
      SELECT id, name, tag, description, avatar_content, avatar_bg, avatar_is_serif, banner_color, category, is_fan_sim, fan_disclaimer, philosophy, ai_model, price_monthly
      FROM buddies
      WHERE status IN ('approved', 'live')
      ORDER BY created_at DESC;
    `);
    await pool.end();

    return rows.map((b: any) => ({
      id: b.id,
      name: b.name,
      tag: b.tag,
      description: b.description,
      avatar_content: b.avatar_content,
      avatar_bg: b.avatar_bg,
      avatar_is_serif: b.avatar_is_serif,
      banner_color: b.banner_color,
      categories: b.category ?? [],
      is_fan_sim: b.is_fan_sim,
      disclaimer: b.fan_disclaimer,
      philosophy: b.philosophy,
      samples: [],
      includes: [],
      price_note: b.price_monthly === 0 ? "Free" : `₦${(b.price_monthly / 100).toLocaleString()}/mo`,
      model: b.ai_model,
      price: b.price_monthly === 0 ? "free" : String(b.price_monthly / 100),
      custom_price: b.price_monthly === 0 ? "0" : String(b.price_monthly / 100),
    }));
  }, 30);
}

export async function getCommunityBuddyById(id: string): Promise<CommunityBuddyRow | null> {
  return dbCache.getOrFetch(`buddy:community:${id}`, async () => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
    });
    const { rows } = await pool.query(
      `
      SELECT id, name, tag, description, avatar_content, avatar_bg, avatar_is_serif, banner_color, category, is_fan_sim, fan_disclaimer, philosophy, ai_model, price_monthly, rating, review_count
      FROM buddies
      WHERE id = $1
      LIMIT 1;
      `,
      [id]
    );
    await pool.end();

    if (!rows || rows.length === 0) return null;
    const data = rows[0];

    return {
      id: data.id,
      name: data.name,
      tag: data.tag,
      description: data.description,
      avatar_content: data.avatar_content,
      avatar_bg: data.avatar_bg,
      avatar_is_serif: data.avatar_is_serif,
      banner_color: data.banner_color,
      categories: data.category ?? [],
      is_fan_sim: data.is_fan_sim,
      disclaimer: data.fan_disclaimer,
      philosophy: data.philosophy,
      samples: [],
      includes: [],
      price_note: data.price_monthly === 0 ? "Free" : `₦${(data.price_monthly / 100).toLocaleString()}/mo`,
      model: data.ai_model,
      price: data.price_monthly === 0 ? "free" : String(data.price_monthly / 100),
      custom_price: data.price_monthly === 0 ? "0" : String(data.price_monthly / 100),
      rating: data.rating ? parseFloat(data.rating).toFixed(1) : "4.8",
      review_count: data.review_count ? String(data.review_count) : "5.2k",
    };
  }, 30);
}

export async function getBuddiesByCreator(creatorId: string): Promise<CommunityBuddyRow[]> {
  return dbCache.getOrFetch(`buddies:creator:${creatorId}`, async () => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
    });
    const { rows } = await pool.query(
      `
      SELECT id, name, tag, description, avatar_content, avatar_bg, avatar_is_serif, banner_color, category, is_fan_sim, fan_disclaimer, philosophy, ai_model, price_monthly, rating, review_count
      FROM buddies
      WHERE creator_id = $1
      ORDER BY created_at DESC;
      `,
      [creatorId]
    );
    await pool.end();

    return (rows ?? []).map((b: any) => ({
      id: b.id,
      name: b.name,
      tag: b.tag,
      description: b.description,
      avatar_content: b.avatar_content,
      avatar_bg: b.avatar_bg,
      avatar_is_serif: b.avatar_is_serif,
      banner_color: b.banner_color,
      categories: b.category ?? [],
      is_fan_sim: b.is_fan_sim,
      disclaimer: b.fan_disclaimer,
      philosophy: b.philosophy,
      samples: [],
      includes: [],
      price_note: b.price_monthly === 0 ? "Free" : `₦${(b.price_monthly / 100).toLocaleString()}/mo`,
      model: b.ai_model,
      price: b.price_monthly === 0 ? "free" : String(b.price_monthly / 100),
      custom_price: b.price_monthly === 0 ? "0" : String(b.price_monthly / 100),
      rating: b.rating ? parseFloat(b.rating).toFixed(1) : "4.8",
      review_count: b.review_count ? String(b.review_count) : "5.2k",
    }));
  }, 30);
}

export async function deleteTestUsers(): Promise<number> {
  const pool = getPool();
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM users WHERE email ILIKE '%+test%' OR email ILIKE '%@example.com%';`
    );
    return rowCount ?? 0;
  } finally {
    await pool.end();
  }
}

export async function clearDummyTransactions(): Promise<number> {
  const pool = getPool();
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM databank_entries WHERE is_dummy = true;`
    );
    return rowCount ?? 0;
  } finally {
    await pool.end();
  }
}

export async function resetDatabank(): Promise<number> {
  const pool = getPool();
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM databank_entries WHERE is_fixture = true;`
    );
    return rowCount ?? 0;
  } finally {
    await pool.end();
  }
}

export async function getUserOnboardingStatus(userId: string): Promise<boolean> {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `SELECT onboarding_complete FROM users WHERE id = $1 LIMIT 1;`,
      [userId]
    );
    return rows[0]?.onboarding_complete ?? false;
  } finally {
    await pool.end();
  }
}

