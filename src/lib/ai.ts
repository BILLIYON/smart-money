/**
 * All AI API calls go through this module.
 * Never call Anthropic / OpenAI / Gemini directly in components or routes.
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { getBuddy, type Buddy } from "./buddies";
import { formatCurrency } from "./currency";

// ── Clients (lazy-initialised to avoid import-time crashes in edge) ─────────
let _anthropic: Anthropic | null = null;
let _openai: OpenAI | null = null;
let _gemini: GoogleGenerativeAI | null = null;

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

  // Legacy flat fields — kept for backwards compat with older callers
  monthlyIncome?: number;
  monthlyExpenses?: number;
  savingsBalance?: number;
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
  const currency = ctx.currency ?? "NGN";
  const f = (n: number) => fmt(n, currency);
  const lines: string[] = [];

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

export function getBuddySystemPrompt(buddy: Buddy, databankContext: string, currency = "NGN"): string {
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
    `CRITICAL: Only cite figures that appear above. Do not invent income, expense, or balance numbers. If data is absent, say "I don't see that in your DataBank yet."`,

    buddy.disclaimer
      ? `\nDisclaimer you must include if a user asks whether you are the real ${buddy.name.split(" ")[0]}:\n"${buddy.disclaimer}"`
      : "",

    `\n---\nTo propose a specific financial action that the user should execute through their Smart Money wallet, include exactly this block at the end of your message: [AGENT_ACTION: {"title": "Short descriptive title", "action": "Action to be performed", "amount": 50000}] where amount is the numeric value in minor units (e.g. kobo for NGN). Only do this if you are highly confident the user should execute it.`,

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
}): Promise<ReadableStream<Uint8Array>> {
  const { buddyId, messages, databankContext, model: modelOverride } = params;

  const buddy = getBuddy(buddyId);
  if (!buddy) throw new Error(`Unknown buddy: ${buddyId}`);

  const contextStr = formatDatabankContext(databankContext);
  const system = getBuddySystemPrompt(buddy, contextStr, databankContext.currency ?? "NGN");
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

  // Fallback to Gemini
  console.log("[AI] Attempting completion with Gemini: gemini-2.5-flash");
  const model = gemini().getGenerativeModel({ model: "gemini-2.5-flash" });
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
