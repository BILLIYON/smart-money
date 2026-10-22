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

  /**
   * Get partner-suggested goals
   */
  async getPartnerGoals(orgId?: string) {
    const qs = orgId ? `?orgId=${encodeURIComponent(orgId)}` : "";
    return requestService<{ goals: any[] }>(`/api/v1/goals${qs}`);
  },

  /**
   * Create a partner-suggested goal
   */
  async createPartnerGoal(payload: {
    partnerOrgId: string;
    userId?: string;
    title: string;
    targetAmount: number;
    targetDate?: string;
    advisorNote?: string;
  }) {
    return requestService<{ success: boolean; goal: any }>("/api/v1/goals", {
      method: "POST",
      body: payload,
    });
  },

  /**
   * Accept a proposed partner goal
   */
  async acceptGoal(goalId: string) {
    return requestService<{ success: boolean; goalId: string; status: string }>(`/api/v1/goals/${encodeURIComponent(goalId)}/accept`, {
      method: "PATCH",
    });
  },

  /**
   * Decline a proposed partner goal
   */
  async declineGoal(goalId: string) {
    return requestService<{ success: boolean; goalId: string; status: string }>(`/api/v1/goals/${encodeURIComponent(goalId)}/decline`, {
      method: "PATCH",
    });
  },

  /**
   * Get opportunities feed for client or partner
   */
  async getOpportunities(params?: { orgId?: string; userId?: string }) {
    const queryParts: string[] = [];
    if (params?.orgId) queryParts.push(`orgId=${encodeURIComponent(params.orgId)}`);
    if (params?.userId) queryParts.push(`userId=${encodeURIComponent(params.userId)}`);
    const qs = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
    return requestService<{ opportunities: any[] }>(`/api/v1/opportunities${qs}`);
  },

  /**
   * Create and dispatch a new opportunity
   */
  async createOpportunity(payload: {
    partnerOrgId: string;
    title: string;
    category?: string;
    reasoning: string;
    valueEstimate?: string;
    windowLabel?: string;
    targetUserId?: string;
  }) {
    return requestService<{ success: boolean; opportunity: any }>("/api/v1/opportunities", {
      method: "POST",
      body: payload,
    });
  },

  /**
   * Update opportunity status (acted, dismissed, active)
   */
  async updateOpportunityStatus(id: string, status: "acted" | "dismissed" | "active") {
    return requestService<{ success: boolean; opportunity: any }>(`/api/v1/opportunities/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { status },
    });
  },

  /**
   * Get pending approvals queue for partner firm
   */
  async getApprovals(orgId?: string) {
    const qs = orgId ? `?orgId=${encodeURIComponent(orgId)}` : "";
    return requestService<{ approvals: any[] }>(`/api/v1/approvals${qs}`);
  },

  /**
   * Decide on a pending partner approval (approve or decline)
   */
  async decideApproval(actionId: string, decision: "approve" | "decline", note?: string, advisorId?: string) {
    return requestService<{ success: boolean; decision: string; actionId: string; status: string; message: string }>(
      `/api/v1/approvals/${encodeURIComponent(actionId)}`,
      {
        method: "PATCH",
        body: { decision, note, advisorId },
      }
    );
  },

  /**
   * Get partner staff roster
   */
  async getStaff(orgId?: string) {
    const qs = orgId ? `?orgId=${encodeURIComponent(orgId)}` : "";
    return requestService<{ staff: any[] }>(`/api/v1/staff${qs}`);
  },

  /**
   * Invite staff colleague
   */
  async inviteStaff(payload: { partnerOrgId: string; name: string; email: string; role?: string }) {
    return requestService<{ success: boolean; staff: any; inviteToken: string; inviteUrl: string; message: string }>(
      "/api/v1/staff/invite",
      {
        method: "POST",
        body: payload,
      }
    );
  },

  /**
   * Resend staff invite
   */
  async resendStaffInvite(staffId: string) {
    return requestService<{ success: boolean; inviteToken: string; inviteUrl: string; message: string }>(
      "/api/v1/staff/resend",
      {
        method: "POST",
        body: { staffId },
      }
    );
  },

  /**
   * Get affiliated buddies and escalation rules
   */
  async getBuddies(orgId?: string) {
    const qs = orgId ? `?orgId=${encodeURIComponent(orgId)}` : "";
    return requestService<{ buddies: any[]; escalationRules: any[] }>(`/api/v1/buddies${qs}`);
  },

  /**
   * Toggle partner escalation rule
   */
  async toggleEscalationRule(ruleId: string, isEnabled: boolean) {
    return requestService<{ success: boolean; ruleId: string; isEnabled: boolean }>(
      `/api/v1/buddies/escalation/${encodeURIComponent(ruleId)}`,
      {
        method: "PATCH",
        body: { isEnabled },
      }
    );
  },

  /**
   * Run institutional AI research prompt
   */
  async runResearch(payload: { prompt: string; model?: string; partnerOrgId?: string }) {
    return requestService<{ success: boolean; briefing: any }>("/api/v1/research", {
      method: "POST",
      body: payload,
    });
  },

  /**
   * Get active API key metadata
   */
  async getApiKey(orgId?: string) {
    const qs = orgId ? `?orgId=${encodeURIComponent(orgId)}` : "";
    return requestService<{ apiKey: any | null }>(`/api/v1/keys${qs}`);
  },

  /**
   * Generate new production API key
   */
  async generateApiKey(partnerOrgId: string, name?: string) {
    return requestService<{ success: boolean; apiKey: string; keyRecord: any; message: string }>("/api/v1/keys", {
      method: "POST",
      body: { partnerOrgId, name },
    });
  },

  /**
   * Get active webhook configuration
   */
  async getWebhook(orgId?: string) {
    const qs = orgId ? `?orgId=${encodeURIComponent(orgId)}` : "";
    return requestService<{ webhook: any | null }>(`/api/v1/webhooks${qs}`);
  },

  /**
   * Configure webhook endpoint
   */
  async configureWebhook(payload: { partnerOrgId: string; url: string; events?: string[] }) {
    return requestService<{ success: boolean; webhook: any; message: string }>("/api/v1/webhooks", {
      method: "POST",
      body: payload,
    });
  },

  /**
   * Get partner feature toggles
   */
  async getFeatures(orgId?: string) {
    const qs = orgId ? `?orgId=${encodeURIComponent(orgId)}` : "";
    return requestService<{ features: any[] }>(`/api/v1/features${qs}`);
  },

  /**
   * Toggle a partner feature
   */
  async toggleFeature(key: string, isEnabled: boolean, partnerOrgId?: string) {
    return requestService<{ success: boolean; feature: any; message: string }>(
      `/api/v1/features/${encodeURIComponent(key)}`,
      {
        method: "PATCH",
        body: { isEnabled, partnerOrgId },
      }
    );
  },

  /**
   * Get custom analytics rules and category toggles
   */
  async getAnalyticsRules(orgId?: string) {
    const qs = orgId ? `?orgId=${encodeURIComponent(orgId)}` : "";
    return requestService<{ rules: any[]; categories: any[] }>(`/api/v1/analytics-rules${qs}`);
  },

  /**
   * Create a new custom analytics rule
   */
  async createAnalyticsRule(payload: { partnerOrgId: string; ruleName: string; formula: string; icon?: string }) {
    return requestService<{ success: boolean; rule: any; message: string }>("/api/v1/analytics-rules", {
      method: "POST",
      body: payload,
    });
  },

  /**
   * Toggle custom analytics rule active state
   */
  async toggleAnalyticsRule(ruleId: string, isEnabled: boolean) {
    return requestService<{ success: boolean; rule: any }>(
      `/api/v1/analytics-rules/${encodeURIComponent(ruleId)}`,
      {
        method: "PATCH",
        body: { isEnabled },
      }
    );
  },

  /**
   * Toggle category inclusion/exclusion
   */
  async toggleAnalyticsCategory(categoryId: string, isIncluded: boolean) {
    return requestService<{ success: boolean; category: any }>(
      `/api/v1/analytics-categories/${encodeURIComponent(categoryId)}`,
      {
        method: "PATCH",
        body: { isIncluded },
      }
    );
  },
};

