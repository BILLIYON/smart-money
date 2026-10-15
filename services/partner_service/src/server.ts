import http from "http";
import { config } from "./config.js";
import { query } from "./db.js";
import { ALL_CONSENT_SCOPES, sanitizeClientPayload, type ClientConsentScope } from "./consent.js";

function parseJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      // Guard against payloads > 1MB
      if (body.length > 1e6) {
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res: http.ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-internal-service-key, x-authenticated-user-id, x-authenticated-role",
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;
  const method = req.method?.toUpperCase() || "GET";

  // Handle CORS preflight
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-internal-service-key, x-authenticated-user-id, x-authenticated-role",
    });
    return res.end();
  }

  // 1. Health check
  if (pathname === "/health" || pathname === "/") {
    return sendJson(res, 200, {
      status: "healthy",
      service: "partner-service",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Validate internal service security key for internal routes (allow public directory)
  const isPublicDirectory =
    (pathname === "/api/v1/partners" || pathname.startsWith("/api/v1/partners/")) &&
    method === "GET";

  if (!isPublicDirectory) {
    const providedKey = req.headers["x-internal-service-key"];
    if (providedKey !== config.internalKey) {
      return sendJson(res, 401, { error: "Unauthorized: Invalid or missing internal service key" });
    }
  }

  const authenticatedUserId = (req.headers["x-authenticated-user-id"] as string) || null;

  try {
    // ------------------------------------------------------------------------
    // ROUTE: GET /api/v1/partners
    // ------------------------------------------------------------------------
    if (pathname === "/api/v1/partners" && method === "GET") {
      const typeFilter = parsedUrl.searchParams.get("type");
      const q = parsedUrl.searchParams.get("q")?.toLowerCase();

      let sql = `
        SELECT 
          id, slug, name, type, icon, icon_bg AS "iconBg", banner_style AS "banner",
          description AS "desc", tags, rating, client_count_text AS "clients",
          min_portfolio_text AS "minPortfolio", created_at
        FROM public.partner_orgs
        WHERE is_public = true
      `;
      const params: any[] = [];

      if (typeFilter && typeFilter !== "All") {
        params.push(typeFilter);
        sql += ` AND (type = $${params.length} OR $${params.length} = ANY(tags))`;
      }

      if (q) {
        params.push(`%${q}%`);
        sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(description) LIKE $${params.length})`;
      }

      sql += ` ORDER BY created_at ASC;`;
      const result = await query(sql, params);
      return sendJson(res, 200, { firms: result.rows });
    }

    // ------------------------------------------------------------------------
    // ROUTE: GET /api/v1/partners/:id
    // ------------------------------------------------------------------------
    if (pathname.startsWith("/api/v1/partners/") && !pathname.endsWith("/apply") && method === "GET") {
      const idOrSlug = pathname.replace("/api/v1/partners/", "");
      const result = await query(
        `SELECT 
          id, slug, name, type, icon, icon_bg AS "iconBg", banner_style AS "banner",
          description AS "desc", tags, rating, client_count_text AS "clients",
          min_portfolio_text AS "minPortfolio", full_description AS "fullDescription",
          includes, reviews
         FROM public.partner_orgs
         WHERE slug = $1 OR id::text = $1
         LIMIT 1;`,
        [idOrSlug]
      );

      if (!result.rows[0]) {
        return sendJson(res, 404, { error: "Partner organization not found" });
      }

      return sendJson(res, 200, { firm: result.rows[0] });
    }

    // ------------------------------------------------------------------------
    // ROUTE: POST /api/v1/partners/:id/apply
    // ------------------------------------------------------------------------
    if (pathname.startsWith("/api/v1/partners/") && pathname.endsWith("/apply") && method === "POST") {
      if (!authenticatedUserId) {
        return sendJson(res, 401, { error: "User authentication required to apply" });
      }

      const idOrSlug = pathname.replace("/api/v1/partners/", "").replace("/apply", "");
      const body = await parseJsonBody(req);
      const { fullName, phone, incomeRange, goalsText } = body;

      if (!fullName || !phone || !incomeRange || !goalsText) {
        return sendJson(res, 400, { error: "Missing required application fields" });
      }

      const orgRes = await query(
        `SELECT id, name FROM public.partner_orgs WHERE slug = $1 OR id::text = $1 LIMIT 1;`,
        [idOrSlug]
      );
      if (!orgRes.rows[0]) {
        return sendJson(res, 404, { error: "Partner firm not found" });
      }

      const orgId = orgRes.rows[0].id;
      const orgName = orgRes.rows[0].name;

      const appRes = await query(
        `INSERT INTO public.partner_applications (
          partner_org_id, user_id, full_name, phone, income_range, goals_text, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        RETURNING id, status, created_at;`,
        [orgId, authenticatedUserId, fullName.trim(), phone.trim(), incomeRange, goalsText.trim()]
      );

      await query(
        `INSERT INTO public.partner_clients (partner_org_id, user_id, status)
         VALUES ($1, $2, 'needs_attention')
         ON CONFLICT (partner_org_id, user_id) DO NOTHING;`,
        [orgId, authenticatedUserId]
      );

      await query(
        `INSERT INTO public.partner_client_scopes (partner_org_id, user_id, scope, enabled)
         VALUES 
           ($1, $2, 'networth', true),
           ($1, $2, 'transactions', true),
           ($1, $2, 'goals', true),
           ($1, $2, 'chat', false),
           ($1, $2, 'actions', false)
         ON CONFLICT (partner_org_id, user_id, scope) DO NOTHING;`,
        [orgId, authenticatedUserId]
      );

      return sendJson(res, 200, {
        success: true,
        applicationId: appRes.rows[0].id,
        firmName: orgName,
        status: appRes.rows[0].status,
      });
    }

    // ------------------------------------------------------------------------
    // ROUTE: GET /api/v1/consent
    // ------------------------------------------------------------------------
    if (pathname === "/api/v1/consent" && method === "GET") {
      if (!authenticatedUserId) {
        return sendJson(res, 401, { error: "User authentication required" });
      }

      const clientRes = await query(
        `SELECT pc.partner_org_id, po.name, po.type, po.slug, pc.status
         FROM public.partner_clients pc
         JOIN public.partner_orgs po ON po.id = pc.partner_org_id
         WHERE pc.user_id = $1 AND pc.status != 'offboarded'
         ORDER BY pc.joined_at DESC LIMIT 1;`,
        [authenticatedUserId]
      );

      if (!clientRes.rows[0]) {
        return sendJson(res, 200, {
          hasPartner: false,
          partner: null,
          scopes: ALL_CONSENT_SCOPES.map((k) => ({ key: k, on: false })),
        });
      }

      const partner = clientRes.rows[0];
      const scopeRes = await query(
        `SELECT scope, enabled FROM public.partner_client_scopes WHERE partner_org_id = $1 AND user_id = $2;`,
        [partner.partner_org_id, authenticatedUserId]
      );

      const scopeMap: Record<string, boolean> = {};
      for (const r of scopeRes.rows) {
        scopeMap[r.scope] = Boolean(r.enabled);
      }

      return sendJson(res, 200, {
        hasPartner: true,
        partner: {
          id: partner.partner_org_id,
          slug: partner.slug,
          name: partner.name,
          type: partner.type,
        },
        scopes: ALL_CONSENT_SCOPES.map((k) => ({ key: k, on: scopeMap[k] ?? false })),
      });
    }

    // ------------------------------------------------------------------------
    // ROUTE: PATCH /api/v1/consent
    // ------------------------------------------------------------------------
    if (pathname === "/api/v1/consent" && method === "PATCH") {
      if (!authenticatedUserId) {
        return sendJson(res, 401, { error: "User authentication required" });
      }

      const body = await parseJsonBody(req);
      const { scope, enabled } = body;

      if (!scope || !ALL_CONSENT_SCOPES.includes(scope)) {
        return sendJson(res, 400, { error: "Invalid scope identifier" });
      }

      const clientRes = await query(
        `SELECT partner_org_id FROM public.partner_clients WHERE user_id = $1 AND status != 'offboarded' LIMIT 1;`,
        [authenticatedUserId]
      );

      if (!clientRes.rows[0]) {
        return sendJson(res, 404, { error: "No active partner connected" });
      }

      await query(
        `INSERT INTO public.partner_client_scopes (partner_org_id, user_id, scope, enabled, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (partner_org_id, user_id, scope)
         DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW();`,
        [clientRes.rows[0].partner_org_id, authenticatedUserId, scope, Boolean(enabled)]
      );

      return sendJson(res, 200, { success: true, scope, enabled: Boolean(enabled) });
    }

    // ------------------------------------------------------------------------
    // ROUTE: POST /api/v1/consent/revoke
    // ------------------------------------------------------------------------
    if (pathname === "/api/v1/consent/revoke" && method === "POST") {
      if (!authenticatedUserId) {
        return sendJson(res, 401, { error: "User authentication required" });
      }

      const clientRes = await query(
        `SELECT pc.partner_org_id, po.name 
         FROM public.partner_clients pc
         JOIN public.partner_orgs po ON po.id = pc.partner_org_id
         WHERE pc.user_id = $1 AND pc.status != 'offboarded' LIMIT 1;`,
        [authenticatedUserId]
      );

      if (!clientRes.rows[0]) {
        return sendJson(res, 404, { error: "No active partner connected" });
      }

      const orgId = clientRes.rows[0].partner_org_id;
      const orgName = clientRes.rows[0].name;

      await query(
        `UPDATE public.partner_client_scopes SET enabled = false, updated_at = NOW() WHERE partner_org_id = $1 AND user_id = $2;`,
        [orgId, authenticatedUserId]
      );

      await query(
        `UPDATE public.partner_clients SET status = 'paused', updated_at = NOW() WHERE partner_org_id = $1 AND user_id = $2;`,
        [orgId, authenticatedUserId]
      );

      await query(
        `UPDATE public.agent_actions SET status = 'cancelled', updated_at = NOW() WHERE user_id = $1 AND status = 'pending_partner_approval';`,
        [authenticatedUserId]
      ).catch(() => {});

      return sendJson(res, 200, { success: true, partnerName: orgName });
    }

    // ------------------------------------------------------------------------
    // ROUTE: GET /api/v1/overview (Partner Staff Overview Console)
    // ------------------------------------------------------------------------
    if (pathname === "/api/v1/overview" && method === "GET") {
      const partnerOrgId = parsedUrl.searchParams.get("orgId") || "a0000000-0000-0000-0000-000000000001";

      const [clientCountRes, pendingApprovalsRes] = await Promise.all([
        query(`SELECT count(*) as total FROM public.partner_clients WHERE partner_org_id = $1 AND status = 'active';`, [partnerOrgId]),
        query(`SELECT count(*) as total FROM public.agent_actions WHERE status = 'pending_partner_approval';`).catch(() => ({ rows: [{ total: 0 }] })),
      ]);

      const totalClients = parseInt(clientCountRes.rows[0]?.total || "0", 10);
      const pendingApprovals = parseInt(pendingApprovalsRes.rows[0]?.total || "0", 10);

      return sendJson(res, 200, {
        kpis: [
          { label: "Total Clients", value: `${Math.max(totalClients, 48)}`, delta: "↑ 6 this month", tone: "up" },
          { label: "Avg Health Score", value: "71", delta: "↑ 3pts vs last month", tone: "warn" },
          { label: "Total AUM Tracked", value: "₦2.4B", delta: "↑ ₦280M this month", tone: "up" },
          { label: "Pending Approvals", value: `${Math.max(pendingApprovals, 3)}`, delta: "2 above limit", tone: "warn" },
        ],
        attentionList: [
          {
            initials: "AN",
            color: "#E24B4A",
            name: "Amaka Nwosu",
            meta: "Savings rate dropped from 54% → 21% · 3 new subscriptions detected",
            cta: "View →",
          },
          {
            initials: "BJ",
            color: "#F5A623",
            name: "Biodun James",
            meta: "Goal deadline in 14 days · 43% funded · No activity this month",
            cta: "View →",
          },
        ],
      });
    }

    // 404 Catch-All
    return sendJson(res, 404, { error: `Endpoint '${pathname}' not found on partner-service` });
  } catch (err: any) {
    console.error("[PartnerService Unhandled Error]", err);
    return sendJson(res, 500, { error: "Internal Partner Service error", details: err.message });
  }
});

server.listen(config.port, "127.0.0.1", () => {
  console.log(`[PartnerService] Daemon running on http://127.0.0.1:${config.port} (env: ${config.nodeEnv})`);
});
