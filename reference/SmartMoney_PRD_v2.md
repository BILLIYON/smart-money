# Smart Money — Product Requirements Document
**Version 2.0 | Updated June 2026 | Confidential & Proprietary**

---

## What Changed in v2.0

| New Feature / Change | Summary |
|---|---|
| §4.1 Marketplace — Celebrity Hero | Celebrity sim buddies lead the homepage. Scrollable hero: Buffett, Kiyosaki, Cardone, Ramsey, Lynch, Trump. |
| §4.1.3 Buddy Profiles | Full profile pages: philosophy, sample responses, user reviews, sticky subscription panel. |
| §4.2 DataBank — Spending Analytics | Full analytics dashboard, 5 sub-tabs: Overview (Financial Health Score), Spending, Investments, Cash Flow, Net Worth. Timeframe selector (1M/3M/6M/1Y/All). Chart view toggles (line/bar/area/stacked/donut). |
| §4.2 DataBank — Open Banking API | Full OAuth connection flow replacing "Coming Soon". Bank selector, per-permission toggles, revoke access. |
| §4.2 DataBank — Custom API Signal Sessions | Third-party data providers publish live signals via API. Buddy matches against past conversations and surfaces signals proactively in chat. |
| §4.2 DataBank — Live Signal Sources | Expanded to 4 source types: News Media, Social & Creators (Twitter/X, YouTube), Podcasts, Newsletters. |
| §4.3 AI Studio — Notification Triggers | Creator-configurable trigger system: 6 trigger types, per-week caps. |
| §4.3 AI Studio — Live Preview | Working chat preview inside Studio to test buddy in real time before publishing. |
| §4.4 Chat — Group Chat | Multi-buddy group conversations. Users create named groups (e.g. "Investment Council"), pick 2–4 buddies. |
| §4.4 Chat — In-chat Goal Creation | One-tap goal creation from buddy message. Pre-filled inline form; one tap commits to Goal Tracker. |
| §4.4 Chat — In-chat Agentic Actions | One-tap money movement from chat. Buddy suggests action; user confirms; execution receipt in thread. |
| §4.4 Chat — Signal Alert Messages | Distinct in-chat format for proactive signals. Quotes relevant past conversation context. |
| §4.5 Agentic Actions Dashboard | New screen: Smart Money Wallet, pending approvals, execution history, bank/investment connections, per-action limits. |
| §4.6 Live Signal Sources — Social & Creators | Finance influencers on Twitter/X, YouTube, TikTok, podcasts, newsletters — not just traditional news. |
| §4.7 Financial Health Score (Overview) | DataBank Analytics Overview leads with a Financial Health Score (0–100), personal headline, buddy take, 4 colour-coded insight tiles. |
| §4.8 Follow-Through Check-ins | 72hr follow-up cards on AI advice. Yes/Partial/No triggers character-accurate buddy reply and Milestone Celebration. |
| §6.1 Information Architecture | Settings and Profile collapsed into single screen. Agentic Actions added as standalone screen. Compare Buddies modal added. |
| §7.1 MVP Scope | Several Phase 2 items (Open Banking, group chat, agentic execution) moved to P1 given design completion. |

---

## 1. Executive Summary

Smart Money is a contextual AI financial advisor platform that democratizes access to personalized financial guidance. It connects users to AI simulations of their favourite finance personalities — giving the average person a private conversation with the expert they already trust, powered by their real financial data.

**MISSION:** Give every person access to contextual, expert-level financial advice tailored to their actual financial reality — not generic platitudes.

### 1.1 The Core Problem
Millions follow finance influencers and read money books but leave without advice tailored to their specific situation. The gap between "I love what this expert teaches" and "I know what to do with my own money" remains wide and costly.

### 1.2 The Solution — Four Interlocking Components
1. **A Marketplace of AI Finance Buddies** — celebrity fan simulations and archetype personas, both free and paid
2. **A DataBank** — secure, user-controlled store of financial context (bank statements, Gmail receipts, transaction alerts, custom API signals)
3. **An AI Studio** — creator tool for building, customising, and monetising Finance Buddies, including notification triggers and signal sources
4. **An Agentic Actions layer** — buddy can execute financial actions (transfers, subscription cancellations, investment deposits) with explicit user confirmation

---

## 2. Product Vision & Goals

**Vision:** "To be the financial companion that knows your full story — and grows smarter with every transaction, decision, and goal you share."

### 2.2 Strategic Goals

