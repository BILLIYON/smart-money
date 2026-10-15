# Smart Money — AI Agent Memory & Guidelines 🧠

This file preserves all technical context, active features, database schemas, and previous fixes across restarts.

---

## 📌 System Architecture & Config (Monorepo)
* **App URL**: `https://smartmoney.technology`
* **Web Application (`apps/web`)**: Next.js 16 (App Router), React 19, Tailwind, Framer Motion, Canvas Confetti. (PM2 `smart-money`, port 3000)
* **Admin Portal (`apps/admin`)**: Next.js 16 decoupled backoffice management application (PM2 `admin-portal`, port 3002)
* **Partner Microservice (`services/partner_service`)**: Decoupled B2B partner ledger, consent engine & approvals daemon (PM2 `partner-service`, port 8001)
* **Transaction Syncer (`services/transaction_syncer`)**: Python background engine (PM2 `transaction-syncer`, port 8000)
* **PostgREST**: Local DB PostgREST API (PM2 `postgrest`, port 3001)
* **PM2 Orchestrator (`ecosystem.config.js`)**: Root process manager controlling all services
* **Database**: PostgreSQL (Remote Supabase & Local DB).
* **AI Models**: Groq (Llama 3.3 70B), Gemini 2.5 Flash / 1.5 Flash, NVIDIA NIM, Bedrock, Anthropic.


---

## 🛠️ Key Recent Fixes & Accomplishments

1. **OTP & Email Registration (`/register`)**:
   * Created `public.otps` & `public.password_resets` tables on remote Supabase DB.
   * Added `email_verified`, `phone_verified`, `phone_number`, `is_verified`, `verified_at`, `verification_name`, `verification_nin` columns to `public.users`.
   * Fixed quote formatting in `SES_FROM_EMAIL` (`src/lib/email.ts`) and added plain-text alternative body to prevent Outlook spam filtering.

2. **Bank Attribution & Transaction Parsing**:
   * Enforced strict `email_from` sender domain priority over beneficiary text in `src/lib/gmail-parser.ts`, `DatabankTransactionsTable.tsx`, and Python `parser.py`.
   * Mapped Cowrywise, PiggyVest, and Risevest transfers to `Savings & Investments` category.

3. **Buddy Chat Speed Optimization**:
   * Removed invalid `gemini-3.6-flash` identifier in `src/lib/ai.ts` (eliminated 3s 404 latency delay).
   * Implemented cached singleton connection pool in `src/lib/databank-context.ts` with `LIMIT 200` query cap.
   * Reordered fallback chain to prioritize sub-second streaming models (**Groq Llama 3.3 70B**).

4. **Gamified DataBank Cleaner Arcade (`/databank`)**:
   * Built [`DatabankCleanerWidget.tsx`](file:///home/ec2-user/smart-money/src/components/databank/DatabankCleanerWidget.tsx):
     * **Health Score Gauge (0 – 100%)** & Auditor Ranks.
     * **1-Click AI Auto-Sweep**: Bulk cleans 500+ items with confetti (`canvas-confetti`).
     * **Speed Card Swipe Game**: Fast 1-second swipe decisions with streak counter.
5. **"Sync with Google" — Google Sheets Intermediary Ledger Architecture**:
   * Built intermediate Google Sheets synchronization engine adhering to industry standard (Tiller Money pattern).
   * Generates a styled, formatted, and strictly typed ledger (`Smart Money — Financial Ledger`) in the user's Google Drive.
   * Eliminates parsing errors and allows zero-latency deterministic bulk ingestion.
   * Implemented in [`src/lib/google-sheets.ts`](file:///home/ec2-user/smart-money/src/lib/google-sheets.ts), [`SyncWithGoogleCard.tsx`](file:///home/ec2-user/smart-money/src/components/databank/SyncWithGoogleCard.tsx), and Python syncer [`sheets_client.py`](file:///home/ec2-user/smart-money/services/transaction_syncer/engine/sheets_client.py).
   * Added non-blocking Gmail extraction route [`/api/databank/sheets/extract-gmail`](file:///home/ec2-user/smart-money/src/app/api/databank/sheets/extract-gmail/route.ts) with client-side `AbortController` timeout protection.
   * Companion native Google Apps Script: [`public/smart_money_gmail_to_sheets.js`](file:///home/ec2-user/smart-money/public/smart_money_gmail_to_sheets.js).
   * Live verified with user `f57f8127-f6fd-4084-a60a-0e088f9cd0a8`: 40 transactions automatically exported into spreadsheet `1dvywSJwQg_L3Yn8b2k_xU1wcEAYVNUMVhVqQomqx93A`.
   * Dual-engine coordination: Python handles DOM/PDF heavy parsing on port 8000; Next.js handles OAuth tokens, fast cached export, and real-time streaming fallback.
   * Master Template Cloner Architecture: Copies pre-configured template with container-bound script directly into user's Google Drive via `drive.files.copy`, eliminating consumer friction and Apps Script 403 sandbox errors.
   * Task PRD tracked in [`prd/sync-with-google.md`](file:///home/ec2-user/smart-money/prd/sync-with-google.md).

---


## 🔒 Rules for AI Agent on Future Sessions
* Always check `GEMINI.md` and `AGENTS.md` at session start.
* Keep `gemini-2.5-flash` / `gemini-1.5-flash` for Gemini API calls.
* Preserve connection pool caching in `databank-context.ts`.
