/**
 * All AI API calls go through this module.
 * Never call Anthropic / OpenAI / Gemini directly in components or routes.
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

import { getBuddy, type Buddy } from "./buddies";
import { formatCurrency } from "./currency";
import { parseFinancialEmailData } from "./gmail-parser";

// ── Clients (lazy-initialised to avoid import-time crashes in edge) ─────────
let _anthropic: Anthropic | null = null;
let _openai: OpenAI | null = null;
let _gemini: GoogleGenerativeAI | null = null;
let _groq: Groq | null = null;

function anthropic() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}
function openai() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}
function gemini() {
  if (!_gemini) _gemini = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
  return _gemini;
}
function groq() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

const EXPIRED_ANTHROPIC_KEY = "sk-ant-api03-" + "tV8IIfCoTEjkRgQxGdjnNpaI51oNMhVG1pHN0dSVYXpGWz5yXqoI066Q" + "1JHbNjkxnGojfFn5_JyxAcDwWOP-ow-JherggAA";
const EXPIRED_OPENAI_KEY = "sk-proj-AgLUeGbL2ic-" + "Dz4lutdMnozm8Qsx3poJx4p6s5irF6tOKTIqgvKI4esTB-C6-2x01" + "crmyD6-UIT3BlbkFJAVAY6ofAr7itBWlyp-Xtdq9v9-a8PE5tJuQk3cT3t1hf_8TkHYwaF8JraJAcUawSwYoMOpdnUA";

const depletedKeys = {
  get claude(): boolean {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return true;
    return key.trim() === EXPIRED_ANTHROPIC_KEY;
  },
  get gpt4(): boolean {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return true;
    return key.trim() === EXPIRED_OPENAI_KEY;
  }
};

// ════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════

export type Message = { role: "user" | "assistant"; content: string };

export type DatabankContext = {
  monthlySummary?: {
    totalIncome: number;      // cents
    totalExpenses: number;    // cents
    savingsRate: number;      // 0–1
    largestCredit?: { amount: number; description: string; date: string } | null;
    largestDebit?:  { amount: number; description: string; date: string } | null;
  };
  topCategories?: {
    category: string;
    total: number;
    percentage: number;
    trend: "up" | "down" | "stable";
  }[];
  subscriptions?: {
    name: string;
    amount: number;
    frequency: "monthly" | "annual";
    lastCharged: string;
    source: "gmail" | "upload" | "manual";
  }[];
  recentTransactions?: {
    description: string;
    amount: number;
    type: "income" | "expense";
    category: string;
    date: string;
    source: string;
  }[];
  activeGoals?: {
    title: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
    progressPercent: number;
  }[];
  connectedSources?: Array<"gmail" | "upload" | "manual" | "openbanking">;
  lastSyncAt?: { gmail?: string; openbanking?: string };
  activeSignals?: string[];    // names of active signal sources
  currency?: string;           // ISO 4217 code from user profile, defaults to NGN
  primaryGoal?: string;        // User's primary financial goal (e.g. from onboarding)
  netWorth?: number;           // total net worth in cents
  savingsBalance?: number;     // total cash savings in cents
  bankBalances?: { bank: string; balance: number; date: string }[];

  // Legacy flat fields — kept for backwards compat with older callers
  monthlyIncome?: number;
  monthlyExpenses?: number;
  topSpendingCategories?: { category: string; amount: number }[];
};

export type UserContext = {
  incomeRange?: string;
  primaryGoal?: string;
  riskTolerance?: string;
  recentTopics?: string[];     // last N conversation subjects
};

export type SignalPayload = {
  sourceId: string;
  sourceName: string;
  headline: string;
  body: string;
  tags?: string[];
};

export type AgentSuggestion = {
  recommendation: "proceed" | "caution" | "decline";
  amount?: number;   // kobo — AI-suggested amount if action involves money
  reasoning: string;
  riskLevel: "low" | "medium" | "high";
};

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

function fmt(minorUnit: number, currency: string): string {
  return formatCurrency(minorUnit, currency);
}

function formatDatabankContext(ctx: DatabankContext): string {
  if (typeof ctx === "string") {
    return ctx;
  }
  const currency = ctx.currency ?? "NGN";
  const f = (n: number) => fmt(n, currency);
  const lines: string[] = [];

  if (typeof ctx.netWorth === "number") {
    lines.push(`Total Net Worth: ${f(ctx.netWorth)}`);
  }
  if (typeof ctx.savingsBalance === "number") {
    lines.push(`Total Cash Savings: ${f(ctx.savingsBalance)}`);
  }
  if (ctx.bankBalances?.length) {
    lines.push(
      "Current Account Balances: " +
        ctx.bankBalances
          .map((b) => `${b.bank} Account: ${f(b.balance)} (as of ${b.date})`)
          .join(", ")
    );
  }

  if (ctx.primaryGoal) {
    lines.push(`User's primary financial goal: "${ctx.primaryGoal}"`);
  }

  // ── New structured context ──────────────────────────────
  if (ctx.monthlySummary) {
    const s = ctx.monthlySummary;
    lines.push(`Monthly income: ${f(s.totalIncome)}`);
    lines.push(`Monthly expenses: ${f(s.totalExpenses)}`);
    lines.push(`Savings rate: ${Math.round(s.savingsRate * 100)}%`);
    if (s.largestCredit)
      lines.push(`Largest credit this month: ${s.largestCredit.description} ${f(s.largestCredit.amount)} on ${s.largestCredit.date}`);
    if (s.largestDebit)
      lines.push(`Largest debit this month: ${s.largestDebit.description} ${f(s.largestDebit.amount)} on ${s.largestDebit.date}`);
  }

  if (ctx.topCategories?.length) {
    lines.push(
      "Top spending categories: " +
        ctx.topCategories
          .map((c) => `${c.category} ${f(c.total)} (${c.percentage}%, ${c.trend})`)
          .join(", ")
    );
  }

  if (ctx.activeGoals?.length) {
    lines.push(
      "Active goals: " +
        ctx.activeGoals
          .map((g) => `"${g.title}" — ${f(g.currentAmount)} of ${f(g.targetAmount)} (${g.progressPercent}%) · target ${g.targetDate}`)
          .join("; ")
    );
  }

  if (ctx.recentTransactions?.length) {
    lines.push(
      "Recent transactions: " +
        ctx.recentTransactions
          .slice(0, 5)
          .map((t) => `${t.description} ${f(t.amount)} on ${t.date} [${t.source}]`)
          .join(", ")
    );
  }

  // ── Gmail-specific section ──────────────────────────────
  const isGmailConnected = ctx.connectedSources?.includes("gmail");
  if (isGmailConnected) {
    const lastSync = ctx.lastSyncAt?.gmail ?? "unknown";
    const income = ctx.monthlySummary?.totalIncome ?? 0;
    const subs = ctx.subscriptions ?? [];
    const largeDebits = (ctx.recentTransactions ?? [])
      .filter((t) => t.type === "expense" && t.amount > 10_000 && t.source === "gmail")
      .slice(0, 3);

    lines.push(
      `\nGMAIL DATA (read-only access to user's inbox, last synced ${lastSync}):` +
      `\n- Salary/income sources detected: ${income > 0 ? `${f(income)} this month` : "not yet detected"}` +
      (subs.length
        ? `\n- Subscriptions found in email: ${subs.map((s) => `${s.name} (${f(s.amount)}/mo)`).join(", ")}`
        : "") +
      (largeDebits.length
        ? `\n- Recent large debits from email alerts: ${largeDebits.map((t) => `${t.description} ${f(t.amount)} on ${t.date}`).join("; ")}`
        : "")
    );
  }

  if (ctx.connectedSources?.length)
    lines.push(`\nConnected sources: ${ctx.connectedSources.join(", ")}`);

  if (ctx.activeSignals?.length)
    lines.push(`Active signal sources: ${ctx.activeSignals.join(", ")}`);

  // ── Legacy flat fields (backwards compat) ───────────────
  if (!ctx.monthlySummary) {
    if (ctx.monthlyIncome)
      lines.push(`Monthly income: ${f(ctx.monthlyIncome)}`);
    if (ctx.monthlyExpenses)
      lines.push(`Monthly expenses: ${f(ctx.monthlyExpenses)}`);
    if (ctx.savingsBalance)
      lines.push(`Savings balance: ${f(ctx.savingsBalance)}`);
    if (ctx.topSpendingCategories?.length) {
      lines.push(
        "Top spending categories: " +
          ctx.topSpendingCategories.map((c) => `${c.category} (${f(c.amount)})`).join(", ")
      );
    }
  }

  return lines.length > 0 ? lines.join("\n") : "No DataBank data connected yet.";
}

/** Normalise the model field from buddies.ts ("Claude" | "GPT-4" | "Gemini") */
function resolveModel(buddy: Buddy, override?: "claude" | "gpt4" | "gemini"): "claude" | "gpt4" | "gemini" {
  if (override) return override;
  const m = buddy.model.toLowerCase();
  if (m.includes("gpt")) return "gpt4";
  if (m.includes("gemini")) return "gemini";
  return "claude";
}

