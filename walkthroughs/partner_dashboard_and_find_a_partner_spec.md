# Partner Dashboard & Find a Partner — Backend Implementation Spec

**Audience:** backend developer. This is a build spec, not a retrospective walkthrough — everything described here exists today only as frontend UI with mock data. Nothing in this feature set talks to a database or an external system yet.

**Status:** live on production at [smartmoney.technology](https://smartmoney.technology) as frontend-only. Real users can browse every screen; no button does anything real yet.

---

## 1. What this covers

Three related surfaces, all built in the same effort and sharing one data model:

| Screen | Route | Who sees it | Purpose |
|---|---|---|---|
| **Partner Dashboard** | `/partner` | Staff at a partner firm (e.g. a wealth management firm) | Firm-side console: manage clients, approve agentic actions, configure what their clients can see, write goals/opportunities for clients, AI research, API access |
| **Find a Partner** | `/partners`, `/partners/[id]` | Smart Money end users (clients) | Public-ish directory of partner firms; apply to work with one |
| **Partner Data Sharing** | `/settings` (Privacy tab) | Smart Money end users who are connected to a partner | Client-side consent control — what the partner can and can't see |

Also touched: the **Goal Tracker** (`/goals`) got a second tab, **Opportunities**, which is where partner-sent (and AI-sent) opportunities surface to the client. See [§7](#7-opportunities-tab-on-goal-tracker).

## 2. How to read this doc

For every interactive element I give:
- **Now:** what it actually does today (almost always: show a "coming soon" toast via `comingSoon()` in [`src/components/partner/shared.tsx`](file:///home/ec2-user/smart-money/src/components/partner/shared.tsx), or update local React state that resets on refresh)
- **Should:** what it needs to do once wired up
- **Suggested endpoint:** a proposed shape, reusing existing conventions where one already exists

Where a real endpoint would look nearly identical to one already speced in the dashboard's own **API & Docs** panel (§3.12), I say so — build that endpoint once and use it for both the internal dashboard and the external partner API.

## 3. File map

```
src/components/partner/
  mockData.ts              ← ALL mock data. Replace with real fetches, keep the shapes as a starting contract.
  shared.tsx                ← comingSoon(), SectionHeader, Card, Toggle, StatusPill, Avatar, KpiCard — shared UI atoms
  PartnerSidebar.tsx         ← nav + PartnerTab type (13 tabs)
  PartnerProfile.tsx         ← firm profile page body + application form
  PartnerAccessControl.tsx   ← client-side consent toggles (lives in Settings)
  panels/
    OverviewPanel.tsx         AnalyticsRulesPanel.tsx
    ClientsPanel.tsx           DatabasePanel.tsx
    ApprovalsPanel.tsx         ResearchPanel.tsx
    FeatureControlPanel.tsx    GoalsPanel.tsx
    BuddiesPanel.tsx           OpportunitiesPanel.tsx  (partner-side "Send Opportunities")
    StaffPanel.tsx             ApiPanel.tsx
    OnboardingPanel.tsx

src/app/(dashboard)/partner/page.tsx        ← tab router for the 13 panels
src/app/(dashboard)/partners/page.tsx        ← directory
src/app/(dashboard)/partners/[id]/page.tsx   ← firm profile, generateStaticParams from mock PARTNER_FIRMS

src/components/opportunities/
  mockData.ts, OpportunityCard.tsx, OpportunitiesPanel.tsx   ← client-side Opportunities tab (Goal Tracker)
src/app/(dashboard)/goals/page.tsx            ← Goals/Opportunities tab switcher added here (existing Goals logic untouched)
```

## 4. Data model — what needs to exist

Nothing below exists in Postgres yet. Table names are suggestions, matching the existing `public.users`, snake_case convention seen in `src/lib/db.ts`.

```
partner_orgs
  id, name, type (Wealth Management | Investment Advisory | ...), icon, banner_style,
  description, tags[], min_portfolio, is_public (listed on /partners), created_at

partner_staff
  id, partner_org_id → partner_orgs, name, email, role (admin|advisor|analyst|view_only),
  invite_status (active|invited), invited_at, last_active_at
  -- see §5 for whether this is its own login system or reuses `users`

partner_clients
  id, partner_org_id → partner_orgs, user_id → users, assigned_staff_id → partner_staff (nullable),
  status (active|needs_attention), advisor_notes (text, private — never exposed to client), joined_at

partner_client_scopes            -- THE consent table. One row per (client, partner, scope).
  user_id → users, partner_org_id → partner_orgs, scope (transactions|networth|goals|chat|actions),
  enabled (bool), updated_at
  -- mirrors MY_PARTNER_SCOPES in mockData.ts — see §8, this is the enforcement point

partner_applications              -- from the Find a Partner "Apply to Join" form
  id, partner_org_id, user_id, full_name, phone, income_range, goals_text,
  status (pending|docs_missing|approved|declined), created_at

partner_feature_toggles           -- per-partner override of what their clients can see app-wide
  partner_org_id, feature_key, enabled

partner_escalation_rules
  id, partner_org_id, trigger_type (topic_contains|action_above|sentiment), trigger_value,
  target_type (human|ai_buddy|approval_queue), target_ref, enabled

partner_analytics_rules
  id, partner_org_id, rule_key, formula_text, enabled
partner_analytics_category_toggles
  partner_org_id, category_key, enabled

partner_goals                     -- extends the existing `goals` table, doesn't replace it
  -- add nullable columns to goals: origin ('user'|'ai'|'partner'), origin_partner_org_id,
  --   advisor_note, requires_acceptance (bool), accepted_at
  -- see §7, same pattern applies to a new `opportunities` table

opportunities                     -- new table, backs the Goal Tracker's Opportunities tab
  id, user_id → users, title, category, source ('ai'|'partner'), source_ref (buddy_id or partner_org_id),
  reasoning, value_estimate_text, status ('active'|'acted'|'dismissed'|'missed'), window_closes_at, created_at

partner_byod_connections          -- roadmap, see §3.9 — do not build the actual connection yet
partner_api_keys
  id, partner_org_id, key_hash, created_at, last_used_at, revoked_at
```

## 5. Open decision: who is a "partner staff" user?

This is the one thing worth deciding **before** writing any backend code, because it changes the shape of everything else.

`STAFF` in the mock data (`muyiwa@stanbicwealth.com`, etc.) are clearly a different population from Smart Money end users — they log into `/partner`, never see `/marketplace` or `/chat` as a client would. Two ways to build this:

1. **Same `users` table**, with `is_partner_staff: boolean` + `partner_org_id` + `partner_role` columns — mirrors the existing `is_admin` pattern exactly (`src/lib/db.ts:isAdmin`, checked per-route like `src/app/api/admin/*/route.ts` does with `if (!user.is_admin)`). Simplest, reuses the existing session/cookie auth wholesale.
2. **Separate `partner_staff` identity/login**, own session cookie, own login page (`/partner/login`). More correct long-term (a firm's compliance officer should not be a "Smart Money user" in any sense), more work now.

I'd default to **option 1** for v1 — it's a straight copy of how `/admin` already works in this codebase, ships fast, and can be split out later without changing the frontend contract (the frontend only needs "am I partner staff, and for which org").

## 6. Screen-by-screen: Partner Dashboard (`/partner`)

Route gating needed on **every** `/api/partner/*` route (mirror `src/app/api/admin/*`): reject unless `user.is_partner_staff` (or `partner_staff` session, per §5) and scope every query to that user's `partner_org_id`. Also gate the `/partner` page itself — right now it's reachable by any logged-in user.

### 3.1 Overview (`overview`) — `OverviewPanel.tsx`

| Element | Now | Should |
|---|---|---|
| KPI cards (Total Clients, Avg Health Score, Total AUM, Pending Approvals) | Static from `OVERVIEW_KPIS` | `GET /api/partner/overview` — aggregate from `partner_clients` + existing health-score/net-worth logic already used in DataBank analytics |
| "Clients Needing Attention" list | Static from `CLIENTS_NEEDING_ATTENTION` | Same aggregation query DataBank already runs per-user, applied across `partner_clients` for this org, filtered to a "needs attention" heuristic (savings rate drop, goal deadline approaching with low funding, etc.) |
| "View →" / "Schedule Call →" buttons | `onNavigate("clients")` (real nav) | Fine as-is; "Schedule Call" should eventually deep-link into the specific client row |
| "View All Clients" / "+ New Buddy" (header) | Real nav to `clients` / `buddies` tabs | No change needed |
| "Configure" (Scheduled Reports) | `comingSoon()` | New feature: scheduled report generation + email delivery. Reuses the AWS SES setup from `walkthroughs/aws_ses_sdk_setup.md`. Needs a `partner_scheduled_reports` table + a cron (see `/api/cron/gmail-sync` for the existing cron pattern) |

### 3.2 Clients (`clients`) — `ClientsPanel.tsx`

| Element | Now | Should |
|---|---|---|
| Client table | Static `CLIENTS` array | `GET /api/partner/clients?status=&health_score_min=` — matches the `GET /clients` shape already speced in API & Docs (§3.12) |
| Search box | Not wired | Server-side filter on the same endpoint, or client-side filter if client list stays small |
| "+ Invite Client" | `comingSoon()` | Generates an invite (email or link) that, when accepted, creates a `partner_clients` row + prompts the user for `partner_client_scopes` consent (§8) |
| "View" (row) | Opens local detail panel, real data | Keep the client-side expand; just source it from the real row |
| "Join Chat" | `comingSoon()` | Needs a real mechanism for a partner staff member to be added as a participant to a client's chat session — same feature the "Invite a Partner to This Chat" CTA on `/partners` needs (§4). One backend feature, two entry points. |
| "Write Goal" | `comingSoon()` | Same endpoint as the Goals panel (§3.11) |
| "Save Note" (Advisor Notes textarea) | `comingSoon()` | `PATCH /api/partner/clients/{id}/notes` — **must never be readable by the client**, this is explicitly partner-private in the UI copy |

### 3.3 Approvals (`approvals`) — `ApprovalsPanel.tsx`

This is the partner-side view into the **existing** Agentic Actions system (`src/app/api/agent/*`) — don't build a parallel system, extend that one.

| Element | Now | Should |
|---|---|---|
| Approval threshold banner (₦500,000) | Static text | Read from a real `partner_orgs.approval_threshold_kobo` setting, editable from Feature Control (§3.4 — not currently a control there, needs adding) |
| List of pending actions | Static `APPROVALS` array | The existing agent-action-pending logic (`src/app/api/agent/pending`), filtered to actions from clients in this partner's org that are above the org's threshold |
| "✓ Approve & Execute" | `comingSoon()` | Should call the **same execution path** `src/app/api/agent/execute` already uses — this panel is just adding a partner-approval gate in front of it. `PATCH /api/agent-actions/{id}/approve` (matches API & Docs §3.12) |
| "Decline" | `comingSoon()` | `PATCH .../approve` with `decision: "decline"` — client and buddy get notified (existing notification patterns in `src/app/api/notifications`) |
| "💬 Join Client Chat" | `comingSoon()` | Same "join chat" feature as §3.2 |

### 3.4 Feature Control (`features`) — `FeatureControlPanel.tsx`

| Element | Now | Should |
|---|---|---|
| Every toggle (11 features) | Local-only `Toggle`, resets on refresh | `PATCH /api/partner/features/{key}` writing to `partner_feature_toggles`. **Every client-facing screen in the app then needs to check this** for clients who belong to a partner — e.g. if a partner turns off "AI Studio (Creator)", `/creator` should redirect or hide the nav item for that partner's clients. This is the highest-blast-radius item in the whole spec — it touches nearly every existing screen's access logic, not just this panel. Recommend building this last, after the read-only/narrower panels are done, and auditing every `NAV_TOOLS`-equivalent gate in the app before flipping it on. |

### 3.5 AI Buddies (`buddies`) — `BuddiesPanel.tsx`

| Element | Now | Should |
|---|---|---|
| Buddy table | Static `PARTNER_BUDDIES` | Filter the existing `buddies` table (already used by Studio/Marketplace) by `owner_partner_org_id`, add that column |
| "+ Create in AI Studio" | `comingSoon()` | Should just deep-link to `/studio` with a `?partner_org_id=` param so a saved buddy gets attributed to the org — Studio itself needs no new backend, just this attribution field on save |
| "Edit" (row) | `comingSoon()` | Opens Studio in edit mode for that buddy |
| Escalation Rules toggles / "+ Add Rule" | `comingSoon()` | `partner_escalation_rules` table (§4). The actual escalation *logic* (checking a conversation against these rules and routing to a human) lives in the chat pipeline (`src/lib/ai.ts` / `src/app/api/chat/*`), not this panel — this panel is just CRUD on the rule config |

### 3.6 Staff & Roles (`staff`) — `StaffPanel.tsx`

Depends on the §5 decision.

| Element | Now | Should |
|---|---|---|
| Role permission cards | Static `ROLE_DEFS` | Static/config is fine — these are fixed role definitions, not per-org data |
| Staff table | Static `STAFF` | `GET /api/partner/staff` |
| "Copy Invite Link" | `comingSoon()` | Generate a signed, expiring invite token: `partners.smartmoney.ng/{org-slug}/join-staff?token=...` |
| "+ Invite via Email" | `comingSoon()` | Send via SES (existing `src/lib/email.ts`), create `partner_staff` row with `invite_status: 'invited'` |
| "Edit" / "Resend" (row) | `comingSoon()` | Edit role/assignment; resend re-sends the SES email |

### 3.7 Client Onboarding (`onboarding`) — `OnboardingPanel.tsx`

This configures the form a *prospective* client fills out — related to, but distinct from, the Find a Partner application form (§4), which is simpler. Decide whether these should actually be the same form (recommended — see §9 open questions).

| Element | Now | Should |
|---|---|---|
| Form field list, "+ Add Field" | Static `ONBOARDING_FIELDS` | Needs a real form-builder data model if custom fields per partner are truly wanted — `partner_onboarding_fields (partner_org_id, field_type, label, required, sort_order)`. This is real scope; confirm it's wanted before building (see §9) |
| Legal docs list, "+ Upload" | Static `ONBOARDING_DOCS` | File upload → S3 (there's already an upload pattern in `src/app/api/databank/upload`), metadata in `partner_onboarding_docs` |
| Pending Applications, "Approve" / "Review Docs" / "Decline" / "Send Reminder" | Static `PENDING_APPLICATIONS`, `comingSoon()` | Acts on `partner_applications` rows (§4) |
| "Preview Form" | `comingSoon()` | Client-side render of the configured fields, no backend needed beyond reading the config |
| "Publish Changes" | `comingSoon()` | Just persists the field/doc config — no separate "draft vs published" state exists yet, needs one if that distinction matters |
| Client Invite Links "Copy" | `comingSoon()` | Same invite-link mechanism as §3.6, different token type |

### 3.8 Analytics Rules (`analytics-cfg`) — `AnalyticsRulesPanel.tsx`

| Element | Now | Should |
|---|---|---|
| Custom rule toggles, "+ Add Custom Rule" | Static `CUSTOM_ANALYTICS_RULES` | `partner_analytics_rules`. **Important:** the formulas shown (net worth calc, savings rate, health score weighting) are currently **hardcoded in the DataBank analytics engine**, not parameterized. Making these real means the analytics engine needs to accept a per-partner formula override — this is a meaningful engine change, not just a CRUD panel. Scope carefully. |
| Category toggles (Include Pension, etc.) | Static `ANALYTICS_CATEGORY_TOGGLES` | Same caveat — these need to actually change what the analytics engine includes/excludes for that partner's clients |

### 3.9 Database / BYOD (`database`) — `DatabasePanel.tsx`

**Deliberately not real.** The panel copy was rewritten during the frontend build specifically to say this is a roadmap item ("Full data residency options... are on the roadmap — this panel shows what that configuration will look like"), not a working feature. Do not build actual external-database connectivity from this panel without a separate conversation — it implies letting a partner firm pull live client financial data into their own Postgres instance, which is a real security/compliance surface (credential storage, query scoping, audit logging) that needs its own design pass.

| Element | Now | Should (if/when this is greenlit) |
|---|---|---|
| "+ Connect Database", "Test Connection", "View Logs", "Disconnect" | All `comingSoon()` | Leave as coming-soon until there's an explicit decision to build BYOD |

### 3.10 AI Research (`research`) — `ResearchPanel.tsx`

| Element | Now | Should |
|---|---|---|
| Model selector | Local state only | Fine to keep client-side; just needs to be passed to the real call |
| Prompt textarea + quick-prompt buttons | Local state, quick-prompts fill the textarea (already works) | No backend needed for this part |
| "Run Research →" | `comingSoon()` | Route through `src/lib/ai.ts` (per `CLAUDE.md`: *all* AI calls must go through this file, never called directly) — likely a new exported function, e.g. `runPartnerResearch(model, prompt)`. Deliberately built to show **no fabricated output** so far — don't add a canned/fake response, wire the real call or leave it as coming-soon |

### 3.11 Write Client Goals (`goals-cfg`) — `GoalsPanel.tsx`

| Element | Now | Should |
|---|---|---|
| Client / Buddy selects, title, amount, date, advisor note fields | Local form state | Standard controlled form, no change needed |
| "Publish Goal to Client →" | `comingSoon()` | `POST /api/goals` (existing endpoint — `src/app/api/goals/route.ts`) extended with `origin: 'partner'`, `origin_partner_org_id`, `advisor_note`, `require_acceptance: true`. The existing Goal Tracker UI (`src/app/(dashboard)/goals/page.tsx`) will need a small addition to show partner attribution and an accept/decline affordance for goals with `require_acceptance` — matches the `GOALS_WRITTEN` mock's "Pending accept" status |
| "Goals Written This Month" list | Static `GOALS_WRITTEN` | `GET /api/partner/goals?period=this_month` |

### 3.12 API & Docs (`api`) — `ApiPanel.tsx`

This panel is simultaneously **documentation** and a **spec you can build directly from** — `API_ENDPOINTS` in `mockData.ts` already defines 6 endpoints with params and (for one) an example response, written to be a real contract, not filler copy.

| Element | Now | Should |
|---|---|---|
| "Generate API Key" (both buttons) | `comingSoon()` | Generate a key, store `sha256(key)` in `partner_api_keys`, show the raw key **once**. Standard pattern. |
| "Full Docs ↗" | `comingSoon()` | Either a real external docs site, or just make this panel itself the docs (it's already written like one) |
| Endpoint accordion rows | Static, already fully speced (method, path, params, one example response) | Build these 6 as real authenticated endpoints (Bearer token = the generated API key, scoped to `partner_org_id`): `GET /clients`, `GET /clients/{id}/analytics`, `POST /clients/{id}/goals`, `POST /signals/publish`, `PATCH /agent-actions/{id}/approve`, `POST /webhooks/register`. Several of these are the *external* form of endpoints other panels need *internally* (`POST /clients/{id}/goals` ≈ §3.11's publish button, `PATCH /agent-actions/{id}/approve` ≈ §3.3's approve button) — build one service layer, expose it two ways (session-auth for the dashboard UI, API-key-auth for this external surface) |

### 3.13 Send Opportunities (`opportunities-cfg`) — partner-side `OpportunitiesPanel.tsx`

Newest panel, mirrors §3.11's Goals panel exactly, one field different (expiry window instead of a target date).

| Element | Now | Should |
|---|---|---|
| Client select, Title, Category, Reasoning, Value Estimate, Window Closes fields | Local form state | Standard controlled form |
| "Send Opportunity →" | `comingSoon()` | `POST /api/opportunities` (new endpoint, new `opportunities` table — §4), `source: 'partner'`, `source_ref: partner_org_id`. Surfaces in the client's Opportunities tab (§7) |
| "Opportunities Sent" list | Static `OPPORTUNITIES_SENT` | `GET /api/partner/opportunities-sent` |

## 7. Opportunities tab on Goal Tracker

`src/app/(dashboard)/goals/page.tsx` now has a **Goals** / **Opportunities** tab switcher. Goals' existing logic (`/api/goals/list`, `/api/goals/[id]`, `/api/goals/milestone`) is completely untouched — do not need to re-read that part, it already works. The new tab (`src/components/opportunities/`) is 100% mock right now.

| Element | Now | Should |
|---|---|---|
| Stat cards (Active / Acted On / Missed / Total Surfaced) | Computed client-side from static `OPPORTUNITIES` array | `GET /api/opportunities?user_id=me` then compute client-side, or have the endpoint return the aggregate too |
| Opportunity cards — "Discuss with Buddy" | Real nav to `/chat` (already works) | No change |
| "⚡ Act on This" | `comingSoon()` | This is the biggest open design question in the whole feature — "acting" on an opportunity could mean wildly different things per opportunity (moving money via Agentic Actions, just marking it read, opening a specific flow). Recommend scoping this per `category` rather than building one generic handler — see §9 |
| "Remind Me Later" | `comingSoon()` | Simple: schedule a re-surface (bump `status` back to active at a later time, or a notification) |
| "Not Interested" | `comingSoon()` | `PATCH /api/opportunities/{id}` → `status: 'dismissed'` |
| **Where opportunities come from** | Static array, 5 hand-written examples (mix of `source: 'ai'` and `source: 'partner'`) | Two producers feed the same table: (1) partner staff via §3.13, (2) AI-detected — this needs a decision on which existing signal (the DataBank signal/alert system already referenced in `src/app/api/signals/*`, or a new AI pass) generates the `source: 'ai'` rows. The `op-3` mock example (missed Ikoyi property) deliberately reuses the DataBank signal-alert pattern as a hint that `/api/signals/*` is the natural producer for AI-sourced opportunities |

## 8. Partner Data Sharing (consent) — `/settings` → Privacy tab

`PartnerAccessControl.tsx`, inserted into the existing `PrivacyTab` in `src/app/(dashboard)/settings/page.tsx`, right before the Gmail integration row.

| Element | Now | Should |
|---|---|---|
| Per-scope toggles (Transactions, Net Worth, Goals, Chat, Actions) | Local state, `MY_PARTNER_SCOPES` mock, shows a success toast but doesn't persist | `PATCH /api/settings/partner-access/{scope}` → writes to `partner_client_scopes` (§4) |
| "Revoke All Access" | `popup.danger()` confirmation (real UI pattern) → sets all local toggles off | Same endpoint, bulk — plus **cancel any pending approval-queue items** for that client at that partner (mentioned in the confirmation copy: *"any pending action approvals will be cancelled"*) |
| Empty state ("not connected to a partner yet") | `hasPartner` is hardcoded `true` in the component | Needs a real check — `GET /api/settings/partner-access` returning `null`/empty if the user has no `partner_clients` row |

**This is the enforcement point for the whole feature.** Every partner-facing read of client data — the Clients panel, the Approvals panel, the external API's `GET /clients/{id}/analytics` — must intersect its query against `partner_client_scopes` for that (client, partner) pair, not just check "is this a client of this partner." A partner whose client turned off "Chat History" must get that field omitted or 403'd, not silently returned.

## 9. Open questions worth resolving with John before backend work starts

1. **Partner staff identity** (§5) — same `users` table with a flag, or fully separate login system?
2. **Onboarding form vs. Find-a-Partner application form** (§3.7) — currently two separate, differently-shaped forms for what's conceptually the same "become a client of this firm" action. Worth unifying?
3. **"Act on This" for opportunities** (§7) — needs per-category scoping, not one generic handler. Which categories launch first?
4. **BYOD** (§3.9) — confirm this stays roadmap-only; if/when it's greenlit it needs its own security design pass, not just wiring up the existing panel.
5. **Analytics Rules** (§3.8) — confirm the DataBank analytics engine should actually become per-partner-configurable (real engine change) vs. this panel staying illustrative for longer.
6. **Feature Control blast radius** (§3.4) — every existing screen's access gating needs auditing before this panel's toggles do anything real. Worth a dedicated pass/checklist rather than wiring it alongside the others.

## 10. Suggested build order

Roughly least-to-most architecturally invasive:

1. Data model (§4) + partner-staff auth gate (§5) — foundation everything else needs
2. Partner Data Sharing consent (§8) — the enforcement point, needed before any panel reads real client data
3. Clients panel (§3.2) + Overview (§3.1) — read-mostly, proves the data model out
4. Find a Partner directory + application (§3.7-adjacent, this doc's §4 in the original brief — directory/profile/apply flow)
5. Goals panel (§3.11) + Opportunities (§3.13, §7) — both extend the existing `goals`-style pattern
6. Approvals (§3.3) — extends the existing Agentic Actions system
7. Staff & Roles (§3.6), Onboarding (§3.7), Buddies (§3.5), AI Research (§3.10)
8. API & Docs external surface (§3.12) — once the internal endpoints exist, exposing them externally is mostly auth + docs
9. Feature Control (§3.4) and Analytics Rules (§3.8) — highest blast radius, do last, with the audits from §9 done first
10. BYOD (§3.9) — only if/when separately greenlit

---

*Everything in this doc was built frontend-only, deliberately, per explicit direction to keep this effort scoped to UI while a backend developer was engaged separately. See `git log` for `feat: partner dashboard` / `Add Opportunities to Goal Tracker` commits for the exact diffs this spec describes.*
