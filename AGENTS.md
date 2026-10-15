<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Smart Money — Persistent Project Memory & Knowledge Base 🧠

This document stores essential project context, database schemas, architectural patterns, and completed fixes so Antigravity always remembers the complete state of Smart Money upon restart.

---

## 🚀 Monorepo Architecture & Key Services
The repository is structured as a unified monorepo with peer directories for frontend applications and backend services:
* **Web App (`apps/web`)**: Next.js 16 (React 19, Tailwind, Framer Motion) running on PM2 cluster (`smart-money`, port 3000).
* **Partner Microservice (`services/partner_service`)**: Decoupled B2B partner ledger, consent engine & approvals daemon (PM2 process `partner-service`, port 8001).
* **Python Background Syncer (`services/transaction_syncer`)**: Python FastAPI/BeautifulSoup transaction syncer (PM2 process `transaction-syncer`, port 8000).
* **PM2 Orchestrator (`ecosystem.config.js`)**: Root configuration managing all microservices, postgrest, and Next.js cluster.
* **Database**: Dual PostgreSQL Setup
  * Remote Supabase DB: `aws-0-eu-west-1.pooler.supabase.com:6543/postgres`
  * Local DB: `postgresql://postgres@127.0.0.1:5432/smart_money`
* **Email Provider**: AWS SES (`eu-north-1`, Sender: `Smart Money <hi@smartmoney.technology>`).

---

## 🏆 Key Completed Features & Fixes

### 1. Registration & OTP Authentication (`/register`)
* **Tables Created on Remote DB**: `public.otps` & `public.password_resets`.
* **User Columns Restored**: Added `email_verified`, `phone_verified`, `phone_number`, `is_verified`, `verified_at`, `verification_name`, `verification_nin` to `public.users`.
* **AWS SES Delivery**: Fixed quote escaping in `SES_FROM_EMAIL` (`src/lib/email.ts`) and added dual HTML + Plain-Text multipart delivery to eliminate Outlook spam filtering.

### 2. Transaction Parser & Bank Resolution Accuracy
* **Strict Issuing Sender Domain Priority**:
  * Prioritizes `email_from` (`alerts@zenithbank.com`, `gtbank.com`) over beneficiary text (`OPay`, `Kuda`, `PalmPay`) in `src/lib/gmail-parser.ts`, `DatabankTransactionsTable.tsx`, and Python `parser.py` / `agent.py`.
  * Prevents Zenith Bank transfers to OPay recipients from creating phantom OPay accounts with fake balances.
* **Savings Classification**: Automatically maps Cowrywise, PiggyVest, Risevest, and mutual fund transfers to `Savings & Investments` category.

### 3. Sub-Second Buddy Chat Response Speed
* **Fixed Candidate Model**: Removed invalid `gemini-3.6-flash` identifier in `src/lib/ai.ts` (eliminated 3s 404 API delay on every chat message).
* **High-Speed Model Fallbacks**: Prioritized **Groq Llama 3.3 70B** (<300ms streaming) and `gemini-2.5-flash`.
* **DB Connection Pool Optimization**: Implemented cached singleton `pg.Pool` with `max: 10` connections in `src/lib/databank-context.ts` and added `LIMIT 200` query cap.