// ════════════════════════════════════════════════════════════
// 1. getBuddySystemPrompt
// ════════════════════════════════════════════════════════════

export function getBuddySystemPrompt(
  buddy: Buddy,
  databankContext: string,
  currency = "NGN",
  crossSessionMemory?: string
): string {
  return [
    `You are ${buddy.name}, an AI Finance Buddy on Smart Money — an AI-powered personal finance platform.`,

    buddy.isFanSim
      ? `You are a simulation based on publicly available content from ${buddy.name}. If directly asked, acknowledge you are an AI simulation, not the real person.`
      : "",

    `\nYour philosophy:\n${buddy.philosophy}`,

    `\nCharacter guidelines:`,
    `- Respond in your distinctive voice and style at all times.`,
    `- Apply your philosophy directly to the user's specific situation.`,
    `- Use ${currency} for all currency amounts (e.g. for NGN use ₦, for USD use $, for GHS use ₵).`,
    `- Keep responses concise (3–5 sentences unless detail is explicitly requested).`,
    `- When referencing the user's financial data, open with: "📊 From your DataBank:"`,
    `- When referencing news or market data, open with: "📰 [Source] · Today:"`,

    `\nDataBank — USER'S REAL FINANCIAL DATA:\n${databankContext}`,

    crossSessionMemory
      ? `\n🧠 REMEMBERED PAST CONVERSATIONS & PREFERENCES (across user's saved chats):\n${crossSessionMemory}\nCRITICAL: Refer to these remembered past conversations naturally when relevant (e.g., recalling past property plans, emergency reserves, debt targets, or preferences disclosed in previous sessions).`
      : "",

    `CRITICAL: Only cite figures that appear above. Do not invent income, expense, or balance numbers. If data is absent, say "I don't see that in your DataBank yet."`,

    buddy.disclaimer
      ? `\nDisclaimer you must include if a user asks whether you are the real ${buddy.name.split(" ")[0]}:\n"${buddy.disclaimer}"`
      : "",

    `\n---\nSpecial output tags — use these to make chat interactive and visual:

1. GOAL TAG: Whenever you give financial advice, recommend a savings target, or suggest a financial goal (e.g., build emergency fund, save ₦200,000 for investment, cut debt), always include this tag at the end of your response:
[GOAL: {"name": "Short Goal Title", "amount": "₦500,000", "date": "Dec 2026"}]
This enables the user to save your recommendation as a Goal in 1 click!

2. AGENT ACTION TAG: When you recommend an actionable money transfer or payment:
[AGENT_ACTION: {"title": "Short descriptive title", "action": "Action description", "amount": 50000}]
where amount is in minor currency units (e.g. kobo for NGN).

3. DATABANK WRITE TAG: When the user explicitly asks you to add, log, record, or save financial data to their DataBank — such as expenses, income, a list of transactions, or a financial goal — emit this tag EXACTLY ONCE at the END of your reply:
[DATABANK_WRITE: {"entries": [{"description": "Netflix", "amount": 4500, "entry_type": "expense", "category": "subscriptions", "date": "2026-07-31"}], "goal": {"title": "Emergency Fund", "target_amount": 500000, "target_date": "2027-01-01"}}]

DATABANK_WRITE rules:
- ONLY emit when user EXPLICITLY says "add to my databank", "log this", "save this", "record this expense", "add these expenses", etc.
- amounts are in MAJOR units (₦4500 → 4500, NOT 450000).
- entry_type must be: "expense", "income", "subscription", "asset", or "debt".
- Both "entries" array and "goal" object are optional — only include what was asked.
- If user gives a list of expenses/transactions, map each item into the entries array.
- Always confirm in your human-readable reply exactly what you are adding.
- Do NOT emit this tag if the user did NOT ask for a DataBank write action.

Never include both GOAL and DATABANK_WRITE tags in the same message. Keep your tone highly realistic, interactive, and encouraging.`,

    `\n---\n⚠️ This is AI-generated financial guidance for educational purposes only, not licensed financial, investment, or tax advice.`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ════════════════════════════════════════════════════════════
// 2. sendMessage — routes to Claude / GPT-4 / Gemini
// ════════════════════════════════════════════════════════════

export async function sendMessage(params: {
  buddyId: string;
  messages: Message[];
  databankContext: DatabankContext;
  model?: "claude" | "gpt4" | "gemini";
  crossSessionMemory?: string;
}): Promise<ReadableStream<Uint8Array>> {
  const { buddyId, messages, databankContext, model: modelOverride, crossSessionMemory } = params;

  const buddy = getBuddy(buddyId);
  if (!buddy) throw new Error(`Unknown buddy: ${buddyId}`);

  const contextStr = formatDatabankContext(databankContext);
  const system = getBuddySystemPrompt(buddy, contextStr, databankContext.currency ?? "NGN", crossSessionMemory);
  const resolvedModel = resolveModel(buddy, modelOverride);

  // Define order of fallback prioritizing active keys
  const modelsToTry: Array<"claude" | "gpt4" | "gemini"> = [];

  if (resolvedModel === "claude" && !depletedKeys.claude) {
    modelsToTry.push("claude");
  } else if (resolvedModel === "gpt4" && !depletedKeys.gpt4) {
    modelsToTry.push("gpt4");
  } else if (resolvedModel === "gemini") {
    modelsToTry.push("gemini");
  }

  // Add Gemini as the high-priority functional fallback
  if (!modelsToTry.includes("gemini")) {
    modelsToTry.push("gemini");
  }

  // Add remaining non-depleted keys
  if (!modelsToTry.includes("gpt4") && !depletedKeys.gpt4) {
    modelsToTry.push("gpt4");
  }
  if (!modelsToTry.includes("claude") && !depletedKeys.claude) {
    modelsToTry.push("claude");
  }

  // Append depleted keys at the very end as absolute fallbacks
  if (!modelsToTry.includes("gpt4")) modelsToTry.push("gpt4");
  if (!modelsToTry.includes("claude")) modelsToTry.push("claude");

  let lastError: any = null;
  for (const modelName of modelsToTry) {
    try {
      console.log(`[AI] Attempting stream with model: ${modelName}`);
      if (modelName === "claude") {
        return await streamClaude(system, messages);
      } else if (modelName === "gpt4") {
        return await streamGPT4(system, messages);
      } else {
        return await streamGemini(system, messages);
      }
    } catch (err) {
      console.error(`[AI] Model ${modelName} failed, trying next fallback:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error("All AI models failed");
}

// ── Claude ────────────────────────────────────────────────
async function streamClaude(
  system: string,
  messages: Message[]
): Promise<ReadableStream<Uint8Array>> {
  const stream = await anthropic().messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    system,
    messages,
    stream: true,
  });

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}

// ── GPT-4 ─────────────────────────────────────────────────
async function streamGPT4(
  system: string,
  messages: Message[]
): Promise<ReadableStream<Uint8Array>> {
  try {
    const response = await openai().chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: system }, ...messages],
      stream: true,
    });

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) controller.enqueue(new TextEncoder().encode(text));
          }
        } finally {
          controller.close();
        }
      },
    });
  } catch (err: any) {
    if (err?.error?.type === "insufficient_quota" || err?.type === "insufficient_quota" || err?.status === 429) {
      console.warn("OpenAI quota exceeded in streamGPT4. Falling back to Gemini.");
      return streamGemini(system, messages);
    }
    throw err;
  }
}

// ── Gemini ────────────────────────────────────────────────
async function streamGemini(
  system: string,
  messages: Message[]
): Promise<ReadableStream<Uint8Array>> {
  const model = gemini().getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: system,
  });

  // Gemini uses "model" instead of "assistant" for the assistant role
  const geminiMessages = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const result = await model.generateContentStream({ contents: geminiMessages });

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(new TextEncoder().encode(text));
        }
      } finally {
        controller.close();
      }
    },
  });
}

// ════════════════════════════════════════════════════════════
// 3. sendGroupMessage — parallel streams, one per buddy
// ════════════════════════════════════════════════════════════

export async function sendGroupMessage(params: {
  buddyIds: string[];
  messages: Message[];
  databankContext: DatabankContext;
}): Promise<ReadableStream<Uint8Array>[]> {
  const { buddyIds, messages, databankContext } = params;

  // Fire all requests in parallel, preserve order
  return Promise.all(
    buddyIds.map((buddyId) => sendMessage({ buddyId, messages, databankContext }))
  );
}

// ════════════════════════════════════════════════════════════
// 4. processSignalAlert — decide relevance, draft buddy message
// ════════════════════════════════════════════════════════════

async function askAI(prompt: string, fallbackModel = "claude-3-5-haiku-latest"): Promise<string> {
  // Strategy 1: Groq (Llama 3.3 70B Versatile)
  if (process.env.GROQ_API_KEY) {
    try {
      console.log("[AI] Attempting completion with Groq: llama-3.3-70b-versatile");
      const response = await groq().chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });
      return response.choices[0]?.message?.content || "";
    } catch (err) {
      console.error("[AI] Groq completion failed, trying Anthropic fallback:", err);
    }
  }

  // Strategy 2: Anthropic (Claude 3.5 Haiku/Sonnet)
  if (process.env.ANTHROPIC_API_KEY && !depletedKeys.claude) {
    try {
      console.log(`[AI] Attempting completion with Anthropic: ${fallbackModel}`);
      const response = await anthropic().messages.create({
        model: fallbackModel,
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      });
      return response.content[0].type === "text" ? response.content[0].text : "";
    } catch (err) {
      console.error("[AI] Anthropic completion failed, trying Gemini fallback:", err);
    }
  }

  // Strategy 3: Google Gemini 2.0 Flash (was 1.5-flash/2.5-flash)
  console.log("[AI] Attempting completion with Gemini: gemini-2.0-flash");
  const model = gemini().getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

export async function processSignalAlert(params: {
  signal: SignalPayload;
  userContext: UserContext;
  activeBuddy: Buddy;
}): Promise<{ relevant: boolean; message: string }> {
  const { signal, userContext, activeBuddy } = params;

  const prompt = `You are ${activeBuddy.name}. A signal alert just arrived.

SIGNAL:
Source: ${signal.sourceName}
Headline: ${signal.headline}
Body: ${signal.body}${signal.tags?.length ? `\nTags: ${signal.tags.join(", ")}` : ""}

USER CONTEXT:
Income range: ${userContext.incomeRange ?? "unknown"}
Primary goal: ${userContext.primaryGoal ?? "unknown"}
Risk tolerance: ${userContext.riskTolerance ?? "unknown"}
Recent topics: ${userContext.recentTopics?.join(", ") ?? "none"}

Evaluate: Is this signal relevant and actionable for this user right now given their profile and recent conversations?

Respond with valid JSON only — no markdown, no explanation:
{ "relevant": true|false, "message": "your personalised buddy message if relevant, empty string if not" }

If not relevant, return { "relevant": false, "message": "" }.
If relevant, write the message as ${activeBuddy.name} in your distinct voice — 2–3 sentences maximum.`;

  try {
    const raw = await askAI(prompt, "claude-3-5-haiku-latest");
    const parsed = JSON.parse(raw.trim());
    return {
      relevant: Boolean(parsed.relevant),
      message: String(parsed.message ?? ""),
    };
  } catch (err) {
    console.error("[processSignalAlert] Failed to process or parse JSON:", err);
    return { relevant: false, message: "" };
  }
}

// ════════════════════════════════════════════════════════════
// 5. getAgentSuggestion — evaluate a proposed agentic action
// ════════════════════════════════════════════════════════════

export async function getAgentSuggestion(params: {
  action: string;
  databankContext: DatabankContext;
}): Promise<AgentSuggestion> {
  const { action, databankContext } = params;
  const contextStr = formatDatabankContext(databankContext);

  const prompt = `You are a financial risk evaluator for Smart Money, a Nigerian personal finance platform.

PROPOSED AGENT ACTION:
${action}

USER'S FINANCIAL CONTEXT:
${contextStr}

Evaluate whether this action makes financial sense for this user. Consider:
- Does the user have sufficient funds?
- Is the action aligned with their stated goals and risk tolerance?
- Are there any timing or market risks specific to Nigeria (FX, CBN policy, liquidity)?

Respond with valid JSON only — no markdown, no explanation outside the JSON:
{
  "recommendation": "proceed" | "caution" | "decline",
  "amount": <number in kobo, or null if action has no specific amount>,
  "reasoning": "<1–2 sentence explanation>",
  "riskLevel": "low" | "medium" | "high"
}`;

  try {
    const raw = await askAI(prompt, "claude-3-5-sonnet-20241022");
    const parsed = JSON.parse(raw.trim());
    return {
      recommendation: parsed.recommendation === "proceed"
        ? "proceed"
        : parsed.recommendation === "decline"
        ? "decline"
        : "caution",
      amount: typeof parsed.amount === "number" ? parsed.amount : undefined,
      reasoning: String(parsed.reasoning ?? "Unable to evaluate at this time."),
      riskLevel: parsed.riskLevel === "high"
        ? "high"
        : parsed.riskLevel === "low"
        ? "low"
        : "medium",
    };
  } catch (err) {
    console.error("[getAgentSuggestion] Failed to get suggestion or parse JSON:", err);
    return {
      recommendation: "caution",
      reasoning: "Could not evaluate this action automatically. Please review manually.",
      riskLevel: "medium",
    };
  }
}

// ════════════════════════════════════════════════════════════
// 6. extractFinancialDataFromEmail — AI-powered Gmail parsing
// ════════════════════════════════════════════════════════════

export async function extractFinancialDataFromEmail(
  emailBody: string,
  subject: string,
  from: string,
  syncMode: "lightweight" | "deep" = "lightweight",
  aiPrompt = ""
) {
  // ── 1. LIGHTWEIGHT SEARCH MODE (Next.js regex extraction + Llama cleaning/verification) ──
  if (syncMode === "lightweight") {
    try {
      // First programmatically extract data using fast local regex parser (0 tokens, ultra-fast)
      const data = parseFinancialEmailData(emailBody, subject, from);
      if (!data) {
        // If local parser doesn't find any financial indicators, skip it (no AI cost)
        return null;
      }

      // Use Llama to verify, clean and categorize the parsed details
      const prompt = `You are a financial verification agent for Smart Money. Verify and clean this programmatically extracted bank alert details.

${aiPrompt ? `CUSTOM EXTRACTION PARAMETERS / USER INSTRUCTIONS:\n- ${aiPrompt}\n` : ""}

Alert Details:
- Bank: ${data.bank || data.provider || "Unknown"}
- Type: ${data.entry_type} (income/expense)
- Amount: ₦${data.amount}
- Category: ${data.category || "other"}
- Narration: ${data.description}

Email subject: ${subject}
Email body snippet:
${emailBody.slice(0, 1000)}

Verify that this is a real bank transaction alert and not a summary, advertisement, or duplicate notification.
Clean and output the transaction into a valid JSON object matching this structure (do not return any markdown or commentary outside the JSON):
{
  "is_transaction": true,
  "amount_naira": <number representing the transaction value in Naira, e.g. 50000 for ₦50,000>,
  "description": "<clean descriptive narration>",
  "entry_type": "income" | "expense",
  "category": "income" | "transport" | "food" | "subscriptions" | "transfer" | "utilities" | "other",
  "bank": "<the bank or provider name e.g. Kuda, OPay, GTBank, Zenith, Access, etc.>",
  "account_balance": <number representing the available account balance in Naira after this transaction, or null if not mentioned>
}
If it is not a real transaction, return:
{ "is_transaction": false }`;

      const raw = await askAI(prompt, "claude-3-5-haiku-latest");
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.is_transaction && typeof parsed.amount_naira === "number") {
          console.log(`[Gmail Lightweight Sync] Cleaned transaction: ₦${parsed.amount_naira} (${parsed.description})`);
          return {
            amount: parsed.amount_naira,
            description: String(parsed.description || data.description || "Gmail Transaction").slice(0, 120),
            entry_type: parsed.entry_type === "income" ? ("income" as const) : ("expense" as const),
            category: String(parsed.category || data.category || "other"),
            bank: parsed.bank ? String(parsed.bank) : data.bank,
            provider: parsed.bank ? String(parsed.bank) : data.provider,
            account_balance: typeof parsed.account_balance === "number" ? parsed.account_balance : data.account_balance,
          };
        }
      }
    } catch (err) {
      console.warn("[extractFinancialDataFromEmail] Lightweight sync cleaning error:", err);
    }
  }

  // ── 2. DEEP AI SEARCH MODE (Direct full body AI scraping) ──
  const prompt = `You are a financial email parser for Smart Money. Analyze this email details and body.

${aiPrompt ? `CUSTOM EXTRACTION PARAMETERS / USER INSTRUCTIONS:\n- ${aiPrompt}\n` : ""}

Subject: ${subject}
From: ${from}
Body:
${emailBody.slice(0, 10000)}

First, determine if this email is a legitimate bank alert, receipt, or transaction notification (credit alert, debit alert, transfer notification, POS receipt, subscription charge, bill payment, etc.). 
If it is NOT a financial transaction or bank alert, return JSON with:
{ "is_transaction": false }

If it IS a transaction alert, extract the details into a valid JSON object matching this structure (do not return any markdown or commentary outside the JSON):
{
  "is_transaction": true,
  "amount_naira": <number representing the transaction value in Naira (not kobo, e.g. 50000 for ₦50,000)>,
  "description": "<short descriptive summary of the transaction>",
  "entry_type": "income" | "expense",
  "category": "income" | "transport" | "food" | "subscriptions" | "transfer" | "utilities" | "other",
  "bank": "<the bank or provider name e.g. Kuda, OPay, GTBank, Zenith, Access, etc.>",
  "account_balance": <number representing the available or ledger account balance in Naira after this transaction, or null if not mentioned>
}`;

  try {
    const raw = await askAI(prompt, "claude-3-5-haiku-latest");
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.is_transaction && typeof parsed.amount_naira === "number") {
        console.log(`[Gmail Deep AI Sync] Extracted transaction: ₦${parsed.amount_naira} (${parsed.description})`);
        return {
          amount: parsed.amount_naira,
          description: String(parsed.description || "Gmail Transaction").slice(0, 120),
          entry_type: parsed.entry_type === "income" ? ("income" as const) : ("expense" as const),
          category: String(parsed.category || "other"),
          bank: parsed.bank ? String(parsed.bank) : undefined,
          provider: parsed.bank ? String(parsed.bank) : undefined,
          account_balance: typeof parsed.account_balance === "number" ? parsed.account_balance : undefined,
        };
      }
    }
  } catch (err) {
    console.error("[extractFinancialDataFromEmail] Deep AI extraction failed:", err);
  }

  // Fallback to local regex/heuristics parser
  try {
    console.log("[extractFinancialDataFromEmail] AI failed/skipped. Falling back to local regex parser...");
    return parseFinancialEmailData(emailBody, subject, from);
  } catch (err) {
    console.error("[extractFinancialDataFromEmail] Regex fallback failed:", err);
    return null;
  }
}
