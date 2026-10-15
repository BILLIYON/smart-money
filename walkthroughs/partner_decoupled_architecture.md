# Partner Service — Decoupled Architecture & API Integration Spec

> **Document Status**: Architectural Design & Implementation Specification  
> **Target Service**: `services/partner_service` (Independent Server Daemon on port `8001`)  
> **Consuming Application**: Smart Money Web App (Next.js 16 cluster on port `3000`)

---

## 1. Architectural Vision & Decoupling Rationale

To ensure **scalability, fault isolation, and institutional B2B security**, the entire **Partners Module** is being decoupled from the core Next.js monolith into an independent microservice (`services/partner_service`).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SMART MONEY PLATFORM                            │
│                                                                        │
│   ┌───────────────────────────┐      HTTP REST / IPC (Port 8001)       │
│   │   Next.js 16 Monolith     │ ◄──────────────────────────────────┐   │
│   │   (Web Client / App)      │  Internal API Client / SDK         │   │
│   │   Port: 3000 (PM2)        │  Header: x-internal-service-key    │   │
│   └─────────────┬─────────────┘                                    │   │
│                 │                                                  │   │
│                 │ User Sessions & UI Pages                         ▼   │
│                 │                                    ┌─────────────────────────────┐
│                 │                                    │   Partner Microservice      │
│                 │                                    │   (services/partner_service)│
│                 │                                    │   Port: 8001 (PM2 Daemon)   │
│                 │                                    └──────────────┬──────────────┘
│                 ▼                                                   ▼
│   ┌────────────────────────────────────────────────────────────────────────────┐
│   │               PostgreSQL Database (Dual Setup: Remote & Local)             │
│   │   - public.partner_orgs            - public.partner_staff                  │
│   │   - public.partner_clients         - public.partner_client_scopes          │
│   │   - public.partner_applications    - public.partner_goals / opportunities  │
│   └────────────────────────────────────────────────────────────────────────────┘
```

### Key Advantages:
1. **Isolated Fault Domains**: High-load institutional API calls, bulk analytics recalculations, or partner staff queries will never impact consumer dashboard latency or user chat streaming.
2. **Dedicated Resource Allocation**: Governed independently under PM2 with dedicated memory and restart policies.
3. **Clean B2B API Surface**: External partner wealth firms and third-party institutions consume endpoints exposed directly from the service or reverse-proxied without frontend overhead.
4. **Enforced Consent Boundary**: Consent verification (`partner_client_scopes`) is centralized at the data service layer rather than dispersed across various Next.js UI routes.

---

## 2. Service Domain Boundaries

The decoupled `partner_service` assumes exclusive ownership over:

| Domain | Scope & Responsibilities | Key Database Entities |
| :--- | :--- | :--- |
| **Organization Directory** | Public listings, vanity slugs, firm metadata, AUM minimums, reviews. | `partner_orgs` |
| **Staff & RBAC** | Staff roster, roles (`admin`, `advisor`, `analyst`, `view_only`), invitation tokens. | `partner_staff` |
| **Client Relationships** | Client affiliation, status transitions (`active`, `needs_attention`), private advisor notes. | `partner_clients` |
| **Consent Scoping** | Enforcing the 5 granular client data grants (`transactions`, `networth`, `goals`, `chat`, `actions`). | `partner_client_scopes` |
| **Intake & Applications** | Processing inbound client applications, risk tolerance assessment, and review queues. | `partner_applications` |
| **Goal & Opportunities Bridge** | Partner-written financial goals and curated institutional opportunities. | `goals`, `opportunities` |
| **Action Approvals** | High-value agentic action interception and partner advisor sign-offs. | `agent_actions`, `partner_orgs` |
| **External Partner API** | SHA-256 API Key verification and B2B REST endpoints (`/api/v1/partner/*`). | `partner_api_keys` |

---

## 3. Communication & Security Protocol

### Internal Inter-Process Communication (IPC)
* **Protocol**: HTTP/1.1 JSON REST over loopback (`http://127.0.0.1:8001`).
* **Authentication**: All internal requests from Next.js to `partner_service` pass an internal service header:
  ```http
  x-internal-service-key: <INTERNAL_PARTNER_SERVICE_SECRET>
  x-authenticated-user-id: <USER_UUID>
  x-authenticated-role: <USER_ROLE>
  ```
* **Client SDK**: The Next.js app accesses all partner functions through a typed client SDK:
  `src/lib/partner-service-client.ts`.

---

## 4. File & Service Structure

```
services/partner_service/
├── package.json               # Independent service dependencies & scripts
├── tsconfig.json              # Strict TypeScript configuration
├── src/
│   ├── server.ts              # HTTP Server entry point (Port 8001)
│   ├── config.ts              # Port, DB URLs, Secrets & Environment
│   ├── middleware/
│   │   ├── internal-auth.ts   # Validates x-internal-service-key
│   │   └── rbac.ts            # Enforces partner staff roles
│   ├── controllers/
│   │   ├── directory.ts       # Public directory & profiles
│   │   ├── applications.ts    # Inbound client applications
│   │   ├── consent.ts         # Scopes read/toggle/revoke
│   │   ├── clients.ts         # Partner staff client management & notes
│   │   ├── overview.ts        # Metrics aggregation & attention heuristics
│   │   ├── goals.ts           # Partner-published goals
│   │   ├── opportunities.ts   # Opportunity dispatching
│   │   └── approvals.ts       # Action threshold approval queue
│   ├── services/
│   │   ├── db.ts              # PostgreSQL connection pool with Supabase support
│   │   ├── consent-engine.ts  # Scope intersection & payload sanitization
│   │   └── email.ts           # AWS SES client invitations
│   └── types/
│       └── partner.ts         # Domain models & request/response contracts
```

---

## 5. Next.js Integration Layer

Next.js will retain its polished UI components and Server Actions, but route handlers become thin gateways delegating to `partner-service`:

```typescript
// Example: src/app/api/partners/route.ts
import { NextResponse } from "next/server";
import { partnerServiceClient } from "@/lib/partner-service-client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const result = await partnerServiceClient.getDirectory({
    type: searchParams.get("type"),
    query: searchParams.get("q"),
  });
  return NextResponse.json(result);
}
```

---

## 6. PM2 Ecosystem Integration

The service will run as process ID `4` (or named `partner-service`) alongside existing daemons:

```bash
┌────┬────────────────────┬──────────┬──────────┬──────────┐
│ id │ name               │ mode     │ port     │ status   │
├────┼────────────────────┼──────────┼──────────┼──────────┤
│ 0  │ postgrest          │ fork     │ 3001     │ online   │
│ 1  │ smart-money        │ cluster  │ 3000     │ online   │
│ 2  │ smart-money        │ cluster  │ 3000     │ online   │
│ 3  │ transaction-syncer │ fork     │ 8000     │ online   │
│ 4  │ partner-service    │ fork     │ 8001     │ online   │ ◄ NEW
└────┴────────────────────┴──────────┴──────────┴──────────┘
```

---

## 7. Decoupling Task Checklist

- [ ] **Step 1**: Scaffold `services/partner_service` with TypeScript, HTTP listener, and configuration.
- [ ] **Step 2**: Port Database Access Layer (`db.ts`) and Consent Engine (`consent-engine.ts`) to the service.
- [ ] **Step 3**: Implement Controllers:
  - Directory & Applications (`/api/v1/partners`, `/api/v1/partners/:id/apply`)
  - Consent Scopes (`/api/v1/consent/*`)
  - Staff & Clients (`/api/v1/clients/*`, `/api/v1/overview`)
  - Goals & Opportunities (`/api/v1/goals/*`, `/api/v1/opportunities/*`)
  - Approvals Bridge (`/api/v1/approvals/*`)
- [ ] **Step 4**: Build Next.js SDK Client (`src/lib/partner-service-client.ts`).
- [ ] **Step 5**: Update Next.js API Routes to proxy requests to `partner-service`.
- [ ] **Step 6**: Launch under PM2, register autostart, and run end-to-end integration tests.
