# DataBank IQ — Gamified Transaction Cleaning PRD & Task Tracker

## Overview
Transform post-sync data cleaning from an overwhelming spreadsheet task into an engaging, high-impact AI quiz. Users answer quick questions across 3 tiers (Merchant Memory, Ambiguous Transactions, and Financial Intent) that batch-resolve transactions, build automatic merchant memory rules for future syncs, and increase a real-time **DataBank IQ** score (from Blurry to Elite).

---

## 📊 DataBank IQ Levels
- **0–40 — Blurry**: Buddy can only give generic advice
- **41–65 — Developing**: Buddy understands income but has limited spending context
- **66–80 — Clear**: Buddy can give specific, accurate advice
- **81–92 — Sharp**: Buddy has a strong understanding of your finances
- **93–100 — Elite**: Fully personalised advice

**Scoring Formula:**
`Score = (categorised_transaction_value / total_transaction_value) * 60 + (intent_captured_value / total_transaction_value) * 40`

---

## 📋 Task Checklist

### 🔹 Phase 1: Database & Merchant Rules Engine
- [x] **Task 1.1: Database Schema Migration**
  - Create table `public.merchant_rules` (user_id, merchant_name, category, intent, created_at, last_confirmed)
  - Add `intent` column to `public.databank_entries`
  - Add `databank_iq_score` and `databank_iq_level` to `public.users`
- [x] **Task 1.2: Merchant Memory Utility & Auto-Apply Service** (`src/lib/merchant-rules.ts`)
  - `applyMerchantRules(userId)`
  - `upsertMerchantRule(userId, merchantName, category, intent)`
  - `getMerchantRules(userId)` & `deleteMerchantRule(userId, ruleId)`
- [x] **Task 1.3: Sync Engine Integration for Merchant Rules**
  - Integrate `applyMerchantRules(userId)` into Gmail sync save routes (`src/lib/gmail.ts` and `src/app/api/databank/gmail/save-preview/route.ts`)

### 🔹 Phase 2: AI Question Generator & Scoring Engine (Backend APIs)
- [x] **Task 2.1: DataBank IQ Formula & Analytics Calculator** (`src/lib/databank-iq.ts`)
  - 60/40 weighted formula calculation & level mapping
- [x] **Task 2.2: 3-Tier Question Generation Engine** (`src/lib/databank-iq-generator.ts`)
  - Tier 1: Merchant Memory (Top 15–20 high-frequency merchants)
  - Tier 2: Ambiguous Transactions (Top 20–30 low-confidence debits)
  - Tier 3: Financial Intent Capture (5–8 intent questions on savings/transfers)
- [x] **Task 2.3: Opening AI Narrative Hook Generator**
  - 90-day volume & blind spot narrative generator
- [x] **Task 2.4: Session & Answer API Endpoints**
  - `GET/POST /api/databank/iq/session`
  - `POST /api/databank/iq/answer` (with 5-question milestone insights)

### 🔹 Phase 3: `DataBankIQScreen` Interactive Gamified UI
- [x] **Task 3.1: Hook & Welcome State** (`src/components/databank/iq/DataBankIQIntro.tsx`)
  - Animated SVG radial score ring (0–100) & Level badge
  - AI breakdown card with "~3 minutes" CTA
- [x] **Task 3.2: Interactive Quiz Card Deck** (`src/components/databank/iq/DataBankIQCard.tsx`)
  - Card deck transitions, 1-click answers, split modal, free-text fallback
- [x] **Task 3.3: Realtime Progress Bar & Dynamic Score Meter** (`src/components/databank/iq/DataBankIQProgressHeader.tsx`)
  - Unresolved count tracker, live +IQ floating indicator
- [x] **Task 3.4: 5-Question Milestone Insight Callout** (`src/components/databank/iq/DataBankIQMilestoneModal.tsx`)
  - Actionable Buddy preview insights
- [x] **Task 3.5: Victory & Completion Screen** (`src/components/databank/iq/DataBankIQSummary.tsx`)
  - Confetti burst, final score, forward-looking Buddy advice, CTAs
- [x] **Task 3.6: Main Screen Assembly** (`src/components/databank/iq/DataBankIQScreen.tsx`)
  - Complete quiz container with keyboard shortcuts and modal controls

### 🔹 Phase 4: Sync Hook Trigger, Resume Cleaner & Buddy Context Integration
- [x] **Task 4.1: Gmail Sync Completion Auto-Trigger & Resume Cleaning Banner**
  - Launch upon sync complete in `src/app/(dashboard)/databank/page.tsx`
  - Persistent "Resume DataBank IQ Cleaning" banner
- [x] **Task 4.2: Buddy AI Chat Prompt Integration** (`src/lib/databank-context.ts`)
  - Inject DataBank IQ score, level, and intent into Buddy prompt context
- [x] **Task 4.3: End-to-End Build & Verification**
  - Type-check with `npx tsc --noEmit` and operational verification
