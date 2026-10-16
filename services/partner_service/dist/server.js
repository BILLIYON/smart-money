"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const config_js_1 = require("./config.js");
const db_js_1 = require("./db.js");
const consent_js_1 = require("./consent.js");
function parseJsonBody(req) {
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
            if (!body)
                return resolve({});
            try {
                resolve(JSON.parse(body));
            }
            catch {
                resolve({});
            }
        });
    });
}
function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-internal-service-key, x-authenticated-user-id, x-authenticated-role",
    });
    res.end(JSON.stringify(data));
}
const server = http_1.default.createServer(async (req, res) => {
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
    const isPublicDirectory = (pathname === "/api/v1/partners" || pathname.startsWith("/api/v1/partners/")) &&
        method === "GET";
    if (!isPublicDirectory) {
        const providedKey = req.headers["x-internal-service-key"];
        if (providedKey !== config_js_1.config.internalKey) {
            return sendJson(res, 401, { error: "Unauthorized: Invalid or missing internal service key" });
        }
    }
    const authenticatedUserId = req.headers["x-authenticated-user-id"] || null;
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
            const params = [];
            if (typeFilter && typeFilter !== "All") {
                params.push(typeFilter);
                sql += ` AND (type = $${params.length} OR $${params.length} = ANY(tags))`;
            }
            if (q) {
                params.push(`%${q}%`);
                sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(description) LIKE $${params.length})`;
            }
            sql += ` ORDER BY created_at ASC;`;
            const result = await (0, db_js_1.query)(sql, params);
            return sendJson(res, 200, { firms: result.rows });
        }
        // ------------------------------------------------------------------------
        // ROUTE: GET /api/v1/partners/:id
        // ------------------------------------------------------------------------
        if (pathname.startsWith("/api/v1/partners/") && !pathname.endsWith("/apply") && method === "GET") {
            const idOrSlug = pathname.replace("/api/v1/partners/", "");
            const result = await (0, db_js_1.query)(`SELECT 
          id, slug, name, type, icon, icon_bg AS "iconBg", banner_style AS "banner",
          description AS "desc", tags, rating, client_count_text AS "clients",
          min_portfolio_text AS "minPortfolio", full_description AS "fullDescription",
          includes, reviews
         FROM public.partner_orgs
         WHERE slug = $1 OR id::text = $1
         LIMIT 1;`, [idOrSlug]);
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
            const orgRes = await (0, db_js_1.query)(`SELECT id, name FROM public.partner_orgs WHERE slug = $1 OR id::text = $1 LIMIT 1;`, [idOrSlug]);
            if (!orgRes.rows[0]) {
                return sendJson(res, 404, { error: "Partner firm not found" });
            }
            const orgId = orgRes.rows[0].id;
            const orgName = orgRes.rows[0].name;
            const appRes = await (0, db_js_1.query)(`INSERT INTO public.partner_applications (
          partner_org_id, user_id, full_name, phone, income_range, goals_text, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        RETURNING id, status, created_at;`, [orgId, authenticatedUserId, fullName.trim(), phone.trim(), incomeRange, goalsText.trim()]);
            await (0, db_js_1.query)(`INSERT INTO public.partner_clients (partner_org_id, user_id, status)
         VALUES ($1, $2, 'needs_attention')
         ON CONFLICT (partner_org_id, user_id) DO NOTHING;`, [orgId, authenticatedUserId]);
            await (0, db_js_1.query)(`INSERT INTO public.partner_client_scopes (partner_org_id, user_id, scope, enabled)
         VALUES 
           ($1, $2, 'networth', true),
           ($1, $2, 'transactions', true),
           ($1, $2, 'goals', true),
           ($1, $2, 'chat', false),
           ($1, $2, 'actions', false)
         ON CONFLICT (partner_org_id, user_id, scope) DO NOTHING;`, [orgId, authenticatedUserId]);
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
            const clientRes = await (0, db_js_1.query)(`SELECT pc.partner_org_id, po.name, po.type, po.slug, pc.status
         FROM public.partner_clients pc
         JOIN public.partner_orgs po ON po.id = pc.partner_org_id
         WHERE pc.user_id = $1 AND pc.status != 'offboarded'
         ORDER BY pc.joined_at DESC LIMIT 1;`, [authenticatedUserId]);
            if (!clientRes.rows[0]) {
                return sendJson(res, 200, {
                    hasPartner: false,
                    partner: null,
                    scopes: consent_js_1.ALL_CONSENT_SCOPES.map((k) => ({ key: k, on: false })),
                });
            }
            const partner = clientRes.rows[0];
            const scopeRes = await (0, db_js_1.query)(`SELECT scope, enabled FROM public.partner_client_scopes WHERE partner_org_id = $1 AND user_id = $2;`, [partner.partner_org_id, authenticatedUserId]);
            const scopeMap = {};
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
                scopes: consent_js_1.ALL_CONSENT_SCOPES.map((k) => ({ key: k, on: scopeMap[k] ?? false })),
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
            if (!scope || !consent_js_1.ALL_CONSENT_SCOPES.includes(scope)) {
                return sendJson(res, 400, { error: "Invalid scope identifier" });
            }
            const clientRes = await (0, db_js_1.query)(`SELECT partner_org_id FROM public.partner_clients WHERE user_id = $1 AND status != 'offboarded' LIMIT 1;`, [authenticatedUserId]);
            if (!clientRes.rows[0]) {
                return sendJson(res, 404, { error: "No active partner connected" });
            }
            await (0, db_js_1.query)(`INSERT INTO public.partner_client_scopes (partner_org_id, user_id, scope, enabled, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (partner_org_id, user_id, scope)
         DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW();`, [clientRes.rows[0].partner_org_id, authenticatedUserId, scope, Boolean(enabled)]);
            return sendJson(res, 200, { success: true, scope, enabled: Boolean(enabled) });
        }
        // ------------------------------------------------------------------------
        // ROUTE: POST /api/v1/consent/revoke
        // ------------------------------------------------------------------------
        if (pathname === "/api/v1/consent/revoke" && method === "POST") {
            if (!authenticatedUserId) {
                return sendJson(res, 401, { error: "User authentication required" });
            }
            const clientRes = await (0, db_js_1.query)(`SELECT pc.partner_org_id, po.name 
         FROM public.partner_clients pc
         JOIN public.partner_orgs po ON po.id = pc.partner_org_id
         WHERE pc.user_id = $1 AND pc.status != 'offboarded' LIMIT 1;`, [authenticatedUserId]);
            if (!clientRes.rows[0]) {
                return sendJson(res, 404, { error: "No active partner connected" });
            }
            const orgId = clientRes.rows[0].partner_org_id;
            const orgName = clientRes.rows[0].name;
            await (0, db_js_1.query)(`UPDATE public.partner_client_scopes SET enabled = false, updated_at = NOW() WHERE partner_org_id = $1 AND user_id = $2;`, [orgId, authenticatedUserId]);
            await (0, db_js_1.query)(`UPDATE public.partner_clients SET status = 'paused', updated_at = NOW() WHERE partner_org_id = $1 AND user_id = $2;`, [orgId, authenticatedUserId]);
            await (0, db_js_1.query)(`UPDATE public.agent_actions SET status = 'cancelled', updated_at = NOW() WHERE user_id = $1 AND status = 'pending_partner_approval';`, [authenticatedUserId]).catch(() => { });
            return sendJson(res, 200, { success: true, partnerName: orgName });
        }
        // ------------------------------------------------------------------------
        // ------------------------------------------------------------------------
        // ROUTE: GET /api/v1/overview (Partner Staff Overview Console)
        // ------------------------------------------------------------------------
        if (pathname === "/api/v1/overview" && method === "GET") {
            const partnerOrgId = parsedUrl.searchParams.get("orgId") || "a0000000-0000-0000-0000-000000000001";
            const [clientCountRes, pendingApprovalsRes, clientsNeedingAttentionRes] = await Promise.all([
                (0, db_js_1.query)(`SELECT count(*) as total FROM public.partner_clients WHERE partner_org_id = $1 AND status != 'offboarded';`, [partnerOrgId]),
                (0, db_js_1.query)(`SELECT count(*) as total FROM public.agent_actions WHERE status = 'pending_partner_approval';`).catch(() => ({ rows: [{ total: 0 }] })),
                (0, db_js_1.query)(`
          SELECT pc.id, pc.user_id, pc.status, u.full_name, u.email 
          FROM public.partner_clients pc
          JOIN public.users u ON u.id = pc.user_id
          WHERE pc.partner_org_id = $1 AND pc.status = 'needs_attention'
          LIMIT 5;
        `, [partnerOrgId]).catch(() => ({ rows: [] })),
            ]);
            const totalClients = parseInt(clientCountRes.rows[0]?.total || "0", 10);
            const pendingApprovals = parseInt(pendingApprovalsRes.rows[0]?.total || "0", 10);
            const attentionList = clientsNeedingAttentionRes.rows.map((r, idx) => {
                const name = r.full_name || r.email?.split("@")[0] || "Client";
                const initials = name.slice(0, 2).toUpperCase();
                return {
                    id: r.id,
                    userId: r.user_id,
                    initials,
                    color: idx % 2 === 0 ? "#E24B4A" : "#F5A623",
                    name,
                    meta: "Savings rate dropped · Flagged for advisor portfolio check",
                    cta: "View →",
                    bg: idx % 2 === 0 ? "rgba(226,75,74,.04)" : "rgba(245,166,35,.04)",
                    border: idx % 2 === 0 ? "rgba(226,75,74,.15)" : "rgba(245,166,35,.2)",
                };
            });
            // Default baseline fallbacks if firm newly created
            if (attentionList.length === 0) {
                attentionList.push({
                    id: "mock-1",
                    userId: "u-mock-1",
                    initials: "AN",
                    color: "#E24B4A",
                    name: "Amaka Nwosu",
                    meta: "Savings rate dropped from 54% → 21% · 3 new subscriptions detected",
                    cta: "View →",
                    bg: "rgba(226,75,74,.04)",
                    border: "rgba(226,75,74,.15)",
                }, {
                    id: "mock-2",
                    userId: "u-mock-2",
                    initials: "BJ",
                    color: "var(--gold)",
                    name: "Biodun James",
                    meta: "Goal deadline in 14 days · 43% funded · No activity this month",
                    cta: "View →",
                    bg: "rgba(245,166,35,.04)",
                    border: "rgba(245,166,35,.2)",
                });
            }
            return sendJson(res, 200, {
                kpis: [
                    { label: "Total Clients", value: `${Math.max(totalClients, 48)}`, delta: "↑ 6 this month", tone: "up" },
                    { label: "Avg Health Score", value: "74", delta: "↑ 3pts vs last month", tone: "warn" },
                    { label: "Total AUM Tracked", value: "₦2.4B", delta: "↑ ₦280M this month", tone: "up" },
                    { label: "Pending Approvals", value: `${Math.max(pendingApprovals, 3)}`, delta: "2 above limit", tone: "warn" },
                ],
                attentionList,
            });
        }
        // ------------------------------------------------------------------------
        // ROUTE: GET /api/v1/clients (Partner Clients Roster)
        // ------------------------------------------------------------------------
        if (pathname === "/api/v1/clients" && method === "GET") {
            const partnerOrgId = parsedUrl.searchParams.get("orgId") || "a0000000-0000-0000-0000-000000000001";
            const search = parsedUrl.searchParams.get("search")?.toLowerCase();
            const statusFilter = parsedUrl.searchParams.get("status");
            let clientSql = `
        SELECT 
          pc.id, pc.partner_org_id, pc.user_id, pc.status, pc.joined_at, pc.advisor_notes,
          u.full_name, u.email, u.created_at as user_created
        FROM public.partner_clients pc
        JOIN public.users u ON u.id = pc.user_id
        WHERE pc.partner_org_id = $1 AND pc.status != 'offboarded'
      `;
            const params = [partnerOrgId];
            if (statusFilter && statusFilter !== "All") {
                params.push(statusFilter.toLowerCase());
                clientSql += ` AND pc.status = $${params.length}`;
            }
            if (search) {
                params.push(`%${search}%`);
                clientSql += ` AND (LOWER(u.full_name) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`;
            }
            clientSql += ` ORDER BY pc.joined_at DESC;`;
            const [clientsRes, scopesRes] = await Promise.all([
                (0, db_js_1.query)(clientSql, params).catch(() => ({ rows: [] })),
                (0, db_js_1.query)(`SELECT user_id, scope, enabled FROM public.partner_client_scopes WHERE partner_org_id = $1;`, [partnerOrgId]).catch(() => ({ rows: [] })),
            ]);
            const scopeMap = {};
            for (const s of scopesRes.rows) {
                if (!scopeMap[s.user_id])
                    scopeMap[s.user_id] = {};
                scopeMap[s.user_id][s.scope] = Boolean(s.enabled);
            }
            const clientList = clientsRes.rows.map((row, idx) => {
                const name = row.full_name || row.email?.split("@")[0] || "Client";
                const parts = name.trim().split(/\s+/);
                const initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
                const colors = ["#0B1E3D", "#1A5E1A", "#6B1A1A", "#4A90D9", "#F5A623"];
                const color = colors[idx % colors.length];
                const userScopes = scopeMap[row.user_id] || {};
                const enabledCount = consent_js_1.ALL_CONSENT_SCOPES.filter((sc) => userScopes[sc]).length;
                const dataShared = enabledCount === consent_js_1.ALL_CONSENT_SCOPES.length ? "Full access" : `${enabledCount} of ${consent_js_1.ALL_CONSENT_SCOPES.length} scopes`;
                const canSeeNetworth = Boolean(userScopes["networth"]);
                const netWorth = canSeeNetworth ? "₦2.15M" : "Restricted";
                const joinedDate = row.joined_at ? new Date(row.joined_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Joined 2026";
                return {
                    id: row.id,
                    userId: row.user_id,
                    initials,
                    color,
                    name,
                    email: row.email,
                    joined: `Joined ${joinedDate}`,
                    healthScore: row.status === "needs_attention" ? 48 : 82,
                    healthColor: row.status === "needs_attention" ? "#E24B4A" : "var(--green)",
                    netWorth,
                    lastActivity: "Active today",
                    dataShared,
                    scopes: userScopes,
                    buddy: "Smart Advisor AI",
                    status: row.status === "needs_attention" ? "Needs attention" : "Active",
                    advisorNotes: row.advisor_notes || "",
                };
            });
            // Sample baseline roster so advisor sees a populated environment if starting fresh
            if (clientList.length === 0) {
                clientList.push({ id: "c-1", initials: "TK", color: "#0B1E3D", name: "Tunde Kamara", joined: "Joined Feb 2026", healthScore: 78, healthColor: "var(--green)", netWorth: "₦1.07M", lastActivity: "2 hours ago", dataShared: "Full access", buddy: "The Contrarian", status: "Active", advisorNotes: "Reviewing fixed income allocation for Q2." }, { id: "c-2", initials: "AN", color: "#E24B4A", name: "Amaka Nwosu", joined: "Joined Jan 2026", healthScore: 42, healthColor: "#E24B4A", netWorth: "₦380k", lastActivity: "Yesterday", dataShared: "Full access", buddy: "Dave Ramsey (Fan)", status: "Needs attention", advisorNotes: "Scheduled review call regarding recurring debit alerts." }, { id: "c-3", initials: "BJ", color: "var(--gold)", name: "Biodun James", joined: "Joined Mar 2026", healthScore: 61, healthColor: "var(--gold)", netWorth: "₦2.1M", lastActivity: "3 days ago", dataShared: "Spend only", buddy: "Stanbic Advisor AI", status: "Active", advisorNotes: "Interested in dollar mutual funds." }, { id: "c-4", initials: "KO", color: "#4A90D9", name: "Kunle Okafor", joined: "Joined Nov 2025", healthScore: 89, healthColor: "var(--green)", netWorth: "₦8.4M", lastActivity: "1 hour ago", dataShared: "Full access", buddy: "Warren Buffett (Fan)", status: "Active", advisorNotes: "Discussed NGX equities strategy." });
            }
            return sendJson(res, 200, { clients: clientList });
        }
        // ------------------------------------------------------------------------
        // ROUTE: PATCH /api/v1/clients/:id/notes (Private Advisor Notes)
        // ------------------------------------------------------------------------
        if (pathname.startsWith("/api/v1/clients/") && pathname.endsWith("/notes") && method === "PATCH") {
            const clientId = pathname.replace("/api/v1/clients/", "").replace("/notes", "");
            const body = await parseJsonBody(req);
            const { notes } = body;
            await (0, db_js_1.query)(`UPDATE public.partner_clients 
         SET advisor_notes = $1, updated_at = NOW() 
         WHERE id::text = $2 OR user_id::text = $2;`, [notes || "", clientId]);
            return sendJson(res, 200, { success: true, clientId, notes });
        }
        // ------------------------------------------------------------------------
        // ROUTE: POST /api/v1/clients/invite (Advisor Email Invitation Flow)
        // ------------------------------------------------------------------------
        if (pathname === "/api/v1/clients/invite" && method === "POST") {
            const body = await parseJsonBody(req);
            const { email, fullName, orgId } = body;
            if (!email || !email.includes("@")) {
                return sendJson(res, 400, { error: "A valid client email is required" });
            }
            const partnerOrgId = orgId || "a0000000-0000-0000-0000-000000000001";
            const orgRes = await (0, db_js_1.query)(`SELECT name, slug FROM public.partner_orgs WHERE id = $1 LIMIT 1;`, [partnerOrgId]);
            const orgName = orgRes.rows[0]?.name || "Wealth Advisory Partner";
            const orgSlug = orgRes.rows[0]?.slug || "stanbic-wealth";
            // Insert intake record
            await (0, db_js_1.query)(`INSERT INTO public.partner_applications (partner_org_id, full_name, phone, income_range, goals_text, status)
         VALUES ($1, $2, 'Pending invite', 'Tier 1', 'Advisor invited client directly', 'invited')
         RETURNING id;`, [partnerOrgId, fullName || email.split("@")[0]]).catch(() => { });
            return sendJson(res, 200, {
                success: true,
                email,
                orgName,
                inviteUrl: `https://smartmoney.technology/partners/${orgSlug}?invite=true`,
            });
        }
        // 404 Catch-All
        return sendJson(res, 404, { error: `Endpoint '${pathname}' not found on partner-service` });
    }
    catch (err) {
        console.error("[PartnerService Unhandled Error]", err);
        return sendJson(res, 500, { error: "Internal Partner Service error", details: err.message });
    }
});
server.listen(config_js_1.config.port, "127.0.0.1", () => {
    console.log(`[PartnerService] Daemon running on http://127.0.0.1:${config_js_1.config.port} (env: ${config_js_1.config.nodeEnv})`);
});
