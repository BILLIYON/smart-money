import { Pool } from "pg";
import { NextResponse } from "next/server";

export type ClientConsentScope = "transactions" | "networth" | "goals" | "chat" | "actions";

export const ALL_CONSENT_SCOPES: ClientConsentScope[] = [
  "transactions",
  "networth",
  "goals",
  "chat",
  "actions",
];

export type ClientConsentRecord = Record<ClientConsentScope, boolean>;

function getPool() {
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money";
  const isRemote = connectionString.includes("supabase.com") || connectionString.includes("pooler") || connectionString.includes("aws-");
  return new Pool({
    connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : false,
  });
}

/**
 * Retrieves all 5 consent scopes for a specific (partner_org, client) pair.
 */
export async function getClientConsentScopes(
  partnerOrgId: string,
  clientId: string
): Promise<ClientConsentRecord> {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `SELECT scope, enabled 
       FROM public.partner_client_scopes 
       WHERE partner_org_id = $1 AND user_id = $2;`,
      [partnerOrgId, clientId]
    );

    const consentMap: ClientConsentRecord = {
      transactions: false,
      networth: false,
      goals: false,
      chat: false,
      actions: false,
    };

    for (const row of rows) {
      if (row.scope in consentMap) {
        consentMap[row.scope as ClientConsentScope] = Boolean(row.enabled);
      }
    }

    return consentMap;
  } catch (error) {
    console.error("[getClientConsentScopes] Error querying client scopes:", error);
    return {
      transactions: false,
      networth: false,
      goals: false,
      chat: false,
      actions: false,
    };
  } finally {
    await pool.end();
  }
}

/**
 * Checks whether a single scope is currently enabled by the client.
 */
export async function hasClientConsent(
  partnerOrgId: string,
  clientId: string,
  scope: ClientConsentScope
): Promise<boolean> {
  const scopes = await getClientConsentScopes(partnerOrgId, clientId);
  return Boolean(scopes[scope]);
}

/**
 * Guard utility for API endpoints: enforces that the client has granted the requested scope.
 * Returns either { allowed: true } or a 403 Forbidden NextResponse.
 */
export async function enforceClientConsent(
  partnerOrgId: string,
  clientId: string,
  scope: ClientConsentScope
): Promise<{ allowed: true; error: null } | { allowed: false; error: NextResponse }> {
  const granted = await hasClientConsent(partnerOrgId, clientId, scope);

  if (!granted) {
    return {
      allowed: false,
      error: NextResponse.json(
        {
          error: "Forbidden",
          code: "CLIENT_CONSENT_REQUIRED",
          message: `Client has not granted '${scope}' consent to this partner organization.`,
          requiredScope: scope,
        },
        { status: 403 }
      ),
    };
  }

  return { allowed: true, error: null };
}

/**
 * Sanitizes and strips client financial details according to granted scopes.
 */
export async function sanitizeClientPayload<T extends Record<string, any>>(
  partnerOrgId: string,
  clientId: string,
  payload: T
): Promise<T> {
  const scopes = await getClientConsentScopes(partnerOrgId, clientId);
  const sanitized = { ...payload } as any;

  if (!scopes.networth) {
    delete sanitized.netWorth;
    delete sanitized.net_worth;
    delete sanitized.total_assets;
    delete sanitized.total_liabilities;
  }

  if (!scopes.transactions) {
    delete sanitized.transactions;
    delete sanitized.recentTransactions;
    delete sanitized.spending_breakdown;
  }

  if (!scopes.chat) {
    delete sanitized.chat_history;
    delete sanitized.recent_conversations;
  }

  if (!scopes.goals) {
    delete sanitized.goals;
    delete sanitized.active_goals;
  }

  return sanitized;
}
