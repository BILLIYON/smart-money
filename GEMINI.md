# Smart Money — AI Agent Memory & Guidelines 🧠

This file preserves all technical context, active features, database schemas, and previous fixes across restarts.

---

## 📌 System Architecture & Config
* **App URL**: `https://smartmoney.technology`
* **Next.js Stack**: Next.js 16 (App Router), Tailwind, Framer Motion, Canvas Confetti.
* **Database**: PostgreSQL (Remote Supabase & Local DB).
* **AI Models**: Groq (Llama 3.3 70B), Gemini 2.5 Flash / 1.5 Flash, NVIDIA NIM, Bedrock, Anthropic.
* **Services Status (PM2)**:
  * `0: postgrest`
  * `1, 2: smart-money` (Cluster mode)
  * `3: transaction-syncer` (Python background engine)

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
     * **AI Magic Wand Console**: Natural language prompt rules.
     * **Badges & Achievements**: Unlocks Data Novice, Streak Master, Turbo Sweeper, and Master Auditor ranks.

---

## 🔒 Rules for AI Agent on Future Sessions
* Always check `GEMINI.md` and `AGENTS.md` at session start.
* Keep `gemini-2.5-flash` / `gemini-1.5-flash` for Gemini API calls.
* Preserve connection pool caching in `databank-context.ts`.
