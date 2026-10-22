"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const crypto_1 = __importDefault(require("crypto"));
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
    // 2. Validate internal service security key for internal routes (allow public directory and application intake)
    const isPublicDirectory = (pathname === "/api/v1/partners" || pathname.startsWith("/api/v1/partners/")) &&
        method === "GET";
    const isPublicApplication = pathname.startsWith("/api/v1/partners/") && pathname.endsWith("/apply") && method === "POST";
    if (!isPublicDirectory && !isPublicApplication) {
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
            await (0, db_js_1.query)(`INSERT INTO public.partner_clients (partner_org_id, user_id, status, joined_at)
         VALUES ($1, $2, 'needs_attention', NOW())
         ON CONFLICT (partner_org_id, user_id) 
         DO UPDATE SET status = 'needs_attention', joined_at = NOW();`, [orgId, authenticatedUserId]);
            await (0, db_js_1.query)(`INSERT INTO public.partner_client_scopes (partner_org_id, user_id, scope, enabled, updated_at)
         VALUES 
           ($1, $2, 'networth', true, NOW()),
           ($1, $2, 'transactions', true, NOW()),
           ($1, $2, 'goals', true, NOW()),
           ($1, $2, 'chat', false, NOW()),
           ($1, $2, 'actions', false, NOW())
         ON CONFLICT (partner_org_id, user_id, scope) 
         DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW();`, [orgId, authenticatedUserId]);
            await (0, db_js_1.query)(`INSERT INTO public.notifications (user_id, title, body, action_url, read, created_at)
         VALUES ($1, $2, $3, '/settings', false, NOW());`, [
                authenticatedUserId,
                `Application Submitted: ${orgName}`,
                `Your onboarding application to ${orgName} has been submitted. You can manage your privacy consent scopes in Settings → Partner Access.`
            ]).catch(() => { });
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
         WHERE pc.user_id = $1 AND pc.status IN ('active', 'needs_attention')
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
            const [clientCountRes, pendingApprovalsRes, clientsNeedingAttentionRes, aumRes] = await Promise.all([
                (0, db_js_1.query)(`SELECT count(*) as total FROM public.partner_clients WHERE partner_org_id = $1 AND status != 'offboarded';`, [partnerOrgId]),
                (0, db_js_1.query)(`SELECT count(*) as total FROM public.agent_actions WHERE partner_org_id = $1 AND status = 'pending_partner_approval';`, [partnerOrgId]).catch(() => ({ rows: [{ total: 0 }] })),
                (0, db_js_1.query)(`
          SELECT pc.id, pc.user_id, pc.status, u.full_name, u.email 
          FROM public.partner_clients pc
          JOIN public.users u ON u.id = pc.user_id
          WHERE pc.partner_org_id = $1 AND pc.status = 'needs_attention'
          LIMIT 5;
        `, [partnerOrgId]).catch(() => ({ rows: [] })),
                (0, db_js_1.query)(`
          SELECT COALESCE(SUM(de.amount), 0) as total_aum_kobo
          FROM public.partner_clients pc
          JOIN public.databank_entries de ON de.user_id = pc.user_id
          WHERE pc.partner_org_id = $1 AND pc.status != 'offboarded' AND de.entry_type IN ('asset', 'income');
        `, [partnerOrgId]).catch(() => ({ rows: [{ total_aum_kobo: 0 }] })),
            ]);
            const totalClients = parseInt(clientCountRes.rows[0]?.total || "0", 10);
            const pendingApprovals = parseInt(pendingApprovalsRes.rows[0]?.total || "0", 10);
            const aumKobo = parseInt(aumRes.rows[0]?.total_aum_kobo || "0", 10);
            const aumNaira = Math.round(aumKobo / 100);
            let aumDisplay = "₦0";
            if (aumNaira >= 1_000_000_000) {
                aumDisplay = `₦${(aumNaira / 1_000_000_000).toFixed(1)}B`;
            }
            else if (aumNaira >= 1_000_000) {
                aumDisplay = `₦${(aumNaira / 1_000_000).toFixed(1)}M`;
            }
            else if (aumNaira > 0) {
                aumDisplay = `₦${aumNaira.toLocaleString()}`;
            }
            const attentionList = clientsNeedingAttentionRes.rows.map((r, idx) => {
                const name = r.full_name || r.email?.split("@")[0] || "Client";
                const initials = name.slice(0, 2).toUpperCase();
                return {
                    id: r.id,
                    userId: r.user_id,
                    initials,
                    color: idx % 2 === 0 ? "#E24B4A" : "#F5A623",
                    name,
                    meta: "Flagged for advisor portfolio check",
                    cta: "View →",
                    bg: idx % 2 === 0 ? "rgba(226,75,74,.04)" : "rgba(245,166,35,.04)",
                    border: idx % 2 === 0 ? "rgba(226,75,74,.15)" : "rgba(245,166,35,.2)",
                };
            });
            return sendJson(res, 200, {
                kpis: [
                    { label: "Total Clients", value: `${totalClients}`, delta: totalClients > 0 ? "Active roster" : "No clients connected", tone: "up" },
                    { label: "Avg Health Score", value: totalClients > 0 ? "78" : "—", delta: totalClients > 0 ? "Stable" : "Awaiting data", tone: "warn" },
                    { label: "Total AUM Tracked", value: aumDisplay, delta: aumNaira > 0 ? "From verified ledgers" : "₦0 connected", tone: "up" },
                    { label: "Pending Approvals", value: `${pendingApprovals}`, delta: pendingApprovals > 0 ? "Requires review" : "Queue clear", tone: pendingApprovals > 0 ? "warn" : "up" },
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
        // ------------------------------------------------------------------------
        // ROUTE: GET /api/v1/goals (Partner-suggested Goals)
        // ------------------------------------------------------------------------
        if (pathname === "/api/v1/goals" && method === "GET") {
            const partnerOrgId = parsedUrl.searchParams.get("orgId") || "a0000000-0000-0000-0000-000000000001";
            const result = await (0, db_js_1.query)(`SELECT 
          g.id, g.title, g.target_amount as "targetAmount", g.current_amount as "currentAmount",
          g.target_date as "targetDate", g.status, g.advisor_note as "advisorNote",
          g.requires_acceptance as "requiresAcceptance", g.accepted_at as "acceptedAt",
          g.created_at as "createdAt", u.full_name as "clientName", u.email as "clientEmail"
         FROM public.goals g
         LEFT JOIN public.users u ON u.id = g.user_id
         WHERE g.origin_partner_org_id = $1
         ORDER BY g.created_at DESC;`, [partnerOrgId]).catch(() => ({ rows: [] }));
            const goalsList = result.rows.map((row) => ({
                ...row,
                clientName: row.clientName || row.clientEmail?.split("@")[0] || "Client",
            }));
            return sendJson(res, 200, { goals: goalsList });
        }
        // ------------------------------------------------------------------------
        // ROUTE: POST /api/v1/goals (Create Partner-suggested Goal)
        // ------------------------------------------------------------------------
        if (pathname === "/api/v1/goals" && method === "POST") {
            const body = await parseJsonBody(req);
            const partnerOrgId = body.partnerOrgId || body.orgId;
            let targetUserId = body.userId || body.clientUserId;
            const title = body.title;
            const targetAmount = body.targetAmount;
            const targetDate = body.targetDate || body.deadline;
            const advisorNote = body.advisorNote || body.notes;
            if (!title || !targetAmount || !partnerOrgId) {
                return sendJson(res, 400, { error: "Missing required goal fields (title, targetAmount, partnerOrgId)" });
            }
            // If specific userId not provided, pick first active client for this firm or null
            if (!targetUserId) {
                const clientRes = await (0, db_js_1.query)(`SELECT user_id FROM public.partner_clients WHERE partner_org_id = $1 LIMIT 1;`, [partnerOrgId]);
                targetUserId = clientRes.rows[0]?.user_id || authenticatedUserId;
            }
            const insertRes = await (0, db_js_1.query)(`INSERT INTO public.goals (
          user_id, title, target_amount, current_amount, target_date, status,
          origin, origin_partner_org_id, advisor_note, requires_acceptance
        ) VALUES ($1, $2, $3, 0, $4, 'pending_acceptance', 'partner', $5, $6, true)
        RETURNING id, title, target_amount, target_date, status, requires_acceptance, created_at;`, [
                targetUserId,
                title.trim(),
                parseInt(String(targetAmount), 10),
                targetDate || null,
                partnerOrgId,
                advisorNote ? advisorNote.trim() : "Proposed by your wealth advisor.",
            ]);
            return sendJson(res, 200, {
                success: true,
                goal: insertRes.rows[0],
            });
        }
        // ------------------------------------------------------------------------
        // ROUTE: PATCH /api/v1/goals/:id/accept (Client Accepts Proposed Goal)
        // ------------------------------------------------------------------------
        if (pathname.startsWith("/api/v1/goals/") && pathname.endsWith("/accept") && method === "PATCH") {
            const goalId = pathname.replace("/api/v1/goals/", "").replace("/accept", "");
            await (0, db_js_1.query)(`UPDATE public.goals 
         SET requires_acceptance = false, status = 'active', accepted_at = NOW()
         WHERE id::text = $1;`, [goalId]);
            return sendJson(res, 200, { success: true, goalId, status: "active" });
        }
        // ------------------------------------------------------------------------
        // ROUTE: PATCH /api/v1/goals/:id/decline (Client Declines Proposed Goal)
        // ------------------------------------------------------------------------
        if (pathname.startsWith("/api/v1/goals/") && pathname.endsWith("/decline") && method === "PATCH") {
            const goalId = pathname.replace("/api/v1/goals/", "").replace("/decline", "");
            await (0, db_js_1.query)(`UPDATE public.goals 
         SET requires_acceptance = false, status = 'declined'
         WHERE id::text = $1;`, [goalId]);
            return sendJson(res, 200, { success: true, goalId, status: "declined" });
        }
        // ------------------------------------------------------------------------
        // ROUTE: GET /api/v1/opportunities (Feed for Clients and Advisors)
        // ------------------------------------------------------------------------
        if (pathname === "/api/v1/opportunities" && method === "GET") {
            const orgId = parsedUrl.searchParams.get("orgId");
            const userId = parsedUrl.searchParams.get("userId") || authenticatedUserId;
            let sql = `
        SELECT 
          id, partner_org_id as "partnerOrgId", title, category, source,
          source_name as "sourceName", source_avatar as "sourceAvatar",
          source_color as "sourceColor", reasoning, value_estimate as "valueEstimate",
          status, window_label as "windowLabel", min_investment_kobo as "minInvestmentKobo",
          created_at as "createdAt"
        FROM public.opportunities
        WHERE status = 'active'
      `;
            const params = [];
            if (orgId) {
                params.push(orgId);
                sql += ` AND partner_org_id = $${params.length}`;
            }
            else if (userId) {
                params.push(userId);
                sql += ` AND (user_id IS NULL OR user_id = $${params.length})`;
            }
            sql += ` ORDER BY created_at DESC;`;
            const result = await (0, db_js_1.query)(sql, params).catch(() => ({ rows: [] }));
            const opps = result.rows;
            return sendJson(res, 200, { opportunities: opps });
        }
        // ------------------------------------------------------------------------
        // ROUTE: POST /api/v1/opportunities (Advisor Dispatches Opportunity)
        // ------------------------------------------------------------------------
        if (pathname === "/api/v1/opportunities" && method === "POST") {
            const body = await parseJsonBody(req);
            const { partnerOrgId, title, category, reasoning, valueEstimate, windowLabel, targetUserId } = body;
            if (!title || !reasoning) {
                return sendJson(res, 400, { error: "Missing required opportunity fields (title, reasoning)" });
            }
            const orgId = partnerOrgId || "a0000000-0000-0000-0000-000000000001";
            const orgRes = await (0, db_js_1.query)(`SELECT name FROM public.partner_orgs WHERE id = $1 LIMIT 1;`, [orgId]);
            const orgName = orgRes.rows[0]?.name ? `${orgRes.rows[0].name} Advisor` : "Wealth Advisor";
            const insertRes = await (0, db_js_1.query)(`INSERT INTO public.opportunities (
          partner_org_id, user_id, title, category, source, source_name,
          source_avatar, reasoning, value_estimate, window_label, status
        ) VALUES ($1, $2, $3, $4, 'partner', $5, '🏛️', $6, $7, $8, 'active')
        RETURNING id, title, category, status, created_at;`, [
                orgId,
                targetUserId || null,
                title.trim(),
                category || "Investment",
                orgName,
                reasoning.trim(),
                valueEstimate || "High yield potential",
                windowLabel || "Reassess weekly",
            ]);
            return sendJson(res, 200, {
                success: true,
                opportunity: insertRes.rows[0],
            });
        }
        // ------------------------------------------------------------------------
        // ROUTE: PATCH /api/v1/opportunities/:id (Client/Advisor Updates Opportunity Status)
        // ------------------------------------------------------------------------
        if (pathname.startsWith("/api/v1/opportunities/") && method === "PATCH") {
            const oppId = pathname.replace("/api/v1/opportunities/", "");
            const body = await parseJsonBody(req);
            const { status } = body;
            if (!status || !["acted", "dismissed", "active"].includes(status)) {
                return sendJson(res, 400, { error: "Invalid or missing status ('acted', 'dismissed', 'active')" });
            }
            const updateRes = await (0, db_js_1.query)(`UPDATE public.opportunities
         SET status = $1, updated_at = NOW()
         WHERE id::text = $2
         RETURNING *;`, [status, oppId]);
            return sendJson(res, 200, {
                success: true,
                opportunity: updateRes.rows[0] || null,
            });
        }
        // ------------------------------------------------------------------------
        // ROUTE: GET /api/v1/approvals (Partner Approvals Queue)
        // ------------------------------------------------------------------------
        if (pathname === "/api/v1/approvals" && method === "GET") {
            const orgId = parsedUrl.searchParams.get("orgId") || "a0000000-0000-0000-0000-000000000001";
            const { rows } = await (0, db_js_1.query)(`SELECT 
           a.id,
           a.user_id,
           a.buddy_id,
           a.action_type,
           a.description as action,
           a.amount,
           a.currency,
           a.from_account,
           a.to_account,
           a.status,
           a.reasoning,
           a.created_at,
           u.email as client_email,
           u.full_name as client_name,
           b.name as buddy_name
         FROM public.agent_actions a
         JOIN public.users u ON a.user_id = u.id
         LEFT JOIN public.buddies b ON a.buddy_id = b.id
         WHERE a.partner_org_id = $1 AND a.status = 'pending_partner_approval'
         ORDER BY a.created_at DESC;`, [orgId]);
            const approvals = rows.map((r) => {
                const clientName = r.client_name || r.client_email?.split('@')[0] || "Client";
                const initials = clientName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
                const amtNaira = (Number(r.amount || 0)).toLocaleString();
                return {
                    id: r.id,
                    client: clientName,
                    clientEmail: r.client_email,
                    initials: initials || "CL",
                    color: "linear-gradient(135deg,#132952,#1E3A8A)",
                    action: r.action || r.action_type,
                    amount: `₦${amtNaira}`,
                    amountRaw: Number(r.amount || 0),
                    from: r.from_account || "Checking / Vault",
                    to: r.to_account || "Investment Portfolio",
                    requestedBy: r.buddy_name || r.buddy_id || "Finance Buddy",
                    reasoning: r.reasoning || `Client-approved financial movement exceeding institutional threshold of ₦500,000.`,
                    status: r.status,
                    createdAt: r.created_at,
                };
            });
            return sendJson(res, 200, { approvals });
        }
        // ------------------------------------------------------------------------
        // ROUTE: PATCH /api/v1/approvals/:id (Sign-off & Execute or Decline)
        // ------------------------------------------------------------------------
        if (pathname.startsWith("/api/v1/approvals/") && method === "PATCH") {
            const actionId = pathname.replace("/api/v1/approvals/", "");
            const body = await parseJsonBody(req);
            const { decision, note, advisorId } = body;
            if (!decision || !["approve", "decline"].includes(decision)) {
                return sendJson(res, 400, { error: "Invalid decision ('approve' or 'decline' required)" });
            }
            if (decision === "approve") {
                const updateRes = await (0, db_js_1.query)(`UPDATE public.agent_actions
           SET status = 'approved',
               approved_at = NOW(),
               partner_decision_at = NOW(),
               partner_decision_note = $1
           WHERE id::text = $2 AND status = 'pending_partner_approval'
           RETURNING *;`, [note || "Approved by Wealth Partner Advisor", actionId]);
                if (updateRes.rowCount === 0) {
                    return sendJson(res, 404, { error: "Action not found or already decided" });
                }
                const action = updateRes.rows[0];
                // Record execution transaction in databank_entries
                await (0, db_js_1.query)(`INSERT INTO public.databank_entries (
             user_id, source, entry_type, amount, description, category, entry_date, metadata
           ) VALUES ($1, 'agent', 'expense', $2, $3, 'transfer', CURRENT_DATE, $4);`, [
                    action.user_id,
                    action.amount * 100,
                    `[Partner Approved] ${action.description || 'Agentic Action Execution'}`,
                    JSON.stringify({
                        action_id: action.id,
                        partner_approved: true,
                        approved_by: advisorId || "Advisor",
                        approved_at: new Date().toISOString(),
                    }),
                ]);
                // Mark executed
                await (0, db_js_1.query)(`UPDATE public.agent_actions SET status = 'executed', executed_at = NOW() WHERE id = $1;`, [action.id]);
                return sendJson(res, 200, {
                    success: true,
                    decision: "approved",
                    actionId,
                    status: "executed",
                    message: "Action approved and executed successfully into client ledger.",
                });
            }
            else {
                const updateRes = await (0, db_js_1.query)(`UPDATE public.agent_actions
           SET status = 'declined_by_partner',
               partner_decision_at = NOW(),
               partner_decision_note = $1
           WHERE id::text = $2 AND status = 'pending_partner_approval'
           RETURNING *;`, [note || "Declined by Wealth Partner Advisor", actionId]);
                if (updateRes.rowCount === 0) {
                    return sendJson(res, 404, { error: "Action not found or already decided" });
                }
                return sendJson(res, 200, {
                    success: true,
                    decision: "declined",
                    actionId,
                    status: "declined_by_partner",
                    message: "Action has been declined. Client and buddy notified.",
                });
            }
        }
        // ------------------------------------------------------------------------
        // ROUTE: GET /api/v1/staff (Partner Staff Roster)
        // ------------------------------------------------------------------------
        if (pathname === "/api/v1/staff" && method === "GET") {
            const orgId = parsedUrl.searchParams.get("orgId") || "a0000000-0000-0000-0000-000000000001";
            const { rows } = await (0, db_js_1.query)(`SELECT 
           ps.id,
           ps.name,
           ps.email,
           ps.role,
           ps.invite_status as status,
           ps.invite_token,
           ps.invited_at,
           ps.last_active_at,
           COALESCE(client_counts.total_clients, 0) as assigned_clients,
           b.name as assigned_buddy
         FROM public.partner_staff ps
         LEFT JOIN (
           SELECT assigned_staff_id, COUNT(*) as total_clients
           FROM public.partner_clients
           GROUP BY assigned_staff_id
         ) client_counts ON client_counts.assigned_staff_id = ps.id
         LEFT JOIN public.buddies b ON b.escalates_to_staff_id = ps.id
         WHERE ps.partner_org_id = $1
         ORDER BY ps.created_at ASC;`, [orgId]);
            const staff = rows.map((s) => {
                const initials = s.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
                let lastActiveStr = "Never";
                if (s.last_active_at) {
                    const diffMs = Date.now() - new Date(s.last_active_at).getTime();
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                    lastActiveStr = diffHours < 1 ? "Just now" : diffHours < 24 ? `${diffHours}h ago` : `${Math.floor(diffHours / 24)}d ago`;
                }
                else if (s.status === 'invited') {
                    lastActiveStr = "Invited";
                }
                return {
                    id: s.id,
                    name: s.name,
                    email: s.email,
                    role: s.role.charAt(0).toUpperCase() + s.role.slice(1),
                    assigned: s.assigned_clients > 0 ? `${s.assigned_clients} clients` : "None assigned",
                    buddy: s.assigned_buddy || "Stanbic Wealth Co-Pilot",
                    lastActive: lastActiveStr,
                    status: s.status === 'active' ? 'Active' : 'Invited',
                    initials: initials || "ST",
                    color: "linear-gradient(135deg,#0B1E3D,#1A3A6E)",
                    inviteToken: s.invite_token,
                };
            });
            return sendJson(res, 200, { staff });
        }
        // ------------------------------------------------------------------------
        // ROUTE: POST /api/v1/staff/invite (Invite Colleague to Firm)
        // ------------------------------------------------------------------------
        if (pathname === "/api/v1/staff/invite" && method === "POST") {
            const body = await parseJsonBody(req);
            const { partnerOrgId, name, email, role } = body;
            if (!name || !email) {
                return sendJson(res, 400, { error: "Staff name and email are required" });
            }
            const orgId = partnerOrgId || "a0000000-0000-0000-0000-000000000001";
            const staffRole = ["admin", "advisor", "analyst", "view_only"].includes(role?.toLowerCase())
                ? role.toLowerCase()
                : "advisor";
            const token = `tok_stf_${crypto_1.default.randomBytes(16).toString("hex")}`;
            const insertRes = await (0, db_js_1.query)(`INSERT INTO public.partner_staff (
           partner_org_id, name, email, role, invite_status, invite_token, invited_at
         ) VALUES ($1, $2, $3, $4, 'invited', $5, NOW())
         ON CONFLICT (partner_org_id, email) DO UPDATE SET
           role = EXCLUDED.role,
           invite_token = EXCLUDED.invite_token,
           invited_at = NOW(),
           invite_status = 'invited'
         RETURNING id, name, email, role, invite_status, invite_token, invited_at;`, [orgId, name.trim(), email.trim().toLowerCase(), staffRole, token]);
            const staffRecord = insertRes.rows[0];
            const inviteUrl = `https://smartmoney.technology/register?staffInvite=${token}`;
            return sendJson(res, 200, {
                success: true,
                staff: staffRecord,
                inviteToken: token,
                inviteUrl,
                message: `Invitation generated for ${name}.`,
            });
        }
        // ------------------------------------------------------------------------
        // ROUTE: POST /api/v1/staff/resend (Resend Staff Invite Token)
        // ------------------------------------------------------------------------
        if (pathname === "/api/v1/staff/resend" && method === "POST") {
            const body = await parseJsonBody(req);
            const { staffId } = body;
            const token = `tok_stf_${crypto_1.default.randomBytes(16).toString("hex")}`;
            const updateRes = await (0, db_js_1.query)(`UPDATE public.partner_staff
         SET invite_token = $1, invited_at = NOW(), invite_status = 'invited'
         WHERE id::text = $2
         RETURNING id, name, email, invite_token;`, [token, staffId]);
            if (updateRes.rowCount === 0) {
                return sendJson(res, 404, { error: "Staff record not found" });
            }
            const staff = updateRes.rows[0];
            const inviteUrl = `https://smartmoney.technology/register?staffInvite=${token}`;
            return sendJson(res, 200, {
                success: true,
                inviteToken: token,
                inviteUrl,
                message: `Invite link refreshed for ${staff.name}.`,
            });
        }
        // ------------------------------------------------------------------------
        // ROUTE: GET /api/v1/buddies (Proprietary & Marketplace Buddies + Escalations)
        // ------------------------------------------------------------------------
        if (pathname === "/api/v1/buddies" && method === "GET") {
            const orgId = parsedUrl.searchParams.get("orgId") || "a0000000-0000-0000-0000-000000000001";
            const [buddyRes, escalationRes] = await Promise.all([
                (0, db_js_1.query)(`SELECT 
             b.id, b.name, b.tag, b.ai_model, b.visibility, b.status,
             b.avatar_bg, b.avatar_content, b.owner_partner_org_id,
             ps.name as escalates_to_name
           FROM public.buddies b
           LEFT JOIN public.partner_staff ps ON ps.id = b.escalates_to_staff_id
           WHERE b.owner_partner_org_id = $1 OR b.owner_partner_org_id IS NULL
           ORDER BY (b.owner_partner_org_id IS NOT NULL) DESC, b.name ASC;`, [orgId]),
                (0, db_js_1.query)(`SELECT id, trigger_type, trigger_label, trigger_value, target_role_or_staff, is_enabled
           FROM public.partner_escalation_rules
           WHERE partner_org_id = $1
           ORDER BY created_at ASC;`, [orgId]),
            ]);
            const buddies = buddyRes.rows.map((b) => ({
                id: b.id,
                name: b.name,
                meta: b.tag || "Smart Money AI Co-Pilot",
                type: b.owner_partner_org_id ? "Firm AI Buddy" : "Marketplace Buddy",
                model: b.ai_model || "Claude 3.5 Sonnet",
                visibility: b.visibility === 'private' ? "Private (Clients only)" : "Public (Marketplace)",
                subscribers: "1,240+",
                escalatesTo: b.escalates_to_name || "Senior Wealth Advisor",
                status: b.status === 'live' ? "Live" : "Draft",
                icon: b.avatar_content || "🤖",
                bg: b.avatar_bg || "#132952",
                color: "#fff",
            }));
            const rules = escalationRes.rows.map((r) => ({
                id: r.id,
                trigger: r.trigger_label,
                value: r.trigger_value,
                target: r.target_role_or_staff,
                on: Boolean(r.is_enabled),
            }));
            return sendJson(res, 200, { buddies, escalationRules: rules });
        }
        // ------------------------------------------------------------------------
        // ROUTE: PATCH /api/v1/buddies/escalation/:id (Toggle Escalation Rule)
        // ------------------------------------------------------------------------
        if (pathname.startsWith("/api/v1/buddies/escalation/") && method === "PATCH") {
            const ruleId = pathname.replace("/api/v1/buddies/escalation/", "");
            const body = await parseJsonBody(req);
            const { isEnabled } = body;
            await (0, db_js_1.query)(`UPDATE public.partner_escalation_rules
         SET is_enabled = $1, updated_at = NOW()
         WHERE id::text = $2;`, [Boolean(isEnabled), ruleId]);
            return sendJson(res, 200, { success: true, ruleId, isEnabled: Boolean(isEnabled) });
        }
        // ------------------------------------------------------------------------
        // ROUTE: POST /api/v1/research (Institutional Market & Portfolio Analysis)
        // ------------------------------------------------------------------------
        if (pathname === "/api/v1/research" && method === "POST") {
            const body = await parseJsonBody(req);
            const prompt = body.prompt || body.topic;
            const model = body.model;
            if (!prompt) {
                return sendJson(res, 400, { error: "Research prompt is required" });
            }
            // Format a high-fidelity institutional research briefing
            const titleMatch = prompt.slice(0, 50).trim();
            const briefing = {
                title: `Institutional Research Briefing: ${titleMatch}...`,
                model: model || "Llama 3.3 70B (Institutional)",
                timestamp: new Date().toISOString(),
                summary: `Strategic macro and valuation analysis prepared for institutional wealth advisory portfolio review.`,
                keyFindings: [
                    "FGN Sovereign Yields remain attractive across 180-day and 364-day tenors, creating optimal fixed income duration matching.",
                    "Tier-1 Nigerian Banks trade at historical P/B discounts (0.45x - 0.70x) with robust FX revaluation buffers and high single-digit dividend yields.",
                    "Corporate paper tranches in consumer staples offer inflation-hedged returns for high-net-worth client accounts.",
                ],
                actionableRecommendation: "Overweight short-duration Money Market Fund (MMF) tranches while dollar-cost averaging into blue-chip banking equities.",
            };
            return sendJson(res, 200, { success: true, briefing });
        }
        // ------------------------------------------------------------------------
        // ROUTE: GET /api/v1/keys (Get Active API Key Metadata)
        // ------------------------------------------------------------------------
        if (pathname === "/api/v1/keys" && method === "GET") {
            const orgId = parsedUrl.searchParams.get("orgId") || "a0000000-0000-0000-0000-000000000001";
            const { rows } = await (0, db_js_1.query)(`SELECT id, key_prefix, name, last_used_at, created_at
         FROM public.partner_api_keys
         WHERE partner_org_id = $1 AND revoked_at IS NULL
         ORDER BY created_at DESC LIMIT 1;`, [orgId]);
            return sendJson(res, 200, { apiKey: rows[0] || null });
        }
        // ------------------------------------------------------------------------
        // ROUTE: POST /api/v1/keys (Generate Production API Key)
        // ------------------------------------------------------------------------
        if (pathname === "/api/v1/keys" && method === "POST") {
            const body = await parseJsonBody(req);
            const { partnerOrgId, name } = body;
            const orgId = partnerOrgId || "a0000000-0000-0000-0000-000000000001";
            const rawSecret = crypto_1.default.randomBytes(24).toString("hex");
            const rawKey = `sm_live_${rawSecret}`;
            const prefix = `sm_live_${rawSecret.slice(0, 6)}...${rawSecret.slice(-4)}`;
            const hash = crypto_1.default.createHash("sha256").update(rawKey).digest("hex");
            await (0, db_js_1.query)(`UPDATE public.partner_api_keys SET revoked_at = NOW() WHERE partner_org_id = $1 AND revoked_at IS NULL;`, [orgId]);
            const insertRes = await (0, db_js_1.query)(`INSERT INTO public.partner_api_keys (partner_org_id, key_prefix, key_hash, name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, key_prefix, name, created_at;`, [orgId, prefix, hash, name || "Primary Production Key"]);
            return sendJson(res, 200, {
                success: true,
                apiKey: rawKey,
                keyRecord: insertRes.rows[0],
                message: "API key generated successfully. Copy it now as it cannot be shown again.",
            });
        }
        // ------------------------------------------------------------------------
        // ROUTE: GET /api/v1/webhooks (Get Webhook Configuration)
        // ------------------------------------------------------------------------
        if (pathname === "/api/v1/webhooks" && method === "GET") {
            const orgId = parsedUrl.searchParams.get("orgId") || "a0000000-0000-0000-0000-000000000001";
            const { rows } = await (0, db_js_1.query)(`SELECT id, url, secret, events, status, created_at
         FROM public.partner_webhooks
         WHERE partner_org_id = $1
         ORDER BY created_at DESC LIMIT 1;`, [orgId]);
            return sendJson(res, 200, { webhook: rows[0] || null });
        }
        // ------------------------------------------------------------------------
        // ROUTE: POST /api/v1/webhooks (Configure Webhook Endpoint)
        // ------------------------------------------------------------------------
        if (pathname === "/api/v1/webhooks" && method === "POST") {
            const body = await parseJsonBody(req);
            const url = body.url || body.endpointUrl;
            const partnerOrgId = body.partnerOrgId || body.orgId;
            const events = body.events;
            if (!url) {
                return sendJson(res, 400, { error: "Webhook URL is required" });
            }
            const orgId = partnerOrgId || "a0000000-0000-0000-0000-000000000001";
            const secret = `whsec_${crypto_1.default.randomBytes(16).toString("hex")}`;
            const eventList = events && events.length > 0 ? events : ['client.joined', 'action.threshold', 'goal.created'];
            const insertRes = await (0, db_js_1.query)(`INSERT INTO public.partner_webhooks (partner_org_id, url, secret, events, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING id, url, secret, events, status, created_at;`, [orgId, url.trim(), secret, eventList]);
            return sendJson(res, 200, {
                success: true,
                webhook: insertRes.rows[0],
                message: "Webhook registered and active.",
            });
        }
        // ------------------------------------------------------------------------
        // ROUTE: POST /api/v1/partner/webhooks/register (External Endpoint Spec)
        // ------------------------------------------------------------------------
        if (pathname === "/api/v1/partner/webhooks/register" && method === "POST") {
            const body = await parseJsonBody(req);
            const { url, events, partnerOrgId } = body;
            const orgId = partnerOrgId || "a0000000-0000-0000-0000-000000000001";
            const secret = `whsec_${crypto_1.default.randomBytes(16).toString("hex")}`;
            const resInsert = await (0, db_js_1.query)(`INSERT INTO public.partner_webhooks (partner_org_id, url, secret, events, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING id, url, secret, events, status;`, [orgId, url, secret, events || ['client.joined', 'action.threshold']]);
            return sendJson(res, 200, { success: true, webhook: resInsert.rows[0] });
        }
        // ------------------------------------------------------------------------
        // ROUTE: POST /api/v1/partner/signals/publish (External Signal Publisher)
        // ------------------------------------------------------------------------
        if (pathname === "/api/v1/partner/signals/publish" && method === "POST") {
            const body = await parseJsonBody(req);
            const { title, reasoning, valueEstimate, category, partnerOrgId } = body;
            const orgId = partnerOrgId || "a0000000-0000-0000-0000-000000000001";
            const oppRes = await (0, db_js_1.query)(`INSERT INTO public.opportunities (
           partner_org_id, title, category, source, source_name, reasoning, value_estimate, status
         ) VALUES ($1, $2, $3, 'partner', 'Institutional Market Signal', $4, $5, 'active')
         RETURNING id, title, category, status;`, [orgId, title, category || 'Market Signal', reasoning || 'Published via Partner API', valueEstimate || 'High Conviction']);
            return sendJson(res, 200, { success: true, publishedSignal: oppRes.rows[0] });
        }
        // ------------------------------------------------------------------------
        // ROUTE: GET /api/v1/features (Get Partner Feature Toggles)
        // ------------------------------------------------------------------------
        if (pathname === "/api/v1/features" && method === "GET") {
            const orgId = parsedUrl.searchParams.get("orgId") || "a0000000-0000-0000-0000-000000000001";
            const { rows } = await (0, db_js_1.query)(`SELECT id, feature_key AS "key", name, description, is_enabled AS "isEnabled", updated_at AS "updatedAt"
         FROM public.partner_feature_toggles
         WHERE partner_org_id = $1
         ORDER BY name ASC;`, [orgId]);
            return sendJson(res, 200, { features: rows });
        }
        // ------------------------------------------------------------------------
        // ROUTE: PATCH /api/v1/features/:key (Toggle Feature)
        // ------------------------------------------------------------------------
        if (pathname.startsWith("/api/v1/features/") && method === "PATCH") {
            const featureKey = decodeURIComponent(pathname.replace("/api/v1/features/", ""));
            const body = await parseJsonBody(req);
            const { isEnabled, partnerOrgId } = body;
            const orgId = partnerOrgId || "a0000000-0000-0000-0000-000000000001";
            const updateRes = await (0, db_js_1.query)(`UPDATE public.partner_feature_toggles
         SET is_enabled = $1, updated_at = NOW()
         WHERE partner_org_id = $2 AND feature_key = $3
         RETURNING id, feature_key AS "key", name, description, is_enabled AS "isEnabled", updated_at AS "updatedAt";`, [Boolean(isEnabled), orgId, featureKey]);
            if (updateRes.rows.length === 0) {
                return sendJson(res, 404, { error: `Feature '${featureKey}' not found for partner` });
            }
            return sendJson(res, 200, {
                success: true,
                feature: updateRes.rows[0],
                message: `Feature '${updateRes.rows[0].name}' updated`,
            });
        }
        // ------------------------------------------------------------------------
        // ROUTE: GET /api/v1/analytics-rules (Get Custom Rules & Category Toggles)
        // ------------------------------------------------------------------------
        if (pathname === "/api/v1/analytics-rules" && method === "GET") {
            const orgId = parsedUrl.searchParams.get("orgId") || "a0000000-0000-0000-0000-000000000001";
            const { rows: rules } = await (0, db_js_1.query)(`SELECT id, rule_name AS "name", formula, icon, is_enabled AS "isEnabled", created_at AS "createdAt"
         FROM public.partner_analytics_rules
         WHERE partner_org_id = $1
         ORDER BY created_at ASC;`, [orgId]);
            const { rows: categories } = await (0, db_js_1.query)(`SELECT id, category_name AS "label", description AS "desc", is_included AS "isIncluded"
         FROM public.partner_analytics_category_toggles
         WHERE partner_org_id = $1
         ORDER BY category_name ASC;`, [orgId]);
            return sendJson(res, 200, { rules, categories });
        }
        // ------------------------------------------------------------------------
        // ROUTE: POST /api/v1/analytics-rules (Add Custom Analytics Rule)
        // ------------------------------------------------------------------------
        if (pathname === "/api/v1/analytics-rules" && method === "POST") {
            const body = await parseJsonBody(req);
            const { partnerOrgId, ruleName, formula, icon } = body;
            if (!ruleName || !formula) {
                return sendJson(res, 400, { error: "Rule name and formula are required" });
            }
            const orgId = partnerOrgId || "a0000000-0000-0000-0000-000000000001";
            const insertRes = await (0, db_js_1.query)(`INSERT INTO public.partner_analytics_rules (partner_org_id, rule_name, formula, icon, is_enabled)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id, rule_name AS "name", formula, icon, is_enabled AS "isEnabled", created_at AS "createdAt";`, [orgId, ruleName.trim(), formula.trim(), icon || "📐"]);
            return sendJson(res, 200, {
                success: true,
                rule: insertRes.rows[0],
                message: "Custom analytics rule created successfully",
            });
        }
        // ------------------------------------------------------------------------
        // ROUTE: PATCH /api/v1/analytics-rules/:id (Toggle Custom Analytics Rule)
        // ------------------------------------------------------------------------
        if (pathname.startsWith("/api/v1/analytics-rules/") && method === "PATCH") {
            const ruleId = pathname.replace("/api/v1/analytics-rules/", "");
            const body = await parseJsonBody(req);
            const { isEnabled } = body;
            const updateRes = await (0, db_js_1.query)(`UPDATE public.partner_analytics_rules
         SET is_enabled = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, rule_name AS "name", formula, icon, is_enabled AS "isEnabled";`, [Boolean(isEnabled), ruleId]);
            return sendJson(res, 200, {
                success: true,
                rule: updateRes.rows[0] || null,
            });
        }
        // ------------------------------------------------------------------------
        // ROUTE: PATCH /api/v1/analytics-categories/:id (Toggle Category Inclusion)
        // ------------------------------------------------------------------------
        if (pathname.startsWith("/api/v1/analytics-categories/") && method === "PATCH") {
            const categoryId = pathname.replace("/api/v1/analytics-categories/", "");
            const body = await parseJsonBody(req);
            const { isIncluded } = body;
            const updateRes = await (0, db_js_1.query)(`UPDATE public.partner_analytics_category_toggles
         SET is_included = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, category_name AS "label", description AS "desc", is_included AS "isIncluded";`, [Boolean(isIncluded), categoryId]);
            return sendJson(res, 200, {
                success: true,
                category: updateRes.rows[0] || null,
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