| Goal | Description | MVP Target | Status |
|---|---|---|---|
| Marketplace Launch | Working marketplace with celebrity sims and archetype buddies (free + paid) | 10+ avatars at launch | Designed |
| Celebrity Hook | Celebrity fan simulations lead homepage and onboarding | 6 celebrities featured | Designed |
| DataBank Adoption | Users connect financial data to enable contextual advice | 60% connect one source | Designed |
| Analytics Dashboard | Full financial picture via Spending Analytics | Financial Health Score visible to all | Designed |
| Creator Economy | Community-built Finance Buddies in AI Studio | 5 creator buddies in marketplace | Designed |
| Agentic Execution | Users execute financial actions from chat | First executed action per user | Designed |
| Signal Marketplace | Third-party API signal providers earn per subscriber | 3 verified signal sources at launch | Designed |
| Revenue | First paid buddy subscriptions and creator revenue share | First ₦1M in GMV | Target |

### 2.3 Success Metrics
- **Primary:** % of users who act on buddy advice (via 72hr check-in)
- **Engagement:** Average sessions/user/month
- **DataBank:** % of users with at least one active data source connected
- **Analytics:** % of users who open Spending Analytics within first 7 days
- **Agentic:** Number of agent actions executed per month
- **Creator:** Number of paid Finance Buddies live in marketplace
- **Signal Sources:** Number of active Custom API Signal subscriptions
- **Revenue:** Monthly GMV from buddy subscriptions, creator payouts, and signal source subscriptions

---

## 3. Target Users & Personas

### 3.1 Primary User — The Follower

| Attribute | Detail |
|---|---|
| Profile | Average internet user who earns income and follows at least one finance influencer |
| Age Range | 22–42 years old |
| Goal | Tailored, contextual advice from a finance personality they trust |
| Frustration | Generic content doesn't address their specific situation |
| Behaviour | Checks social media daily; wants to act on financial decisions but lacks trusted guidance |
| Technical Comfort | Moderate — comfortable with mobile apps, chat, Gmail |
| Willingness to Pay | Already pays for conferences; highly motivated by celebrity name recognition |

### 3.2 Secondary User — The Creator

| Attribute | Detail |
|---|---|
| Profile | Finance influencer, coach, educator, data provider, or enthusiast |
| Goal | Build a Finance Buddy or Signal Source, sell access to followers |
| Motivation | Passive income from fans; signal source creators earn from data distribution |
| Technical Comfort | Moderate to high — comfortable with prompt engineering and API integration |

### 3.3 User Journey — Primary User
1. Discovers Smart Money via social media or referral
2. Lands on Marketplace — sees celebrity finance legends front and centre (Buffett, Kiyosaki, Cardone, Ramsey)
3. Onboarding step 2 leads with celebrity buddy selection, archetypes below
4. Selects a buddy and prompted to connect DataBank (Gmail or bank statement)
5. Has first contextual chat — buddy references their specific income, spending, or debt data
6. Receives a proactive notification on next significant financial event
7. Sees Financial Health Score in DataBank Analytics — the "aha moment"
8. Returns for ongoing advice, adds more data, enables Custom API Signal sources
9. Executes first Agentic Action directly from chat

---

## 4. Core Features & Functional Requirements

### 4.1 The Marketplace

The entry point. Users land here first and select a Finance Buddy before any other action.

#### 4.1.1 Celebrity Hero Section
- Full-width dark-themed hero: "Chat with the world's greatest financial minds"
- Horizontally scrollable row of celebrity buddy chips
- Each chip: name, style tag, price, subscriber count
- Tapping navigates to buddy's full profile page
- Fan disclaimer at bottom of hero section
- Archetype buddy grid appears below under "Or choose an Archetype Buddy"

> **LEGAL NOTE:** All six celebrity buddies built under fan-created simulation framework. Fan disclaimer required on: (a) celebrity hero section, (b) each buddy card, (c) each buddy profile page, (d) subscription panel. No platform revenue from celebrity sims until legal review complete.

#### 4.1.2 Discovery & Browsing
- Grid view of Finance Buddy cards
- Card shows: avatar, name/initials, persona description, school of thought, price (Free / ₦X/month), AI model, star rating
- Filter chips: All, Investing, Budgeting, Entrepreneurship, Academic, Crypto, Free Only, ⭐ Celebrity Sims
- Live search: filters buddy list in real time; results in dropdown with price + click-to-profile
- **Compare Buddies:** ⚔️ button opens side-by-side modal

#### 4.1.3 Buddy Profiles
- Full profile page: philosophy (fan disclaimer if applicable), 2 sample responses, user reviews with star ratings
- Sticky subscription panel: price, included features, CTA, fan disclaimer if applicable
- Free tier: limited messages/month before paywall prompt
- Paid tier: unlimited chats, notification access, full DataBank integration

#### 4.1.4 Fan-Created Celebrity Simulations

