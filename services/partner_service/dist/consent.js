"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_CONSENT_SCOPES = void 0;
exports.getClientConsentScopes = getClientConsentScopes;
exports.hasClientConsent = hasClientConsent;
exports.sanitizeClientPayload = sanitizeClientPayload;
const db_js_1 = require("./db.js");
exports.ALL_CONSENT_SCOPES = [
    "transactions",
    "networth",
    "goals",
    "chat",
    "actions",
];
async function getClientConsentScopes(partnerOrgId, clientId) {
    const consentMap = {
        transactions: false,
        networth: false,
        goals: false,
        chat: false,
        actions: false,
    };
    try {
        const res = await (0, db_js_1.query)(`SELECT scope, enabled 
       FROM public.partner_client_scopes 
       WHERE partner_org_id = $1 AND user_id = $2;`, [partnerOrgId, clientId]);
        for (const row of res.rows) {
            if (row.scope in consentMap) {
                consentMap[row.scope] = Boolean(row.enabled);
            }
        }
    }
    catch (error) {
        console.error("[getClientConsentScopes] Error:", error);
    }
    return consentMap;
}
async function hasClientConsent(partnerOrgId, clientId, scope) {
    const scopes = await getClientConsentScopes(partnerOrgId, clientId);
    return Boolean(scopes[scope]);
}
async function sanitizeClientPayload(partnerOrgId, clientId, payload) {
    const scopes = await getClientConsentScopes(partnerOrgId, clientId);
    const sanitized = { ...payload };
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
