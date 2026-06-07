@AGENTS.md

# CLAUDE.md — Read this at the start of every session

## Project: Smart Money
AI-powered personal finance advisor marketplace. Users chat with AI
simulations of famous finance personalities (Warren Buffett, Robert
Kiyosaki, etc.) and archetypes. Buddies have access to user financial
data (DataBank) and can execute financial actions (Agentic Actions).

## Stack
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS (custom tokens, no component library)
- Supabase (auth, database, real-time)
- Vercel (hosting + edge functions)
- AI: Anthropic Claude, OpenAI GPT-4, Google Gemini

## CRITICAL: Reference Files
ALWAYS read reference/SmartMoney_v11.html before building any UI.
Find the screen or component by its id attribute, then build it exactly.
The PRD is at reference/SmartMoney_PRD_v2.docx for feature requirements.

## Design Tokens (from prototype)
--navy: #0B1E3D      (primary dark)
--navy2: #132952     (secondary dark)
--green: #00C48C     (primary action/positive)
--green2: #00A677    (hover state)
--gold: #F5A623      (accent/warning)
--bg: #F4F6FB        (page background light)
--card: #ffffff      (card background light)
--text: #0B1E3D      (body text light)
--muted: #6B7A99     (secondary text)
--border: #E2E7F0    (borders)
--radius: 16px       (card border radius)

## Dark Mode Tokens
--bg: #0D1117  --card: #13191F  --text: #E8EFF7
--border: rgba(255,255,255,.08)  --sidebar-bg: #080C10

## Component Naming (match prototype IDs exactly)
screen-marketplace → src/app/(dashboard)/marketplace/page.tsx
screen-chat        → src/app/(dashboard)/chat/page.tsx
screen-databank    → src/app/(dashboard)/databank/page.tsx
screen-agent       → src/app/(dashboard)/agent/page.tsx
screen-goals       → src/app/(dashboard)/goals/page.tsx
screen-studio      → src/app/(dashboard)/studio/page.tsx
screen-creator     → src/app/(dashboard)/creator/page.tsx
screen-settings    → src/app/(dashboard)/settings/page.tsx

## Architecture Rules
1. ALL AI API calls go through src/lib/ai.ts — never call APIs directly
2. ALL Supabase calls go through src/lib/db.ts — never query inline
3. ALL global state goes through src/store/ (Zustand)
4. NEVER use a pre-built component library — build to spec from prototype
5. NEVER invent UI patterns — reference prototype first
6. Use server components by default; add "use client" only when needed

## AI Architecture
src/lib/ai.ts exports:
  sendMessage(buddyId, messages, databankContext) → stream
  sendGroupMessage(buddyIds, messages, databankContext) → stream[]
  processSignalAlert(signal, userContext) → { relevant, message }
  getAgentSuggestion(action, databankContext) → suggestion

## Current Working Screen
1. Marketplace screen .
