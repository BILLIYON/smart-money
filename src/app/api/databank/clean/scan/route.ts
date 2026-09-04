import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { Pool } from "pg";
import { parseFinancialEmailData, inferEntryType } from "@/lib/gmail-parser";

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
}

export type CleaningSuggestion = {
  id: string;
  issue_type: "inverted_direction" | "duplicate" | "uncategorized" | "zero_amount";
  issue_title: string;
  issue_description: string;
  current: {
    description: string;
    entry_type: string;
    amount: number;
    category: string;
    entry_date: string;
  };
  suggested: {
    action: "update" | "delete";
    entry_type?: "income" | "expense" | "subscription" | "asset" | "debt";
    amount?: number;
    category?: string;
    description?: string;
  };
};

export async function GET(req: Request) {
  const pool = getPool();
  try {
    const { userId, error } = await requireAuth();
    if (error || !userId) {
      return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rows } = await pool.query(
      `SELECT id, source, entry_type, amount, description, category, entry_date, metadata
       FROM databank_entries
       WHERE user_id = $1
       ORDER BY entry_date DESC, created_at DESC;`,
      [userId]
    );

    const suggestions: CleaningSuggestion[] = [];
    const seenMap = new Map<string, string>(); // key -> entry id for duplicate detection

    for (const row of rows) {
      const amountMajor = Math.abs(Number(row.amount)) / 100;
      const desc = row.description || "";
      const cat = (row.category || "other").toLowerCase();
      const meta = typeof row.metadata === "string" ? JSON.parse(row.metadata) : (row.metadata || {});

      // ── Issue 1: Zero Amount ─────────────────────────────────────────────
      if (Number(row.amount) === 0) {
        // Try extracting amount from raw email snippet in metadata if available
        let fixedAmount = 0;
        if (meta.email_subject || meta.email_from) {
          const parsed = parseFinancialEmailData(meta.email_body || "", meta.email_subject || desc, meta.email_from || "");
          if (parsed && parsed.amount > 0) {
            fixedAmount = Math.round(parsed.amount * 100);
          }
        }

        suggestions.push({
          id: row.id,
          issue_type: "zero_amount",
          issue_title: "Zero Amount Entry",
          issue_description: "Transaction is recorded with ₦0.00 value.",
          current: {
            description: desc,
            entry_type: row.entry_type,
            amount: Number(row.amount),
            category: row.category || "Uncategorized",
            entry_date: row.entry_date,
          },
          suggested: fixedAmount > 0 ? {
            action: "update",
            amount: fixedAmount,
          } : {
            action: "delete",
          },
        });
        continue;
      }

      // ── Issue 2: Inverted Direction (Debit vs Credit) ─────────────────────
      let isDirectionInverted = false;
      const emailBodyText = meta.email_body || desc;
      const emailSubject = meta.email_subject || desc;
      const emailFrom = meta.email_from || "";

      // Re-run direction inference using current robust rules
      const expectedType = inferEntryType(emailBodyText, emailSubject, emailFrom);
      let correctType: "income" | "expense" = expectedType;

      if ((row.entry_type === "income" || row.entry_type === "expense") && row.entry_type !== expectedType) {
        isDirectionInverted = true;
        correctType = expectedType;
      }

      if (isDirectionInverted) {
        suggestions.push({
          id: row.id,
          issue_type: "inverted_direction",
          issue_title: `Inverted Direction (${row.entry_type} → ${correctType})`,
          issue_description: `Transaction direction mis-classified. Suggested: "${correctType}".`,
          current: {
            description: desc,
            entry_type: row.entry_type,
            amount: Number(row.amount),
            category: row.category || "Uncategorized",
            entry_date: row.entry_date,
          },
          suggested: {
            action: "update",
            entry_type: correctType,
          },
        });
      }

      // ── Issue 3: Duplicate Transaction ──────────────────────────────────
      const dupKey = meta.gmail_message_id
        ? `gmail:${meta.gmail_message_id}`
        : `date:${row.entry_date}_amt:${row.amount}_desc:${desc.trim().toLowerCase()}`;

      if (seenMap.has(dupKey)) {
        suggestions.push({
          id: row.id,
          issue_type: "duplicate",
          issue_title: "Duplicate Transaction Detected",
          issue_description: `Identical transaction matches another entry (${row.entry_date}, ₦${amountMajor.toLocaleString()}).`,
          current: {
            description: desc,
            entry_type: row.entry_type,
            amount: Number(row.amount),
            category: row.category || "Uncategorized",
            entry_date: row.entry_date,
          },
          suggested: {
            action: "delete",
          },
        });
      } else {
        seenMap.set(dupKey, row.id);
      }

      // ── Issue 4: Uncategorized or Generic Category ────────────────────────
      const lowerText = `${emailSubject} ${emailBodyText} ${emailFrom}`.toLowerCase();
      if (!isDirectionInverted && (cat === "other" || cat === "uncategorized" || cat === "general expense" || !row.category)) {
        let suggestedCategory = "General Expense";
        if (/(uber|bolt|indrive|transport|flight|ride)/i.test(lowerText)) suggestedCategory = "Transport";
        else if (/(netflix|spotify|apple|subscription|dstv|gotv)/i.test(lowerText)) suggestedCategory = "Subscriptions";
        else if (/(food|restaurant|pizza|kfc|eat|chow|bukka)/i.test(lowerText)) suggestedCategory = "Food & Dining";
        else if (/(mtn|airtel|glo|9mobile|data|airtime|recharge)/i.test(lowerText)) suggestedCategory = "Phone & Data";
        else if (/(shoprite|spar|supermarket|mall|store|buy|jumia|konga)/i.test(lowerText)) suggestedCategory = "Shopping";
        else if (/(electricity|ikedc|ekedc|aedc|water|utility|bill)/i.test(lowerText)) suggestedCategory = "Utilities";

        if (suggestedCategory !== "General Expense") {
          suggestions.push({
            id: row.id,
            issue_type: "uncategorized",
            issue_title: `Uncategorized Entry → ${suggestedCategory}`,
            issue_description: `Transaction has a generic category. Suggested: "${suggestedCategory}".`,
            current: {
              description: desc,
              entry_type: row.entry_type,
              amount: Number(row.amount),
              category: row.category || "Uncategorized",
              entry_date: row.entry_date,
            },
            suggested: {
              action: "update",
              category: suggestedCategory,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalEntries: rows.length,
      suggestionCount: suggestions.length,
      suggestions,
    });
  } catch (err: any) {
    console.error("[GET /api/databank/clean/scan] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to scan DataBank" }, { status: 500 });
  } finally {
    await pool.end();
  }
}
