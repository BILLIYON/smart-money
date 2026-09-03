import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { Pool } from "pg";
import { askAIWithEngine } from "@/lib/ai";
import type { CleaningSuggestion } from "../scan/route";

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
}

export async function POST(req: Request) {
  const pool = getPool();
  try {
    const { userId, error } = await requireAuth();
    if (error || !userId) {
      return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt: userInstruction, engine = "groq" } = (await req.json()) as { prompt: string; engine?: string };

    if (!userInstruction || typeof userInstruction !== "string" || !userInstruction.trim()) {
      return NextResponse.json({ error: "prompt string is required" }, { status: 400 });
    }

    // Fetch user's recent databank entries (limit 150 for prompt context)
    const { rows } = await pool.query(
      `SELECT id, entry_type, amount, description, category, entry_date, source, metadata
       FROM databank_entries
       WHERE user_id = $1
       ORDER BY entry_date DESC, created_at DESC
       LIMIT 150;`,
      [userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        suggestions: [],
        analyticsImpact: { incomeChange: 0, expenseChange: 0 },
        message: "No DataBank entries found to clean.",
      });
    }

    // Format transaction summary for AI prompt
    const entriesSummary = rows.map((r) => ({
      id: r.id,
      date: r.entry_date,
      desc: r.description || "No description",
      type: r.entry_type,
      amount_naira: Math.abs(Number(r.amount)) / 100,
      cat: r.category || "other",
      source: r.source,
    }));

    const aiPrompt = `You are an AI DataBank Agent for Smart Money. Analyze the user's financial transactions and fulfill their exact cleaning or categorization instruction.

USER INSTRUCTION: "${userInstruction.trim()}"

TRANSACTIONS DATA (up to 150 items):
${JSON.stringify(entriesSummary, null, 2)}

INSTRUCTIONS FOR OUTPUT:
Find any transactions matching the user's request or needing cleaning/correction based on their prompt.
Return a valid JSON object matching this structure (do not output any markdown or commentary outside the JSON):
{
  "suggestions": [
    {
      "id": "<transaction entry id>",
      "issue_type": "inverted_direction" | "duplicate" | "uncategorized" | "zero_amount",
      "issue_title": "<short descriptive title of the fix>",
      "issue_description": "<1 sentence explanation of why this change fulfills user instruction>",
      "suggested": {
        "action": "update" | "delete",
        "entry_type": "income" | "expense" | "subscription" | "asset" | "debt" (optional),
        "amount": <number in kobo/cents, e.g. 500000 for ₦5,000> (optional),
        "category": "<clean category name>" (optional),
        "description": "<cleaned description>" (optional)
      }
    }
  ],
  "message": "<1 sentence agent summary of recommended modifications>"
}

If no transactions match the instruction, return:
{ "suggestions": [], "message": "No matching transactions found for your prompt." }`;

    let suggestions: CleaningSuggestion[] = [];
    let agentMessage = "AI Agent processed your instruction.";

    try {
      const raw = await askAIWithEngine(aiPrompt, engine, { enableFallback: true, fallbackEngine: "gemini" });
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.suggestions)) {
          agentMessage = parsed.message || agentMessage;
          for (const item of parsed.suggestions) {
            const currentObj = rows.find((r) => r.id === item.id);
            if (currentObj) {
              suggestions.push({
                id: item.id,
                issue_type: item.issue_type || "uncategorized",
                issue_title: item.issue_title || "AI Prompt Action",
                issue_description: item.issue_description || userInstruction,
                current: {
                  description: currentObj.description || "",
                  entry_type: currentObj.entry_type,
                  amount: Number(currentObj.amount),
                  category: currentObj.category || "Uncategorized",
                  entry_date: currentObj.entry_date,
                },
                suggested: {
                  action: item.suggested?.action || "update",
                  entry_type: item.suggested?.entry_type,
                  amount: typeof item.suggested?.amount === "number" ? item.suggested.amount : undefined,
                  category: item.suggested?.category,
                  description: item.suggested?.description,
                },
              });
            }
          }
        }
      }
    } catch (aiErr) {
      console.warn("[clean/prompt] AI model call warning:", aiErr);
    }

    // Calculate Spending Analytics Impact
    let incomeChange = 0;
    let expenseChange = 0;

    for (const s of suggestions) {
      const currVal = Math.abs(s.current.amount) / 100;
      if (s.suggested.action === "delete") {
        if (s.current.entry_type === "income") incomeChange -= currVal;
        else if (s.current.entry_type === "expense") expenseChange -= currVal;
      } else if (s.suggested.action === "update") {
        const nextType = s.suggested.entry_type || s.current.entry_type;
        const nextVal = typeof s.suggested.amount === "number" ? Math.abs(s.suggested.amount) / 100 : currVal;

        if (s.current.entry_type === "income" && nextType === "expense") {
          incomeChange -= currVal;
          expenseChange += nextVal;
        } else if (s.current.entry_type === "expense" && nextType === "income") {
          expenseChange -= currVal;
          incomeChange += nextVal;
        } else if (nextType === "expense") {
          expenseChange += nextVal - currVal;
        } else if (nextType === "income") {
          incomeChange += nextVal - currVal;
        }
      }
    }

    return NextResponse.json({
      success: true,
      suggestions,
      analyticsImpact: { incomeChange, expenseChange },
      message: agentMessage,
    });
  } catch (err: any) {
    console.error("[POST /api/databank/clean/prompt] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to process prompt" }, { status: 500 });
  } finally {
    await pool.end();
  }
}