| Celebrity | Philosophy / Style | Price |
|---|---|---|
| Warren Buffett | Value investing, patience, compound interest, "buy wonderful companies" | ₦3,000/mo |
| Robert Kiyosaki | Rich Dad assets vs. liabilities, cashflow quadrant, financial IQ | ₦2,000/mo |
| Grant Cardone | 10X Rule, obsessive action, income over expenses, multi-family RE | ₦2,500/mo |
| Dave Ramsey | Baby Steps, gazelle intensity debt payoff, zero tolerance for consumer debt | ₦1,500/mo |
| Peter Lynch | "Invest in what you know," ten-baggers in everyday life, ignore Wall Street noise | ₦2,000/mo |
| Donald Trump | Art of the Deal, negotiate from strength, brand as asset, OPM | ₦2,500/mo |

#### 4.1.5 Compare Buddies Modal
- Accessible via ⚔️ Compare button in topbar
- User selects two buddies from dropdowns, types a question (or uses default salary allocation question)
- Both buddies respond simultaneously side-by-side, in character
- Three topic clusters: salary allocation, debt, investing
- Core social/viral mechanic

---

### 4.2 The DataBank

The contextual engine of Smart Money. Significantly expanded in v2.0.

> **KILLER FEATURE:** The first time the AI references something specific from the user's own financial data — "I noticed you received a ₦450,000 credit last Friday, here's what I'd do with it" — is the product's core aha moment.

#### 4.2.1 Data Sources
- **Bank Statement Upload** — PDF or CSV; parsed for income credits, debit patterns, recurring payments, large transactions
- **Gmail Integration** — OAuth read-only; searches for bank alerts, receipts, invoices, salary notifications, subscription renewals
- **Manual Entry** — structured form: type (income/expense/goal/asset/debt), amount, description, date, category
- **Open Banking API** — direct bank connection via CBN Open Banking OAuth (§4.2.3)
- **Live Signal Sources** — 4 types: News Media, Social & Creators, Podcasts, Newsletters (§4.2.4)
- **Custom API Signal Sessions** — third-party data providers publish proactive signals (§4.2.5)

#### 4.2.2 Data Transparency & Control
- Dedicated DataBank page showing every piece of data the app holds, by source
- User can delete any item individually or wipe all data in one action
- Privacy bar: "You are in full control. Raw files are never stored — only extracted insights are retained."
- Last updated timestamp visible per data source

#### 4.2.3 Open Banking API
- **Step 1:** User selects bank from a grid (GTBank, Access Bank, Zenith Bank, UBA, Stanbic IBTC, First Bank)
- **Step 2:** Redirected to bank's own secure OAuth page — Smart Money never sees login credentials
- **Step 3:** Smart Money receives time-limited permission token (not the password)
- Per-permission toggles: account balance (real-time), transaction history (last 6 months), credit/debit alerts (real-time), standing orders & debit mandates, execute transfers (Agentic Actions only — separate opt-in)
- Users can revoke access from DataBank or from their bank's own app

#### 4.2.4 Live Signal Sources — 4 Tabs

| Tab | Sources | Notes |
|---|---|---|
| 📰 News Media | Nairametrics, BusinessDay NG, Reuters Finance, CoinDesk, Bloomberg | Traditional financial news — always available |
| 🐦 Social & Creators | Twitter/X handles, YouTube channels, TikTok profiles, Instagram pages | Buddy monitors posts for financial signals relevant to user's situation |
| 🎙️ Podcasts | The Stears Podcast, We Don't Do Stocks, Planet Money, Invest Like the Best | RSS or Spotify/Apple Podcasts link; episodes processed for signal extraction |
| 📬 Newsletters | Stears Weekly, TechCabal Daily, The Hustle; custom Substack or email forwarding | Signals extracted from newsletter content |

#### 4.2.5 Custom API Signal Sessions
- Verified data provider registers as a Signal Source on Smart Money
- Exposes API endpoint that Smart Money polls for new signals
- Smart Money matches incoming signals against users' conversation history
- When match found, buddy proactively opens a **Signal Alert message** in chat thread

**Signal Alert message format:**
- Source badge: "⚡ Signal · [Source Name]"
- Conversation context: quotes the relevant past conversation
- Signal detail: specific actionable data (property address, price, agent contact)
- Data chips: location, price, budget fit, listing time
- Three response buttons: "Yes, let's discuss it" / "Tell me more first" / "Not interested"
- Each response triggers an immediate in-character buddy reply

**Monetisation:** Creator sets monthly subscription price (e.g. ₦800/mo). Platform takes 30%, 70% to creator.

#### 4.2.6 Spending Analytics Dashboard — 5 Sub-tabs

