# Partner Dashboard & Find a Partner — Phase & Task Implementation Tracker

> **Document Status**: Active Implementation Roadmap  
> **Source Specification**: [`walkthroughs/partner_dashboard_and_find_a_partner_spec.md`](file:///home/ec2-user/smart-money/walkthroughs/partner_dashboard_and_find_a_partner_spec.md)  
> **Decoupled Architecture**: [`walkthroughs/partner_decoupled_architecture.md`](file:///home/ec2-user/smart-money/walkthroughs/partner_decoupled_architecture.md)  
> **Current State**: Phase 1 & 2 Complete. Monorepo architecture operational (`apps/web`, `services/partner_service`, `services/transaction_syncer`). Decoupled Partner microservice running on port 8001 under PM2. Moving into Phase 3 (Partner Overview & Clients Roster).


---

## 📊 Master Implementation Status Table

| Phase | Task ID | Task Description | Scope / Target Files | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Phase 0: UI & Mockups** | `T0.1` | Partner Dashboard 13 UI Panels | `src/components/partner/panels/*` | ✅ Done |
| | `T0.2` | Find a Partner Directory & Profile UI | `src/app/(dashboard)/partners/*` | ✅ Done |
| | `T0.3` | Partner Data Sharing Settings UI | `src/components/partner/PartnerAccessControl.tsx` | ✅ Done |
| | `T0.4` | Goal Tracker Opportunities Tab UI | `src/components/opportunities/*` | ✅ Done |
| **Phase 1: Foundation** | `T1.1` | Postgres Database Schema Migration | `scripts/migrations/001_partner_foundation.sql`, DB | ✅ Done |
| | `T1.2` | Partner Staff Auth & Middleware Guard | `src/lib/partner-auth.ts`, `src/middleware.ts` | ✅ Done |
| | `T1.3` | Client Consent Enforcement Interceptor | `src/lib/partner-consent.ts` | ✅ Done |
| **Phase 2: Client Discovery & Privacy** | `T2.1` | Partner Directory & Profile API | `src/app/api/partners/route.ts` | ✅ Done |
| | `T2.2` | Inbound Application Intake Form & API | `src/app/api/partners/[id]/apply/route.ts` | ✅ Done |
| | `T2.3` | Client Privacy Consent Endpoints | `src/app/api/settings/partner-access/route.ts` | ✅ Done |
| **Phase 3: Partner Overview & Clients** | `T3.1` | Partner Overview Metrics API | `src/app/api/partner/overview/route.ts` | ⬜ Pending |
| | `T3.2` | Clients Roster & Profile Deep-Dive API | `src/app/api/partner/clients/route.ts` | ⬜ Pending |
| | `T3.3` | Private Advisor Notes Engine | `src/app/api/partner/clients/[id]/notes/route.ts` | ⬜ Pending |
| | `T3.4` | Client Onboarding & Invite Email Flow | `src/app/api/partner/clients/invite/route.ts` | ⬜ Pending |
| **Phase 4: Goals & Opportunities** | `T4.1` | Partner Goal Origin & Acceptance Backend | `src/app/api/partner/goals/route.ts`, `goals` table | ⬜ Pending |
| | `T4.2` | Client Goal Acceptance & Partner Badge UI | `src/app/(dashboard)/goals/page.tsx` | ⬜ Pending |
| | `T4.3` | Opportunities Data Model & Partner Dispatch | `src/app/api/partner/opportunities/route.ts` | ⬜ Pending |
| | `T4.4` | Client-Side Opportunities Ingestion & Actions | `src/app/api/opportunities/route.ts` | ⬜ Pending |
| **Phase 5: Approvals & Execution Bridge** | `T5.1` | Agentic Action Threshold Interceptor | `src/lib/agent-runner.ts`, `agent_actions` table | ⬜ Pending |
| | `T5.2` | Partner Approvals Queue Endpoint | `src/app/api/partner/approvals/route.ts` | ⬜ Pending |
| | `T5.3` | Sign-off & Execute / Decline Bridge | `src/app/api/partner/approvals/[id]/route.ts` | ⬜ Pending |
| **Phase 6: Staff & AI Tools** | `T6.1` | Staff Roster & Role Permissions | `src/app/api/partner/staff/route.ts` | ⬜ Pending |
| | `T6.2` | Staff SES Email Invitations | `src/app/api/partner/staff/invite/route.ts` | ⬜ Pending |
| | `T6.3` | Partner AI Buddy Affiliation & Escalation | `src/app/api/partner/buddies/route.ts` | ⬜ Pending |
| | `T6.4` | Institutional AI Research Endpoint | `src/app/api/partner/research/route.ts`, `src/lib/ai.ts` | ⬜ Pending |
| **Phase 7: External Partner API** | `T7.1` | API Key Issuance & SHA-256 Hashing | `src/app/api/partner/keys/route.ts` | ⬜ Pending |
| | `T7.2` | Bearer-Authenticated External Partner Endpoints | `src/app/api/v1/partner/*` | ⬜ Pending |
| | `T7.3` | Webhook Registration Engine | `src/app/api/v1/partner/webhooks/register/route.ts`| ⬜ Pending |
| **Phase 8: Policy Engine & Final Polish** | `T8.1` | Client Feature Control Gating Engine | `src/app/api/partner/features/route.ts` | ⬜ Pending |
| | `T8.2` | Per-Partner Analytics Calculation Rules | `src/app/api/partner/analytics-rules/route.ts` | ⬜ Pending |
| | `T8.3` | Multi-Tenant Data Isolation Audit | E2E Security Tests | ⬜ Pending |

---

## Detailed Phase Breakdown

### Phase 0: Frontend UI & Screen Prototypes
*Status: Complete (100%)*
- [x] **`T0.1` Partner Dashboard 13 UI Panels**: Built in `src/components/partner/panels/` covering Overview, Clients, Approvals, Features, Buddies, Staff, Onboarding, Analytics, Database (BYOD), Research, Goals, API, and Opportunities.
- [x] **`T0.2` Find a Partner Directory**: Built in `src/app/(dashboard)/partners/` and `src/app/(dashboard)/partners/[id]/`.
- [x] **`T0.3` Partner Data Sharing UI**: Built in `src/components/partner/PartnerAccessControl.tsx` for `/settings` Privacy tab.
- [x] **`T0.4` Goal Tracker Opportunities Tab**: Built in `src/components/opportunities/` on `/goals`.

---

### Phase 1: Foundation — Data Architecture & Consent Engine
*Status: Complete (100%)*
* **Objective**: Create the core Postgres relational schema, implement partner staff authentication gating, and build the client-consent check layer.

- [x] **`T1.1` Postgres Database Schema Migration**
  - Create `partner_orgs` table.
  - Create `partner_staff` table.
  - Create `partner_clients` table.
  - Create `partner_client_scopes` table (scopes: `transactions`, `networth`, `goals`, `chat`, `actions`).
  - Add `is_partner_staff: boolean` and `partner_org_id: uuid` to `public.users`.
- [x] **`T1.2` Partner Staff Auth & Middleware Guard**
  - Implement `requirePartnerStaff(req)` session validator.
  - **Strict Admin Assignment Rule**: Users can ONLY access `/partner` if an Administrator explicitly promotes them to `is_partner_staff` via the Admin Console (`/admin/users`).
  - Added "Partner Portal Access" assignment controls and firm selection in Admin User Management (`/admin/users`).
  - Guard `/partner` frontend route and all `/api/partner/*` routes.

- [x] **`T1.3` Client Consent Enforcement Interceptor**
  - Build `enforceClientConsent(partnerOrgId, clientId, requiredScope)` in `src/lib/partner-consent.ts`.
  - Ensure unconsented data is omitted or rejected with 403.

---

### Phase 2: Client Discovery & Consent Control
*Status: Complete (100%)*
* **Objective**: Allow end users to browse partner firms, apply, and configure data permissions.

- [x] **`T2.1` Partner Directory & Profile API**
  - `GET /api/partners`: List public partner organizations.
  - `GET /api/partners/[id]`: Detailed firm profile and advisor stats.
  - Wire `/partners` and `/partners/[id]` to live database.
- [x] **`T2.2` Inbound Application Intake Form & API**
  - Create `partner_applications` table.
  - `POST /api/partners/[id]/apply`: Save applicant name, phone, income range, goals.
  - Connect application modal in `src/components/partner/PartnerProfile.tsx`.
- [x] **`T2.3` Client Privacy Consent Endpoints**
  - `GET /api/settings/partner-access`: Return active partner and toggle status.
  - `PATCH /api/settings/partner-access`: Toggle individual scope.
  - `POST /api/settings/partner-access/revoke`: Bulk revocation and pending approval cancellation.
  - Connect `PartnerAccessControl.tsx` in `/settings`.


---

### Phase 3: Core Partner Portal — Overview & Client Management
*Status: Pending*
* **Objective**: Enable partner advisors to inspect client rosters, monitor KPIs, and record private advisor notes.

- [ ] **`T3.1` Partner Overview Metrics API**
  - `GET /api/partner/overview`: Compute Total Clients, Average Health Score, Total AUM, and Pending Approvals.
  - Heuristic query for "Clients Needing Attention" (savings drop, funding deficit).
  - Wire `OverviewPanel.tsx`.
- [ ] **`T3.2` Clients Roster & Profile Deep-Dive API**
  - `GET /api/partner/clients`: Filtered roster by status and health score.
  - `GET /api/partner/clients/[id]`: Retrieve client metrics filtered through `partner_client_scopes`.
  - Wire `ClientsPanel.tsx`.
- [ ] **`T3.3` Private Advisor Notes Engine**
  - `PATCH /api/partner/clients/[id]/notes`: Update `advisor_notes` in `partner_clients`.
  - Guard strictly against exposing this field to client-facing APIs.
  - Wire "Save Note" in `ClientsPanel.tsx`.
- [ ] **`T3.4` Client Onboarding & Invite Email Flow**
  - `POST /api/partner/clients/invite`: Send invitation email via AWS SES (`src/lib/email.ts`).

---

### Phase 4: Client Engagements — Goals & Opportunities Engine
*Status: Pending*
* **Objective**: Empower advisors to publish financial goals to clients and launch the bilateral Opportunities feed.

- [ ] **`T4.1` Partner Goal Origin & Acceptance Backend**
  - Add `origin`, `origin_partner_org_id`, `advisor_note`, `requires_acceptance`, `accepted_at` to `public.goals`.
  - `POST /api/partner/goals`: Create partner-suggested goal.
  - Wire `GoalsPanel.tsx`.
- [ ] **`T4.2` Client Goal Acceptance & Partner Badge UI**
  - Render "Proposed by [Partner]" tag in `src/app/(dashboard)/goals/page.tsx`.
  - Allow client to Accept or Decline suggested goals.
- [ ] **`T4.3` Opportunities Data Model & Partner Dispatch**
  - Create `public.opportunities` table.
  - `POST /api/partner/opportunities`: Create opportunity with deadline window and value estimate.
  - Wire `OpportunitiesPanel.tsx`.
- [ ] **`T4.4` Client-Side Opportunities Ingestion & Actions**
  - `GET /api/opportunities`: Active opportunities for authenticated client.
  - `PATCH /api/opportunities/[id]`: Status updates (`acted`, `dismissed`).
  - Wire action buttons in `src/components/opportunities/OpportunityCard.tsx`.

---

### Phase 5: Approvals Queue & Agentic Actions Bridge
*Status: Pending*
* **Objective**: Integrate with existing Agentic Actions engine (`src/app/api/agent/*`) to enforce partner threshold approvals.

- [ ] **`T5.1` Agentic Action Threshold Interceptor**
  - Check transaction value against `partner_orgs.approval_threshold_kobo`.
  - Transition qualifying actions to `pending_partner_approval`.
- [ ] **`T5.2` Partner Approvals Queue Endpoint**
  - `GET /api/partner/approvals`: List pending actions with AI reasoning and details.
  - Wire `ApprovalsPanel.tsx`.
- [ ] **`T5.3` Sign-off & Execute / Decline Bridge**
  - `PATCH /api/partner/approvals/[id]`:
    - On Approve: Hand off to `src/app/api/agent/execute`.
    - On Decline: Reject with notification back to client and buddy.
  - Wire "✓ Approve & Execute" and "Decline" in `ApprovalsPanel.tsx`.

---

### Phase 6: Partner Staff & AI Tools
*Status: Pending*
* **Objective**: Manage internal firm colleagues, proprietary firm AI buddies, and institutional research.

- [ ] **`T6.1` Staff Roster & Role Permissions**
  - `GET /api/partner/staff`: Staff list with roles (`admin`, `advisor`, `analyst`, `view_only`).
  - Wire `StaffPanel.tsx`.
- [ ] **`T6.2` Staff SES Email Invitations**
  - `POST /api/partner/staff/invite`: Generate expiring invite token and dispatch email via AWS SES.
- [ ] **`T6.3` Partner AI Buddy Affiliation & Escalation**
  - Add `owner_partner_org_id` to `public.buddies`.
  - Create `partner_escalation_rules` table.
  - Wire `BuddiesPanel.tsx`.
- [ ] **`T6.4` Institutional AI Research Endpoint**
  - `POST /api/partner/research`: Route institutional market prompts through `src/lib/ai.ts`.
  - Wire "Run Research →" in `ResearchPanel.tsx`.

---

### Phase 7: External Partner API & Integration Surface
*Status: Pending*
* **Objective**: Provide external wealth firms with Bearer-authenticated endpoints for programmatic sync.

- [ ] **`T7.1` API Key Issuance & SHA-256 Hashing**
  - Create `partner_api_keys` table.
  - `POST /api/partner/keys`: Generate `sm_live_...` key, display once, store hash.
  - Wire `ApiPanel.tsx`.
- [ ] **`T7.2` Bearer-Authenticated External Partner Endpoints**
  - Build endpoints matching `ApiPanel.tsx` specs:
    - `GET /api/v1/partner/clients`
    - `GET /api/v1/partner/clients/:id/analytics`
    - `POST /api/v1/partner/clients/:id/goals`
    - `POST /api/v1/partner/signals/publish`
    - `PATCH /api/v1/partner/agent-actions/:id/approve`
- [ ] **`T7.3` Webhook Registration Engine**
  - `POST /api/v1/partner/webhooks/register`: Register endpoints for event notifications.

---

### Phase 8: Policy Engine, Analytics Configuration & Hardening
*Status: Pending*
* **Objective**: Implement client feature disabling, customized analytics formulas, and multi-tenant isolation verification.

- [ ] **`T8.1` Client Feature Control Gating Engine**
  - Create `partner_feature_toggles` table.
  - `PATCH /api/partner/features/:key`: Toggle features.
  - Gating checks in navigation and client routes for partner-affiliated clients.
  - Wire `FeatureControlPanel.tsx`.
- [ ] **`T8.2` Per-Partner Analytics Calculation Rules**
  - Create `partner_analytics_rules` and `partner_analytics_category_toggles` tables.
  - Hook into DataBank engine to apply per-partner formula overrides.
  - Wire `AnalyticsRulesPanel.tsx`.
- [ ] **`T8.3` Multi-Tenant Data Isolation Audit**
  - Verify tenant boundaries across all endpoints.
  - Validate that consent revocation immediately cuts off data reads.