### 4. Gamified DataBank Cleaner Arcade (`/databank`)
* Built full gamified cleaner component ([`DatabankCleanerWidget.tsx`](file:///home/ec2-user/smart-money/src/components/databank/DatabankCleanerWidget.tsx)):
  * **0 – 100% Data Quality Health Meter** & Level/XP progression.
  * **1-Click AI Auto-Sweep (500+ Items)**: Bulk repairs 500+ transactions with confetti animations (`canvas-confetti`).
  * **Speed Card Swipe Game**: Fast 1-second decision swipes with streak counter (`🔥 5x Streak`).
  * **AI Magic Wand Console**: Custom natural language prompts for batch cleaning.
  * **Badges & Achievements**: Unlocks Data Novice, Streak Master, Turbo Sweeper, and Master Financial Auditor badges.

### 5. Gmail Syncer Data Accuracy & Infrastructure Overhaul
* **Supabase PGBouncer Prepared Statements Fix**: Added `prepare_threshold=None` to all `psycopg.connect(...)` calls in `services/transaction_syncer/engine/db.py`, eliminating `prepared statement "_pg3_0" does not exist` crashes on port 6543.
* **Multi-Factor Transaction Qualifier & Negative Blacklist**:
  * Implemented strict negative keyword guard in `services/transaction_syncer/engine/parser.py` and `src/lib/gmail-parser.ts`.
  * Blocks non-transaction marketing announcements, Dangote IPO newsletters, terms changes, branch closures, and card fee disclaimers from creating fake ₦5 / ₦40 transactions.
* **HTML Table DOM Adapters**: Dedicated table parsers for GTBank, Zenith, OPay, UBA, and Access Bank that isolate transaction amounts directly from labelled `<td>` cells, eliminating amount/address/CSS collision errors.
* **Clean Beneficiary Narration Engine**: Strips trailing `" Bank"`, `" Plc"`, and `" Account Number"` suffixes across both syncers. Repaired 398 existing corrupted records in the live database.
### 6. "Sync with Google" — Google Sheets Intermediary Ledger Architecture (Completed)
* **PRD & Roadmap**: [`prd/sync-with-google.md`](file:///home/ec2-user/smart-money/prd/sync-with-google.md)
* **Core Concept**: Synchronizes transactions into a styled, validated Google Sheet in the user's Google Drive (`Smart Money — Financial Ledger`) before/alongside DB ingestion.
* **Benefits**: 100% data cleanliness, zero email HTML parsing collisions, complete user transparency and auditability, and single-batch API ingestion.
* **Implemented Components & Routes**:
  * Service Layer: [`src/lib/google-sheets.ts`](file:///home/ec2-user/smart-money/src/lib/google-sheets.ts)
  * Python Adapter: [`services/transaction_syncer/engine/sheets_client.py`](file:///home/ec2-user/smart-money/services/transaction_syncer/engine/sheets_client.py)
  * Endpoints: `/api/databank/sheets/status`, `/api/databank/sheets/sync`, `/api/databank/sheets/export`, `/api/databank/sheets/extract-gmail`
  * Frontend UI: [`SyncWithGoogleCard.tsx`](file:///home/ec2-user/smart-money/src/components/databank/SyncWithGoogleCard.tsx) embedded in [`/databank`](file:///home/ec2-user/smart-money/src/app/%28dashboard%29/databank/page.tsx).
  * Native Google Apps Script Engine: [`public/smart_money_gmail_to_sheets.js`](file:///home/ec2-user/smart-money/public/smart_money_gmail_to_sheets.js)
* **Dual-Engine Execution**:
  * Python Engine (`services/transaction_syncer`, port 8000): Primary heavy-duty worker that handles BeautifulSoup DOM table parsing, statement PDFs, and auto-mirrors rows directly to Google Sheets via `sheets_client.py`.
  * Next.js App (`smart-money`, port 3000): Manages Google OAuth token lifecycle, non-blocking background exports, route-level cache-busting, and serves as the automatic fallback if Python is ever offline.
* **Master Template Cloner Architecture (`drive.files.copy`)**:
  * Clones the verified Master Template spreadsheet (`GOOGLE_SHEETS_MASTER_TEMPLATE_ID`) directly into the user's Google Drive via `drive.files.copy`.
  * Copies the container-bound Google Apps Script project (`smart_money_gmail_to_sheets.js`) with zero user developer settings needed (bypasses `script.google.com/home/usersettings` 403 sandbox block).
  * 1-Click "Deploy Fresh Template" action in `SyncWithGoogleCard.tsx` under Advanced options.
* **Live Ledger Verification**:
  * Verified for user `f57f8127-f6fd-4084-a60a-0e088f9cd0a8` (`Smart Money — Financial Ledger`, Sheet ID `1dvywSJwQg_L3Yn8b2k_xU1wcEAYVNUMVhVqQomqx93A`). 40 clean transactions extracted and formatted with currency (₦) and category mappings.

---

## 🔒 Important System Guidelines for Future Sessions
1. **Never use `gemini-3.6-flash`**: Always use `gemini-2.5-flash` or `gemini-1.5-flash`.
2. **Database Pooling**: Always reuse the cached singleton `getPool()` with SSL rejection disabled for remote connections. For Python `psycopg`, ALWAYS pass `prepare_threshold=None` for Supabase transaction poolers.
3. **AWS SES Sender Formatting**: Always sanitize `SES_FROM_EMAIL` by stripping wrapping quotes to avoid AWS SES `InvalidParameterValue` errors.
4. **Bank Transaction Qualification**: Never qualify an email as a transaction simply because sender is a financial domain; always verify against negative marketing keywords and require explicit transaction intent phrases.