| Sub-tab | Contents |
|---|---|
| 📊 Overview | Financial Health Score card (§4.7), Income vs. Spending chart (stacked horizontal bar default + line/area toggles), Spending by Category donut (+ horizontal bar toggle), Budget Health Metrics with savings rate ring gauge |
| 💸 Spending | 3-month category trend table with ₦ amounts, month-on-month % change, "💬 Discuss" button per row. Transaction drill-down list with category filter dropdown. |
| 📈 Investments | Portfolio KPIs (value, total invested, total return, avg yield). Portfolio allocation donut. Portfolio growth line chart. Holdings table: asset, invested, current value, return ₦ and %, yield p.a., 60px sparkline per row. |
| 🔄 Cash Flow | Monthly cash flow waterfall chart (income → categories → net saved). Subscription audit panel: each subscription with usage frequency and agent-cancel button for idle ones. |
| 🏦 Net Worth | Net worth over time line chart with actual data + dotted projection to year-end. Assets vs. Liabilities in two columns, fully itemised. "Set a Net Worth Goal" CTA. |

- Timeframe selector: 1M / 3M / 6M / 1Y / All
- Every chart has an "Ask buddy →" action that pre-fills the relevant question in chat

---

### 4.3 The AI Studio

Creator economy layer. 5 steps, expanded Notification Triggers, working Live Preview chat.

#### 4.3.1 Step 1 — Knowledge Base Upload
- Upload PDFs (books, articles, transcripts, course materials)
- Upload video/audio with automatic transcription
- Paste URLs for web content ingestion
- Tag and categorize content by topic

#### 4.3.2 Step 2 — Personality Engineering
- Tone sliders: Aggressive ↔ Conservative, Blunt ↔ Encouraging, Formal ↔ Casual
- Signature phrases: define recurring phrases the buddy always uses
- Topic boundaries: specify what buddy will and will not advise on
- Response to bad news: configure how buddy handles negative financial situations

#### 4.3.3 Step 3 — AI Model Selection

| Model | Characteristics | Best Suited For |
|---|---|---|
| Claude (Anthropic) | Nuanced, cautious, strong on reasoning and ethics. Flags risk and presents balanced perspectives. | Academic, conservative, long-term wealth-building personas |
| GPT-4 (OpenAI) | Direct, confident, strong on structured output and tactical advice. | Aggressive investor or entrepreneurship personas |
| Gemini (Google) | Strong real-time data access and web grounding. More up-to-date on market conditions. | Market-aware or news-driven personas |
| Custom / Future Models | Platform will add new models as they mature. Creators can switch model without rebuilding. | Specialist or experimental use cases |

> **DESIGN NOTE:** Model selection is creator-facing, not user-facing. Users see the buddy's persona — not the technical stack.

#### 4.3.4 Step 4 — Notification Triggers

| Trigger | Description | Default |
|---|---|---|
| Salary / Large Credit | Fires when a credit above a configurable threshold is detected | On |
| Spending Threshold | Fires when weekly or monthly spend in a category exceeds a limit | On |
| Goal Deadline Approaching | Fires 2 weeks before a goal's target date | On |
| New Subscription Detected | Fires when Gmail or bank data shows a new recurring payment | On |
| Significant Market / News Event | Fires when a followed signal source publishes a high-relevance signal | On |
| Weekly Check-in Summary | Optional Sunday evening summary from the buddy | Off |

Creator also sets max notifications per week cap (default: 3). Users can override in Settings.

#### 4.3.5 Step 4b — Live Preview
- Working chat panel inside Studio that responds to test messages in real time
- Preview reflects current state of all configuration sliders and persona settings
- Revenue projection panel: estimated monthly earnings at 50, 100, and 500 subscribers

#### 4.3.6 Step 5 — Publishing & Monetisation
- Creator sets price: Free (10 messages/mo), ₦X/mo (unlimited), or Custom
- Platform review step before paid buddies go live
- Creator dashboard: subscriber count, monthly revenue (gross + 70% take), avg session length, buddy analytics

---

### 4.4 Chat Interface

#### 4.4.1 1:1 Chat Experience
- Clean messaging UI with avatar presence (name, icon, persona tag, AI model indicator)
- Context chips in header: active data sources visible at a glance (📊 Statement · 📧 Gmail · 📰 Nairametrics)
- Inline spending charts inside AI messages when referencing spending data
- DataBank context sidebar: financial snapshot, active signal sources, "Manage DataBank →" shortcut
- Chat suggestion chips below input pre-fill relevant questions based on current context

