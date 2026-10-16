/**
 * Partner Service Client SDK
 * Provides typed IPC communication between the Next.js application and the decoupled
 * Partner Microservice running on http://127.0.0.1:8001.
 */

const PARTNER_SERVICE_URL = process.env.PARTNER_SERVICE_URL || "http://127.0.0.1:8001";
const INTERNAL_KEY = process.env.INTERNAL_PARTNER_KEY || process.env.ENCRYPTION_KEY || "sm_internal_partner_secret_key_2026";

export type PartnerServiceOptions = {
  userId?: string;
  role?: string;
};

async function requestService<T = any>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    body?: any;
    userId?: string;
    role?: string;
  } = {}
): Promise<T> {
  const url = `${PARTNER_SERVICE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-internal-service-key": INTERNAL_KEY,
  };

  if (options.userId) {
    headers["x-authenticated-user-id"] = options.userId;
  }
  if (options.role) {
    headers["x-authenticated-role"] = options.role;
  }

  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.error || `Partner service error (${response.status})`;
    const err = new Error(errorMsg);
    (err as any).status = response.status;
    (err as any).data = data;
    throw err;
  }

  return data as T;
}

export const partnerServiceClient = {
  /**
   * Health check
   */
  async getHealth() {
    return requestService("/health");
  },

  /**
   * Get public partner directory
   */
  async getDirectory(params?: { type?: string | null; query?: string | null }) {
    const queryParts: string[] = [];
    if (params?.type && params.type !== "All") queryParts.push(`type=${encodeURIComponent(params.type)}`);
    if (params?.query) queryParts.push(`q=${encodeURIComponent(params.query)}`);
    const qs = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
    return requestService<{ firms: any[] }>(`/api/v1/partners${qs}`);
  },

  /**
   * Get firm details by slug or ID
   */
  async getFirmDetails(idOrSlug: string) {
    return requestService<{ firm: any }>(`/api/v1/partners/${encodeURIComponent(idOrSlug)}`);
  },

  /**
   * Submit an inbound client application
   */
  async submitApplication(
    firmIdOrSlug: string,
    payload: { fullName: string; phone: string; incomeRange: string; goalsText: string },
    userId: string
  ) {
    return requestService(`/api/v1/partners/${encodeURIComponent(firmIdOrSlug)}/apply`, {
      method: "POST",
      body: payload,
      userId,
    });
  },

  /**
   * Get user's active partner consent scopes
   */
  async getConsent(userId: string) {
    return requestService<{ hasPartner: boolean; partner: any; scopes: any[] }>("/api/v1/consent", {
      userId,
    });
  },

  /**
   * Toggle a single consent scope
   */
  async toggleConsent(userId: string, scope: string, enabled: boolean) {
    return requestService("/api/v1/consent", {
      method: "PATCH",
      body: { scope, enabled },
      userId,
    });
  },

  /**
   * Bulk revoke all partner access
   */
  async revokeAllConsent(userId: string) {
    return requestService("/api/v1/consent/revoke", {
      method: "POST",
      userId,
    });
  },

  /**
   * Partner staff overview KPIs
   */
  async getOverview(orgId?: string) {
    const qs = orgId ? `?orgId=${encodeURIComponent(orgId)}` : "";
    return requestService<{ kpis: any[]; attentionList: any[] }>(`/api/v1/overview${qs}`);
  },

  /**
   * Get partner client roster
   */
  async getClients(params?: { orgId?: string; search?: string; status?: string }) {
    const queryParts: string[] = [];
    if (params?.orgId) queryParts.push(`orgId=${encodeURIComponent(params.orgId)}`);
    if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
    if (params?.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);
    const qs = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
    return requestService<{ clients: any[] }>(`/api/v1/clients${qs}`);
  },

  /**
   * Save private advisor notes for a client
   */
  async saveAdvisorNote(clientId: string, notes: string) {
    return requestService(`/api/v1/clients/${encodeURIComponent(clientId)}/notes`, {
      method: "PATCH",
      body: { notes },
    });
  },

  /**
   * Invite a new client to the partner firm
   */
  async inviteClient(payload: { email: string; fullName?: string; orgId?: string }) {
    return requestService<{ success: boolean; email: string; orgName: string; inviteUrl: string }>("/api/v1/clients/invite", {
      method: "POST",
      body: payload,
    });
  },
};
