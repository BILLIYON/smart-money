<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Smart Money — Persistent Project Memory & Knowledge Base 🧠

This document stores essential project context, database schemas, architectural patterns, and completed fixes so Antigravity always remembers the complete state of Smart Money upon restart.

---

## 🚀 Key Services & Stack Overview
* **Web App**: Next.js 16 (React 19, Tailwind, Framer Motion) running on PM2 cluster (`smart-money`).
* **Python Background Syncer**: `services/transaction_syncer` (PM2 process `transaction-syncer`).
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

---

## 🔒 Important System Guidelines for Future Sessions
1. **Never use `gemini-3.6-flash`**: Always use `gemini-2.5-flash` or `gemini-1.5-flash`.
2. **Database Pooling**: Always reuse the cached singleton `getPool()` with SSL rejection disabled for remote connections.
3. **AWS SES Sender Formatting**: Always sanitize `SES_FROM_EMAIL` by stripping wrapping quotes to avoid AWS SES `InvalidParameterValue` errors.