#### 4.4.2 Group Chat
- Two-tab sidebar: "1:1 Chats" and "Group Chats"
- Users create named groups (e.g. "Investment Council") and select 2–4 buddies
- Group avatars shown as stacked chips in sidebar and chat header
- Each buddy responds in turn with staggered timing, colour-coded name tags
- Buddies can reference and respond to each other's points
- @ Reply button directs follow-up questions at a specific buddy
- Three pre-built sample groups: Investment Council (Contrarian + Buffett), Debt War Room (Ramsey + Frugalist), Full Council (Contrarian + Cardone + Kiyosaki)

#### 4.4.3 In-chat Goal Creation
- "🎯 Set as Goal" button appears in message action row when buddy recommends a goal
- Opens inline goal card beneath the message (no navigation away)
- Pre-fills: goal name, target amount, target date, attributing buddy
- Tap "Add to Goals" → card transforms to success confirmation with "View in Goal Tracker →" link
- Goal appears immediately in Goal Tracker screen

#### 4.4.4 In-chat Agentic Actions
- "⚡ Execute This" button appears when buddy recommends a financial action
- Inline agent card appears beneath message: action type, amount, source account, fee, expected yield or interest saved
- Lock disclaimer explaining the execution model and logging
- Three buttons: **Confirm & Execute** / **Decline** / **Discuss first**
- On confirm: browser confirmation dialog → card transforms into execution receipt in thread

> **DESIGN PRINCIPLE:** Advice → commitment → execution should all happen in one continuous scroll, not three different screens.

#### 4.4.5 Signal Alert Messages
- Blue left border and "⚡ Signal · [Source Name]" badge
- Conversation context quote (which past conversation the signal references)
- Signal data: specific actionable information
- Data chips: structured key facts (location, price, budget fit, time-sensitive indicators)
- Three response buttons: Yes / Tell me more / Not interested — each triggers in-character buddy reply

#### 4.4.6 Progress & Outcome Layer
- "Did you act on this?" prompt (72hr Follow-Through Check-In) after significant advice
- Yes / Partially / No — each triggers character-accurate buddy reply
- Answering "Yes" triggers a **Milestone Celebration** toast
- Conversation history searchable by date and topic

---

### 4.5 Notifications
- Event-driven notification dropdown in topbar with unread count badge
- Each notification: buddy name, message preview, trigger source, timestamp
- Notification types: salary/large credit, spending threshold, goal deadline, new subscription detected, market/news event, weekly check-in
- Each notification links to a pre-loaded chat with relevant context already surfaced
- User controls: frequency cap, quiet hours, toggle per buddy — in Settings → Notifications

> **DESIGN PRINCIPLE:** Every notification must answer: "why is this relevant to me right now?" If it cannot answer that, it does not go out.

---

### 4.6 Agentic Actions Dashboard

Standalone screen (⚡ in sidebar) for managing buddy financial execution capabilities.

#### 4.6.1 Trust Hierarchy — Three Tiers
- **Read** — buddy sees DataBank data (automatic once connected)
- **Recommend** — buddy advises in chat (core product function)
- **Execute** — buddy moves money with explicit user confirmation per action

#### 4.6.2 Smart Money Wallet
- Controlled float account separate from main bank account
- User funds the wallet deliberately (e.g. ₦50,000–₦200,000)
- All agent executions draw from wallet balance only
- Per-action spending limit: ₦50,000 (default)
- Daily spending limit across all agents: ₦200,000/day (default)
- Withdraw to bank available at any time; freeze agent access instantly in Settings

#### 4.6.3 Pending Approval Queue
- Agent-suggested actions appear before execution
- Each pending action: action description, source buddy, amount, source account, expected outcome, time-since-request
- Three options: **Approve & Execute** / **Decline** / **Discuss →** (routes to chat)

#### 4.6.4 Execution History
- Full audit log: approved, declined, or pending actions
- Each entry: action description, buddy name, date, amount, outcome (Completed / Declined)
- User note field on declined actions

#### 4.6.5 Allowed Action Types
- MMF / T-bill deposits (from Wallet to connected investment account)
- Debt payoff transfers (from Wallet to credit card or loan)
- Subscription cancellations (via bank debit order)
- Savings transfers (from Wallet to designated savings account)
- ❌ Arbitrary bank transfers are **NOT** allowed

---

### 4.7 Financial Health Score — Overview Aha Moment

Leads the DataBank Analytics Overview tab. The screen users open just to look at themselves.

- **Health Score:** 0–100 composite score as a circular arc gauge
  - Calculated from: savings rate, net worth growth trajectory, debt-to-income ratio, emergency fund progress, investment rate
- **Personal headline:** e.g. "You're in strong shape, Tunde. Your savings rate is 3× the national average."
- **Supporting narrative:** one paragraph — what's going right and top 1–2 things to fix with specific naira amounts
- **4 insight tiles** (colour-coded): green = positive, amber = watch items, red = urgent. Each tappable, pre-fills relevant chat question.
- **Buddy's take:** in-character quote from active buddy with their interpretation of the score and 1–2 recommended actions
- **Three CTAs:** "Discuss With My Buddy →" / "⚡ Execute Recommended Action" / "See Spending Detail →"

