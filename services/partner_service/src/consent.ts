import { query } from "./db.js";

export type ClientConsentScope = "transactions" | "networth" | "goals" | "chat" | "actions";

export const ALL_CONSENT_SCOPES: ClientConsentScope[] = [
  "transactions",
  "networth",
  "goals",
  "chat",
  "actions",
];

export type ClientConsentRecord = Record<ClientConsentScope, boolean>;

export async function getClientConsentScopes(
  partnerOrgId: string,
  clientId: string
): Promise<ClientConsentRecord> {
  const consentMap: ClientConsentRecord = {
    transactions: false,
    networth: false,
    goals: false,
    chat: false,
    actions: false,
  };

  try {
    const res = await query(
      `SELECT scope, enabled 
       FROM public.partner_client_scopes 
       WHERE partner_org_id = $1 AND user_id = $2;`,
      [partnerOrgId, clientId]
    );

    for (const row of res.rows) {
      if (row.scope in consentMap) {
        consentMap[row.scope as ClientConsentScope] = Boolean(row.enabled);
      }
    }
  } catch (error) {
    console.error("[getClientConsentScopes] Error:", error);
  }

  return consentMap;
}

export async function hasClientConsent(
  partnerOrgId: string,
  clientId: string,
  scope: ClientConsentScope
): Promise<boolean> {
  const scopes = await getClientConsentScopes(partnerOrgId, clientId);
  return Boolean(scopes[scope]);
}

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
