/**
 * POST /api/databank/agent-write
 * Accepts structured write payloads produced by the AI chat layer.
 * Supports: single expenses/income, bulk entry lists, goals, and subscriptions.
 */
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

/* ── Types ───────────────────────────────────────────────── */

type EntryType = "expense" | "income" | "subscription" | "asset" | "debt";

interface EntryPayload {
  description: string;
  amount: number;        // in major currency units (e.g. ₦500 → 500), we convert to kobo
  entry_type: EntryType;
  category?: string;
  date?: string;         // ISO date string; defaults to today
  metadata?: Record<string, any>;
}

interface GoalPayload {
  title: string;
  target_amount: number; // major units
  current_amount?: number;
  target_date?: string;
}

interface AgentWriteBody {
  entries?: EntryPayload[];
  goal?: GoalPayload;
  buddy_id?: string;
}

/* ── Helper ──────────────────────────────────────────────── */
function toToday(): string {
  return new Date().toISOString().split("T")[0];
}

/* ── Handler ─────────────────────────────────────────────── */
export async function POST(req: Request) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  let body: AgentWriteBody;
  try {
    body = (await req.json()) as AgentWriteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const results: { entries: string[]; goals: string[]; errors: string[] } = {
    entries: [],
    goals: [],
    errors: [],
  };

  /* ── Write databank entries ─────────────────────────────── */
  if (body.entries && body.entries.length > 0) {
    for (const entry of body.entries) {
      const {
        description,
        amount,
        entry_type = "expense",
        category = "other",
        date = toToday(),
      } = entry;

      if (!description || !amount) {
        results.errors.push(`Skipped entry with missing description/amount: ${JSON.stringify(entry)}`);
        continue;
      }

      // Convert major units (₦) to kobo (multiply by 100)
      const amountKobo = Math.round(Math.abs(amount) * 100);

      const { data, error: dbErr } = await supabase
        .from("databank_entries")
        .insert({
          user_id: userId,
          source: "manual",
          entry_type,
          amount: amountKobo,
          description: description.trim(),
          category,
          entry_date: date,
          metadata: entry.metadata ?? {},
        })
        .select("id")
        .single();

      if (dbErr) {
        console.error("[/api/databank/agent-write] Entry insert error:", dbErr);
        results.errors.push(`Failed to save "${description}": ${dbErr.message}`);
      } else {
        results.entries.push(data.id);
      }
    }
  }

  /* ── Write goal ─────────────────────────────────────────── */
  if (body.goal) {
    const {
      title,
      target_amount,
      current_amount = 0,
      target_date,
    } = body.goal;

    if (!title || !target_amount) {
      results.errors.push("Goal missing title or target_amount");
    } else {
      const amountKobo = Math.round(Math.abs(target_amount) * 100);
      const currentKobo = Math.round(Math.abs(current_amount) * 100);

      const { data, error: goalErr } = await supabase
        .from("goals")
        .insert({
          user_id: userId,
          buddy_id: body.buddy_id ?? null,
          title: title.trim(),
          target_amount: amountKobo,
          current_amount: currentKobo,
          target_date: target_date ?? null,
          status: "active",
        })
        .select("id")
        .single();

      if (goalErr) {
        console.error("[/api/databank/agent-write] Goal insert error:", goalErr);
        results.errors.push(`Failed to create goal "${title}": ${goalErr.message}`);
      } else {
        results.goals.push(data.id);
      }
    }
  }

  const totalWritten = results.entries.length + results.goals.length;
  if (totalWritten === 0 && results.errors.length > 0) {
    return NextResponse.json({ ok: false, results }, { status: 422 });
  }

  return NextResponse.json({ ok: true, results }, { status: 201 });
}