> **DESIGN PRINCIPLE:** This is the one screen that creates a reason to open the app without having a question to ask. Every other feature is reactive. This screen is proactive. Design it to be beautiful and personal.

---

### 4.8 Settings & Profile

Five tabs (collapsed into single screen in v2.0):

| Tab | Contents |
|---|---|
| Profile | Personal info, financial profile (income range, primary goal, risk tolerance) |
| Notifications | Per-trigger toggles, quiet hours, max notifications/day |
| Subscriptions & Billing | Active buddy subscriptions, payment method |
| Privacy & Data | Export data, revoke Gmail access, delete all DataBank data, delete account |
| Appearance | Dark/light mode toggle, font size, compact mode, chat bubble style |

Sidebar widget: avatar (with online indicator) + theme toggle above it.

---

## 5. Non-Functional Requirements

### 5.1 Security & Privacy
- All financial data encrypted at rest (AES-256) and in transit (TLS 1.3)
- Gmail OAuth uses read-only scopes — app can never send emails or modify data
- Bank statement files parsed and discarded after ingestion — raw files not stored
- Open Banking uses time-limited permission tokens — no passwords stored
- Agent execution requires explicit in-app confirmation per action — no automatic money movement
- Users can permanently delete all data from Settings in one action
- GDPR and NDPR (Nigeria Data Protection Regulation) compliant
- Two-factor authentication available

### 5.2 Performance
- Chat response time: under 3 seconds for 95% of messages
- App load time: under 2 seconds on mobile (4G connection)
- Analytics dashboard: charts render within 1 second of tab switch
- Gmail sync: background job, does not block UI
- Signal source polling: configurable frequency, does not block chat

### 5.3 Platform & Compatibility
- Progressive Web App (PWA) — works on mobile and desktop without app store
- Mobile-first responsive design: bottom nav bar replaces sidebar on screens under 768px
- Native iOS and Android apps in post-MVP roadmap
- Minimum: iOS 14+, Android 8+, Chrome 90+, Safari 14+

### 5.4 Accessibility
- WCAG 2.1 AA compliance
- Font size minimum 16px for body text
- Sufficient color contrast across all UI components (including dark mode)

---

## 6. Information Architecture

### 6.1 Page Structure

| Screen | Purpose & Key Actions |
|---|---|
| **Marketplace (Home)** | Celebrity hero → archetype grid → celebrity detail cards. Browse, filter, search, compare, select buddy. |
| **Buddy Profile** | Philosophy, sample responses, reviews, subscription panel. Subscribe or preview. |
| **Chat — 1:1** | Active conversation. Send message, view inline charts, create goal, execute action, respond to signals. |
| **Chat — Group** | Multi-buddy conversation. Create group, select buddies, ask questions, @ reply specific buddies. |
| **DataBank — Sources** | Manage all financial data: bank statements, Gmail, manual entry, Open Banking, Signal Sources, Custom API Sessions. |
| **DataBank — Analytics** | Financial Health Score + 5-tab analytics dashboard. Overview, Spending, Investments, Cash Flow, Net Worth. |
| **Goal Tracker** | View and manage financial goals set in chat. Progress bars, milestone alerts, buddy attribution. |
| **Agentic Actions** | Smart Money Wallet, pending approvals, execution history, bank/investment connections, per-action limits. |
| **AI Studio** | Create and manage Finance Buddies (5 steps) or Signal Sources. Knowledge base, personality, model, triggers, preview, publish. |
| **Creator Dashboard** | Analytics and earnings: subscriber count, monthly revenue (gross + 70% share), avg session length, buddy table. |
| **Notifications** | Inbox of past notifications. Each shows buddy, trigger source, message preview, action link. |
| **Profile & Settings** | Profile info, notifications config, subscriptions, privacy & data, appearance. |

### 6.2 Navigation
- **Sidebar (desktop):** Marketplace · Chat · DataBank · Goals · Studio · Creator · Agentic Actions · Profile & Settings
- **Bottom nav (mobile, ≤768px):** Marketplace · Chat · DataBank · Goals · Settings
- **Theme toggle** sits above the profile avatar in the sidebar bottom widget
- **Topbar:** search (live buddy search) · Compare (⚔️) · Notifications (bell) · Chat Now button

---

## 7. MVP Scope & Phasing

### 7.1 MVP — Must Have

