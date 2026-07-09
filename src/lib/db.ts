/**
 * All Supabase database calls go through this module.
 * Never query Supabase inline in components or pages.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Server-side client (service role when available, anon key as fallback)
function getClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? anonKey;
  return createClient(url, key, { auth: { persistSession: false } });
}

export type OnboardingPayload = {
  userId: string;
  goal: string;
  buddyId: string;
  connectedSources: string[];
};

export async function completeOnboarding(payload: OnboardingPayload) {
  const db = getClient();
  const { error } = await db
    .from("users")
    .update({
      onboarding_complete: true,
      primary_goal: payload.goal,
      selected_buddy_id: payload.buddyId,
      connected_sources: payload.connectedSources,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", payload.userId);

  if (error) throw error;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const db = getClient();
  const { data } = await db
    .from("users")
    .select("is_admin")
    .eq("id", userId)
    .single();
  return data?.is_admin ?? false;
}

// ── Admin queries ──────────────────────────────────────────

export async function getAdminStats() {
  const db = getClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    { count: totalUsers },
    { count: activeBuddies },
    { count: pendingApprovals },
    { count: messagesToday },
  ] = await Promise.all([
    db.from("users").select("*", { count: "exact", head: true }),
    db.from("buddies").select("*", { count: "exact", head: true }).eq("status", "live"),
    db.from("buddies").select("*", { count: "exact", head: true }).eq("status", "pending"),
    db.from("messages").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
  ]);

  return {
    totalUsers: totalUsers ?? 0,
    activeBuddies: activeBuddies ?? 0,
    pendingApprovals: pendingApprovals ?? 0,
    messagesToday: messagesToday ?? 0,
  };
}

export type RecentSignup = {
  id: string;
  email: string | null;
  plan: string;
  created_at: string;
  last_active: string | null;
};

export async function getRecentSignups(limit = 20): Promise<RecentSignup[]> {
  const db = getClient();
  const { data, error } = await db
    .from("users")
    .select("id, email, plan, created_at, chat_sessions(last_message_at)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const sessions = (row.chat_sessions ?? []) as { last_message_at: string | null }[];
    const lastActive = sessions
      .map((s) => s.last_message_at)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;
    return { id: row.id, email: row.email, plan: row.plan, created_at: row.created_at, last_active: lastActive };
  });
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
  const db = getClient();
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  const to = from + ADMIN_PAGE_SIZE - 1;

  let query = db
    .from("users")
    .select("id, email, plan, created_at, is_admin, chat_sessions(last_message_at)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search.trim()) {
    query = query.ilike("email", `%${search.trim()}%`);
  }

  const { data, count, error } = await query;
  if (error) throw error;

  const users = (data ?? []).map((row) => {
    const sessions = (row.chat_sessions ?? []) as { last_message_at: string | null }[];
    const lastActive =
      sessions.map((s) => s.last_message_at).filter(Boolean).sort().at(-1) ?? null;
    return { id: row.id, email: row.email, plan: row.plan, created_at: row.created_at, last_active: lastActive, is_admin: row.is_admin ?? false };
  });

  return { users, total: count ?? 0 };
}

export async function deleteUser(userId: string): Promise<void> {
  const db = getClient();
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) throw error;
}

export async function changeUserPassword(userId: string, password: string): Promise<void> {
  const db = getClient();
  const { error } = await db.auth.admin.updateUserById(userId, { password });
  if (error) throw error;
}

export async function toggleAdminRole(userId: string, isAdmin: boolean): Promise<void> {
  const db = getClient();
  const { error } = await db
    .from("users")
    .update({ is_admin: isAdmin })
    .eq("id", userId);
  if (error) throw error;
}

export async function bulkDeleteUsers(userIds: string[]): Promise<void> {
  const db = getClient();
  await Promise.all(userIds.map((id) => db.auth.admin.deleteUser(id)));
}

export type PendingBuddy = {
  id: string;
  name: string;
  tag: string | null;
  avatar_bg: string | null;
  avatar_content: string | null;
  banner_color: string | null;
  created_at: string;
  creator_email: string | null;
};

export async function getPendingBuddies(): Promise<PendingBuddy[]> {
  const db = getClient();
  const { data, error } = await db
    .from("buddies")
    .select("id, name, tag, avatar_bg, avatar_content, banner_color, created_at, creator:users!creator_id(email)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    tag: row.tag,
    avatar_bg: row.avatar_bg,
    avatar_content: row.avatar_content,
    banner_color: row.banner_color,
    created_at: row.created_at,
    creator_email: (row.creator as unknown as { email: string | null } | null)?.email ?? null,
  }));
}

export async function approveBuddy(id: string): Promise<void> {
  const db = getClient();
  const { error } = await db
    .from("buddies")
    .update({ status: "approved", rejection_reason: null })
    .eq("id", id);
  if (error) throw error;
}

export async function rejectBuddy(id: string, reason: string): Promise<void> {
  const db = getClient();
  const { error } = await db
    .from("buddies")
    .update({ status: "rejected", rejection_reason: reason })
    .eq("id", id);
  if (error) throw error;
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

export async function submitBuddy(config: BuddySubmission, creatorId: string): Promise<string> {
  const db = getClient();
  const { data, error } = await db
    .from("buddies")
    .insert({
      name: config.buddyName,
      tag: config.tag,
      description: config.desc,
      avatar_content: config.avatarContent,
      avatar_bg: config.avatarBg,
      avatar_is_serif: config.avatarIsSerif,
      banner_color: config.bannerColor,
      categories: config.categories,
      is_fan_sim: config.isFanSim,
      disclaimer: config.disclaimer,
      philosophy: config.philosophy,
      samples: config.samples,
      includes: config.includes,
      price_note: config.priceNote,
      tone: config.tone,
      delivery: config.delivery,
      register: config.register,
      signature_phrase: config.signaturePhrase,
      will_not_advise_on: config.willNotAdviseOn,
      model: config.model,
      triggers: config.triggers,
      max_notifs: config.maxNotifs,
      price: config.price,
      custom_price: config.customPrice,
      creator_id: creatorId,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
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
};

export async function getHiddenBuddyIds(): Promise<string[]> {
  const db = getClient();
  const { data, error } = await db.from("hidden_buddies").select("buddy_id");
  if (error) {
    console.error("[getHiddenBuddyIds]", error);
    return [];
  }
  return (data ?? []).map((r: { buddy_id: string }) => r.buddy_id);
}

export async function hideBuddy(buddyId: string): Promise<void> {
  const db = getClient();
  const { error } = await db.from("hidden_buddies").upsert({ buddy_id: buddyId });
  if (error) throw error;
}

export async function unhideBuddy(buddyId: string): Promise<void> {
  const db = getClient();
  const { error } = await db.from("hidden_buddies").delete().eq("buddy_id", buddyId);
  if (error) throw error;
}

export async function getApprovedCommunityBuddies(): Promise<CommunityBuddyRow[]> {
  const db = getClient();
  const { data, error } = await db
    .from("buddies")
    .select(
      "id, name, tag, description, avatar_content, avatar_bg, avatar_is_serif, banner_color, categories, is_fan_sim, disclaimer, philosophy, samples, includes, price_note, model, price, custom_price"
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getCommunityBuddyById(id: string): Promise<CommunityBuddyRow | null> {
  const db = getClient();
  const { data, error } = await db
    .from("buddies")
    .select(
      "id, name, tag, description, avatar_content, avatar_bg, avatar_is_serif, banner_color, categories, is_fan_sim, disclaimer, philosophy, samples, includes, price_note, model, price, custom_price"
    )
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function deleteTestUsers(): Promise<number> {
  const db = getClient();
  const { data } = await db
    .from("users")
    .select("id")
    .or("email.ilike.%+test%,email.ilike.%@example.com%");

  if (!data || data.length === 0) return 0;
  await Promise.all(data.map(({ id }) => db.auth.admin.deleteUser(id)));
  return data.length;
}

export async function clearDummyTransactions(): Promise<number> {
  const db = getClient();
  const { data, error } = await db
    .from("databank_entries")
    .delete()
    .eq("is_dummy", true)
    .select("id");
  if (error) throw error;
  return (data ?? []).length;
}

export async function resetDatabank(): Promise<number> {
  const db = getClient();
  const { data, error } = await db
    .from("databank_entries")
    .delete()
    .eq("is_fixture", true)
    .select("id");
  if (error) throw error;
  return (data ?? []).length;
}

export async function getUserOnboardingStatus(userId: string) {
  const db = getClient();
  const { data, error } = await db
    .from("users")
    .select("onboarding_complete")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data?.onboarding_complete ?? false;
}
