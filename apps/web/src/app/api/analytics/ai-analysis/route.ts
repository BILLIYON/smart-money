import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { Pool } from "pg";
import { askAIWithEngine } from "@/lib/ai";

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
}

export async function GET(req: Request) {
  const pool = getPool();

  try {
    const authRes = await requireAuth(req);
    const userId = authRes.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch user AI integration settings
    const { rows: intRows } = await pool.query(
      `SELECT metadata FROM user_integrations WHERE user_id = $1 AND provider = 'gmail' LIMIT 1;`,
      [userId]
    );

    const url = new URL(req.url);
    const engineParam = url.searchParams.get("engine");

    const integrationMeta = intRows[0]?.metadata || {};
    const aiEngine = engineParam || (integrationMeta.ai_engine as string) || "groq-70b";
    const customPrompt = (integrationMeta.ai_prompt as string) || "";
    const enableFallback = true;
    const fallbackEngine = (integrationMeta.fallback_engine && integrationMeta.fallback_engine !== aiEngine) ? (integrationMeta.fallback_engine as string) : "gemini";

    // 2. Fetch Databank entries, Goals & User Profile
    const [entriesRes, goalsRes, userRes] = await Promise.all([
      pool.query(
        `SELECT entry_type, amount, description, category, entry_date, source, metadata, created_at
         FROM databank_entries
         WHERE user_id = $1
         ORDER BY entry_date DESC, created_at DESC;`,
        [userId]
      ),
      pool.query(
        `SELECT title, target_amount, current_amount, status
         FROM goals
         WHERE user_id = $1 AND status = 'active';`,
        [userId]
      ),
      pool.query(
        `SELECT id, full_name, email, currency, plan FROM users WHERE id = $1 LIMIT 1;`,
        [userId]
      ),
    ]);

    const entries = entriesRes.rows || [];
    const goals = goalsRes.rows || [];
    const userRow = userRes.rows[0] || {};
    const userName = userRow.full_name || (userRow.email ? userRow.email.split("@")[0] : "User");

    // Calculate core statistics
    let totalInflowsKobo = 0;
    let totalOutflowsKobo = 0;
    const categoryTotals: Record<string, number> = {};
    const recentTxns: any[] = [];

    for (const e of entries) {
      const amtKobo = Math.abs(Number(e.amount) || 0);
      const isIncome = e.entry_type === "income";
      if (isIncome) {
        totalInflowsKobo += amtKobo;
      } else {
        totalOutflowsKobo += amtKobo;
        const cat = e.category || "General Expense";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amtKobo;
      }

      if (recentTxns.length < 35) {
        recentTxns.push({
          date: e.entry_date,
          description: e.description,
          category: e.category,
          entry_type: e.entry_type,
          amount_naira: Math.round(amtKobo / 100),
          bank: e.metadata?.bank || e.metadata?.provider || null,
          time: e.metadata?.transaction_time || null,
          reason: e.metadata?.reason || null,
          balance_naira: e.metadata?.account_balance ? Math.round(Number(e.metadata.account_balance) / 100) : null,
        });
      }
    }

    const totalInflowsNaira = Math.round(totalInflowsKobo / 100);
    const totalOutflowsNaira = Math.round(totalOutflowsKobo / 100);
    const netCashflowNaira = totalInflowsNaira - totalOutflowsNaira;

    const topCategories = Object.entries(categoryTotals)
      .map(([name, kobo]) => ({
        category: name,
        total_naira: Math.round(kobo / 100),
        pct: totalOutflowsKobo > 0 ? Math.round((kobo / totalOutflowsKobo) * 100) : 0,
      }))
      .sort((a, b) => b.total_naira - a.total_naira)
      .slice(0, 8);

    // If no transactions exist, return empty fallback state gracefully
    if (entries.length === 0) {
      return NextResponse.json({
        ai_engine: aiEngine,
        ai_model_name: getAiModelDisplayName(aiEngine),
        health_score: 0,
        headline: "No Transactions Found",
        ai_buddy_take: "Your DataBank is currently empty. Sync your Gmail or upload bank statements to activate 100% AI Spending Analytics.",
        insights: [],
        anomalies: [],
        budget_recommendations: [],
        cashflow_30d_forecast: {
          projected_income_naira: 0,
          projected_expenses_naira: 0,
          projected_savings_naira: 0,
          verdict: "Sync financial records to generate 30-day AI cashflow projections."
        },
        raw_stats: {
          totalCount: 0,
          totalInflowsNaira: 0,
          totalOutflowsNaira: 0,
          netCashflowNaira: 0,
        }
      });
    }

    // 3. Formulate deep financial AI evaluation prompt
    const systemPrompt = `You are Smart Money's Senior AI Financial Analyst. Analyze ${userName}'s live financial data and return a detailed, rigorous, highly intelligent spending analysis JSON.

${customPrompt ? `USER-SPECIFIED ANALYTICS INSTRUCTIONS:\n- ${customPrompt}\n` : ""}

USER PROFILE:
- Name: ${userName}

FINANCIAL SUMMARY:
- Total Inflows: ₦${totalInflowsNaira.toLocaleString()}
- Total Outflows: ₦${totalOutflowsNaira.toLocaleString()}
- Net Cashflow: ₦${netCashflowNaira.toLocaleString()}
- Total Transactions: ${entries.length}
- Active Financial Goals: ${goals.map(g => `${g.title} (₦${g.current_amount}/₦${g.target_amount})`).join(", ") || "None set"}

TOP EXPENSE CATEGORIES:
${topCategories.map(c => `- ${c.category}: ₦${c.total_naira.toLocaleString()} (${c.pct}%)`).join("\n")}

RECENT TRANSACTIONS SAMPLE:
${recentTxns.slice(0, 20).map(t => `- [${t.date || ""} ${t.time || ""}] ${t.description || "Transaction"} (${t.category || "Uncategorized"}) -> ${t.entry_type === "income" ? "+" : "-"}₦${t.amount_naira.toLocaleString()} | Bank: ${t.bank || "N/A"}`).join("\n")}

REQUIREMENTS:
1. Evaluate ${userName}'s financial health score (0-100) taking into account savings rate, cashflow, and spending discipline.
2. Flag any genuine spending anomalies detected in their transaction history.
3. Recommend realistic budget caps based on their top expense categories.
4. Project 30-day cashflow based on recent income trends and recurring expense velocity.
5. In ai_buddy_take, address ${userName} directly with authoritative, highly relevant financial guidance.

RETURN ONLY VALID JSON (no markdown wrapping, no commentary) matching this schema:
{
  "health_score": <number 0-100 representing overall financial wellness score based on savings rate, cashflow, and discipline>,
  "headline": "<concise 1-sentence executive verdict on financial performance>",
  "ai_buddy_take": "<friendly, direct 2-3 sentence financial advisor review detailing strengths, risks, and next steps>",
  "insights": [
    {
      "id": "1",
      "type": "positive" | "warning" | "action",
      "title": "<insight title>",
      "metric": "<key number/pct indicator, e.g. '28% Savings Rate' or '-₦45k Impulse Spending'>",
      "description": "<1-2 sentence detailed insight explanation>"
    }
  ],
  "anomalies": [
    {
      "id": "a1",
      "merchant": "<merchant name or transaction title>",
      "amount_naira": <number representing transaction amount in Naira>,
      "date": "<transaction date>",
      "flag": "Unusual Spike" | "Recurring Charge" | "Impulse Purchase" | "High Debit",
      "reason": "<1-sentence AI explanation of why this transaction was flagged>"
    }
  ],
  "budget_recommendations": [
    {
      "category": "<category name>",
      "current_spent_naira": <number spent in Naira>,
      "recommended_target_naira": <AI recommended maximum spending cap in Naira>,
      "ai_savings_potential_naira": <potential savings amount in Naira>,
      "tip": "<actionable 1-sentence tip to keep within target>"
    }
  ],
  "cashflow_30d_forecast": {
    "projected_income_naira": <number representing expected 30-day income>,
    "projected_expenses_naira": <number representing expected 30-day expenses>,
    "projected_savings_naira": <number representing projected net savings>,
    "verdict": "<1-sentence AI projection summary>"
  }
}`;

    const rawResponse = await askAIWithEngine(systemPrompt, aiEngine, { enableFallback, fallbackEngine });
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("AI engine failed to produce valid JSON.");
    }

    const aiParsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      ai_engine: aiEngine,
      ai_model_name: getAiModelDisplayName(aiEngine),
      health_score: typeof aiParsed.health_score === "number" ? Math.min(100, Math.max(0, aiParsed.health_score)) : 70,
      headline: String(aiParsed.headline || "AI Spending Analysis Complete"),
      ai_buddy_take: String(aiParsed.ai_buddy_take || "Your financial data has been processed by AI."),
      insights: Array.isArray(aiParsed.insights) ? aiParsed.insights : [],
      anomalies: Array.isArray(aiParsed.anomalies) ? aiParsed.anomalies : [],
      budget_recommendations: Array.isArray(aiParsed.budget_recommendations) ? aiParsed.budget_recommendations : [],
      cashflow_30d_forecast: aiParsed.cashflow_30d_forecast || {
        projected_income_naira: totalInflowsNaira,
        projected_expenses_naira: totalOutflowsNaira,
        projected_savings_naira: netCashflowNaira,
        verdict: "30-day forecast based on current monthly momentum."
      },
      raw_stats: {
        totalCount: entries.length,
        totalInflowsNaira,
        totalOutflowsNaira,
        netCashflowNaira,
      }
    });

  } catch (err: any) {
    console.error("[GET /api/analytics/ai-analysis] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to execute AI spending analysis" },
      { status: 500 }
    );
  }
}

function getAiModelDisplayName(engine: string): string {
  const lower = (engine || "").toLowerCase();
  if (lower.includes("groq") || lower.includes("llama")) return "Groq Llama 3.3 70B (DataBank Model)";
  if (lower.includes("gemini") || lower.includes("google")) return "Google Gemini 1.5 Flash";
  if (lower.includes("bedrock") || lower.includes("aws")) return "AWS Bedrock Claude 3.5 Sonnet";
  if (lower.includes("claude") || lower.includes("anthropic")) return "Anthropic Claude 3.5 Sonnet";
  if (lower.includes("openai") || lower.includes("gpt")) return "OpenAI GPT-4o";
  if (lower.includes("nvidia") || lower.includes("nim")) return "NVIDIA NIM Llama 3.3";
  return `AI Engine (${engine})`;
}