| Feature | Description | Priority | v2 Status |
|---|---|---|---|
| Marketplace | Celebrity hero section + archetype grid, filter, search, compare | P0 | Designed |
| Celebrity Sims | 6 celebrity fan simulation buddies with full profiles | P0 | Designed |
| Buddy Profiles | Full profile page, philosophy, samples, reviews, subscription panel | P0 | Designed |
| Chat Interface | Full 1:1 chat with inline charts, goal creation, agent actions, signal alerts | P0 | Designed |
| Group Chat | Multi-buddy conversations, named groups, staggered responses | P0 | Designed |
| DataBank — Upload | Bank statement upload (PDF/CSV) and parsing | P0 | Designed |
| DataBank — Gmail | OAuth Gmail integration for transaction context | P0 | Designed |
| DataBank — Manual Entry | Structured form to add income/expenses/goals manually | P0 | Designed |
| DataBank — Open Banking | Full OAuth bank connection flow with per-permission toggles | P1 | Designed |
| DataBank — Analytics | Financial Health Score + 5-tab analytics dashboard with chart view toggles | P0 | Designed |
| DataBank — Signal Sources | 4-tab signal sources: News, Social, Podcasts, Newsletters | P1 | Designed |
| Custom API Signal Sessions | Third-party signal source marketplace, proactive in-chat signal alerts | P1 | Designed |
| Notifications | Event-triggered notifications with topbar dropdown inbox | P0 | Designed |
| AI Studio — Basic | Upload knowledge base, personality config, model selection, triggers, preview, publish | P0 | Designed |
| Creator Dashboard | Subscriber count, revenue (gross + 70%), avg session length, buddy table | P1 | Designed |
| Goal Tracker | In-chat goal creation, progress tracker, milestone celebrations | P0 | Designed |
| Follow-Through Check-ins | 72hr "Did you act on this?" prompt with character-specific buddy responses | P0 | Designed |
| Agentic Actions | Smart Money Wallet, pending approvals, execution history, bank connections | P1 | Designed |
| Settings & Profile | Account, notifications, subscriptions, privacy, appearance | P0 | Designed |
| Mobile-responsive PWA | Bottom nav on mobile, responsive grids, full feature parity | P0 | Designed |

### 7.2 Post-MVP — Phase 2
- Native iOS and Android apps
- Video or voice chat with Finance Buddy
- Buddy certification / verification badge for high-quality creators
- Advanced Signal Source analytics for providers
- Community features: share insights, public goal boards
- AI Studio v2: video/audio upload with transcription
- Buddy-to-buddy formal debate format
- Open Banking API expansion to additional African markets (Ghana, Kenya, South Africa)

### 7.3 Out of Scope (MVP)
- Native mobile apps (PWA first)
- Direct investment execution via brokerage integration (buddy advises; wallet executes internal transfers only)
- Video or voice chat with Finance Buddy
- Automated trading or portfolio management

---

## 8. Go-to-Market & First 100 Users

**Core GTM Principle:** First 100 users should not come from advertising — they come from trust, specificity, and community.

### 8.2 Acquisition Tactics

| Tactic | Description | Target Outcome |
|---|---|---|
| Celebrity Hook | Celebrity sims on homepage convert faster than any feature explanation | High intent sign-up rate |
| Influencer Partnership | One mid-tier finance influencer (100k–500k followers) builds their own buddy for free | 500–2,000 warm sign-ups |
| Signal Source Launch Partner | Partner with real estate or stock data provider as first verified Signal Source | 200–500 DataBank-connected users |
| DataBank Demo | Public shareable demo — paste sample bank statement and see contextual buddy response. No sign-up required. | Viral sharing; 1,000+ demo users |
| Build in Public | Weekly Twitter/X and LinkedIn updates showing real product progress | 200–500 early followers converted |
| Founding Member Programme | First 100 users get free lifetime access to premium buddies + direct product input | 100 highly engaged founding members |

### 8.3 Retention Strategy
- Proactive notifications tied to real financial events create habit without being requested
- Financial Health Score creates a reason to open the app even without a question
- Context accumulation — the longer users stay, the smarter the advice becomes (switching cost)
- Goal tracking creates emotional investment in the product
- Follow-through check-ins close the advice-to-action loop and reinforce value perception
- Custom API Signal Sessions create ongoing relevance as buddy proactively surfaces deals matching stated goals

---

## 9. Monetisation Model

| Revenue Stream | Model | Platform Take | Notes |
|---|---|---|---|
| Paid Finance Buddy Subscriptions | Monthly subscription set by creator | 30% | Primary revenue stream |
| Custom API Signal Source Subscriptions | Monthly fee per signal source, set by provider | 30% | New in v2.0 |
| DataBank Pro | Monthly fee for advanced DataBank features: Gmail sync, unlimited history, multi-source | 100% | Platform subscription separate from buddy access |
| Featured Placement | Creators pay for featured placement in Marketplace | 100% | Post-MVP only |
| Smart Money Wallet Spread | Marginal spread on Wallet transactions routed through platform treasury | TBD | Long-term; requires financial licensing |
| Enterprise / White Label | Financial institutions license Smart Money for their customers | 100% | Long-term; post-MVP |

