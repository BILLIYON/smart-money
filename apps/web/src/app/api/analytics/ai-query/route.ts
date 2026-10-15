import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { Pool } from "pg";
import { askAIWithEngine } from "@/lib/ai";

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
}

export async function POST(req: Request) {
  const pool = getPool();
  try {
    const authRes = await requireAuth(req);
    const userId = authRes.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const query = String(body?.query || "").trim();

    if (!query) {
      return NextResponse.json({ error: "Query prompt is required" }, { status: 400 });
    }

    // 1. Fetch user AI integration settings
    const { rows: intRows } = await pool.query(
      `SELECT metadata FROM user_integrations WHERE user_id = $1 AND provider = 'gmail' LIMIT 1;`,
      [userId]
    );

    const integrationMeta = intRows[0]?.metadata || {};
    const aiEngine = (body?.engine as string) || (integrationMeta.ai_engine as string) || "groq-70b";
    const enableFallback = true;
    const fallbackEngine = (integrationMeta.fallback_engine && integrationMeta.fallback_engine !== aiEngine) ? (integrationMeta.fallback_engine as string) : "gemini";

    // 2. Fetch Databank entries and User Profile for Context
    const [{ rows: entries }, { rows: userRows }] = await Promise.all([
      pool.query(
        `SELECT entry_type, amount, description, category, entry_date, metadata
         FROM databank_entries
         WHERE user_id = $1
         ORDER BY entry_date DESC, created_at DESC
         LIMIT 60;`,
        [userId]
      ),
      pool.query(
        `SELECT full_name, email, currency FROM users WHERE id = $1 LIMIT 1;`,
        [userId]
      ),
    ]);

    const userRow = userRows[0] || {};
    const userName = userRow.full_name || (userRow.email ? userRow.email.split("@")[0] : "User");

    // Compute basic totals
    let totalInflows = 0;
    let totalOutflows = 0;

    const formattedTxns = entries.map((e) => {
      const amtNaira = Math.round(Math.abs(Number(e.amount) || 0) / 100);
      if (e.entry_type === "income") totalInflows += amtNaira;
      else totalOutflows += amtNaira;
      return `- [${e.entry_date || ""} ${e.metadata?.transaction_time || ""}] ${e.description || "Transaction"} (${e.category || "Uncategorized"}) -> ${e.entry_type === "income" ? "+" : "-"}₦${amtNaira.toLocaleString()} | Bank: ${e.metadata?.bank || "N/A"}`;
    });

    const txnsSection = formattedTxns.length > 0 
      ? formattedTxns.join("\n") 
      : "No transaction records currently available.";

    const contextPrompt = `You are Smart Money's AI Financial Advisor answering a direct user question about their spending analytics.

USER'S LIVE FINANCIAL CONTEXT:
- User Name: ${userName}
- Total Inflows: ₦${totalInflows.toLocaleString()}
- Total Outflows: ₦${totalOutflows.toLocaleString()}
- Net Cashflow: ₦${(totalInflows - totalOutflows).toLocaleString()}
- Recent Transactions:
${txnsSection}

USER'S QUESTION:
"${query}"

INSTRUCTIONS:
Provide a clear, highly specific, data-backed 2-4 sentence answer addressing the user's question directly. Use formatting like bullet points or bold text if helpful. If the question asks for advice, offer actionable financial tips based on their actual numbers.`;

    const answer = await askAIWithEngine(contextPrompt, aiEngine, { enableFallback, fallbackEngine });

    return NextResponse.json({
      query,
      answer,
      ai_engine: aiEngine,
      ai_model_name: getAiModelDisplayName(aiEngine),
    });
  } catch (err: any) {
    console.error("[POST /api/analytics/ai-query] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to execute AI spending query" },
      { status: 500 }
    );
  }
}

function getAiModelDisplayName(engine: string): string {
  const lower = (engine || "").toLowerCase();
  if (lower.includes("groq") || lower.includes("llama")) return "Groq Llama 3.3 70B";
  if (lower.includes("gemini") || lower.includes("google")) return "Google Gemini 1.5 Flash";
  if (lower.includes("bedrock") || lower.includes("aws")) return "AWS Bedrock Claude 3.5 Sonnet";
  if (lower.includes("claude") || lower.includes("anthropic")) return "Anthropic Claude 3.5 Sonnet";
  if (lower.includes("openai") || lower.includes("gpt")) return "OpenAI GPT-4o";
  return `AI Engine (${engine})`;
}