> **PRICING NOTE:** Free tier must be genuinely useful — limited chat messages with one free Finance Buddy and basic DataBank upload (no Gmail). Paid tiers unlock unlimited access, Gmail integration, notifications, and Agentic Actions.

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Legal exposure from celebrity simulations | Medium | High | Disclaimer on all chats and profiles; celebrity buddies are user-created; no platform revenue until legal review; fan disclaimer in onboarding |
| Agentic Actions trust barrier | Medium | High | Smart Money Wallet as controlled float; per-action confirmation; execution history audit log; instant freeze in Settings |
| Signal source data quality | High | Medium | Verified Provider badge; user-facing "acted on" rate per source; easy revocation; 30-day trial before billing |
| Low DataBank adoption due to privacy concerns | Medium | High | Transparent DataBank page; clear privacy policy; delete-all option; Gmail read-only; Open Banking OAuth (no passwords); emphasize control in onboarding |
| Creator quality control | High | Medium | Paid buddy review step; user reporting system; quality rating on all cards |
| Notification fatigue causing uninstalls | Medium | High | Strict event-driven notification rule; user frequency controls; creator caps; "quiet hours" in Settings |
| AI hallucination of financial advice | High | Medium | Disclaimers on all advice; "not a licensed financial advisor" on all chats; prompt engineering to cite data sources; follow-through check-in |
| Gmail OAuth trust barrier | Medium | Medium | Show exactly what is read before access granted; offer bank statement upload as alternative |
| AI model provider pricing changes | Medium | High | Contracts with multiple providers; creator migration tools; platform absorbs short-term cost spikes |
| News / signal feed causing poor advice | Medium | Medium | Signal relevance filter before passing to AI; signals are context amplifiers, not substitutes for personal data |

---

## 11. Glossary

| Term | Definition |
|---|---|
| **Agentic Actions** | System by which a Finance Buddy can execute financial operations (transfers, cancellations, deposits) with explicit per-action confirmation |
| **AI Model Selection** | Creator setting in AI Studio determining which underlying AI model (Claude, GPT-4, Gemini) powers a Finance Buddy |
| **Celebrity Sim** | Fan-created Finance Buddy simulating a real public financial figure. Prominently featured on Marketplace homepage. |
| **Compare Buddies** | Feature allowing users to ask the same question to two Finance Buddies simultaneously and see both responses side by side |
| **Context Engine** | System that parses, structures, and delivers financial data as context to the AI on each conversation |
| **Custom API Signal Sessions** | DataBank feature allowing third-party data providers to publish live, context-aware signals into Smart Money via API |
| **DataBank** | The user's personal financial data store — the source of context that makes conversations specific and relevant |
| **Finance Buddy** | An AI avatar in Smart Money that simulates a specific finance personality, school of thought, or expert framework |
| **Financial Health Score** | 0–100 composite score in DataBank Analytics Overview, calculated from savings rate, net worth growth, debt ratio, emergency fund progress, and investment rate |
| **Follow-Through Check-in** | 72hr "Did you act on this?" prompt after significant buddy advice. Yes/Partial/No triggers a character-accurate buddy response. |
| **Group Chat** | Chat session with 2–4 Finance Buddies responding simultaneously, with buddies able to reference each other's points |
| **Live Signal Sources** | Signal inputs beyond personal data: News Media, Social & Creators, Podcasts, Newsletters, and Custom API Sessions |
| **Marketplace** | Discovery and access hub where users browse and subscribe to Finance Buddies — leads with celebrity sims |
| **Milestone Celebration** | Toast notification triggered when a user confirms they acted on advice or hit a goal milestone |
| **Signal Alert** | Proactive message type in chat, triggered by a Custom API Signal Session, quoting relevant past conversation and presenting actionable data with response options |
| **Signal Source** | Third-party data provider registered in Smart Money who publishes live signals via API. Earns per user who subscribes. |
| **Smart Money Wallet** | Controlled float account that Agentic Actions draw from. User funds it deliberately; separate from main bank account. |
| **AI Studio** | Creator tool for building, configuring, and publishing Finance Buddies and Signal Sources |
| **Founding Member** | First 100 users of the platform, given special access and direct product input rights |
| **GMV** | Gross Merchandise Value — total value of transactions processed through the marketplace |
| **PWA** | Progressive Web App — web application that works like a native app on mobile and desktop without requiring an app store |
