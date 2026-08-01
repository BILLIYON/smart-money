import { createClient } from "@supabase/supabase-js";
import { getDatabankContextForUser } from "../src/lib/databank-context";

// We will copy formatDatabankContext from src/lib/ai.ts or import it if possible
// Since ai.ts imports next components and libraries, let's just copy the exact formatDatabankContext function to be safe and test it.

import { formatCurrency } from "../src/lib/currency";

function fmt(minorUnit: number, currency: string): string {
  return formatCurrency(minorUnit, currency);
}

function formatDatabankContext(ctx: any): string {
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
          .map((c: any) => `${c.category} ${f(c.total)} (${c.percentage}%, ${c.trend})`)
          .join(", ")
    );
  }

  if (ctx.activeGoals?.length) {
    lines.push(
      "Active goals: " +
        ctx.activeGoals
          .map((g: any) => `"${g.title}" — ${f(g.currentAmount)} of ${f(g.targetAmount)} (${g.progressPercent}%) · target ${g.targetDate}`)
          .join("; ")
    );
  }

  if (ctx.recentTransactions?.length) {
    lines.push(
      "Recent transactions: " +
        ctx.recentTransactions
          .slice(0, 5)
          .map((t: any) => `${t.description} ${f(t.amount)} on ${t.date} [${t.source}]`)
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
      .filter((t: any) => t.type === "expense" && t.amount > 10_000 && t.source === "gmail")
      .slice(0, 3);

    lines.push(
      `\nGMAIL DATA (read-only access to user's inbox, last synced ${lastSync}):` +
      `\n- Salary/income sources detected: ${income > 0 ? `${f(income)} this month` : "not yet detected"}` +
      (subs.length
        ? `\n- Subscriptions found in email: ${subs.map((s: any) => `${s.name} (${f(s.amount)}/mo)`).join(", ")}`
        : "") +
      (largeDebits.length
        ? `\n- Recent large debits from email alerts: ${largeDebits.map((t: any) => `${t.description} ${f(t.amount)} on ${t.date}`).join("; ")}`
        : "")
    );
  }

  if (ctx.connectedSources?.length)
    lines.push(`\nConnected sources: ${ctx.connectedSources.join(", ")}`);

  if (ctx.activeSignals?.length)
    lines.push(`Active signal sources: ${ctx.activeSignals.join(", ")}`);

  return lines.length > 0 ? lines.join("\n") : "No DataBank data connected yet.";
}

const url = "https://gmbwrhdoyoinkmtrtbnr.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYndyaGRveW9pbmttdHJ0Ym5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY4OTUzMSwiZXhwIjoyMDkxMjY1NTMxfQ.8uFfLI-KNwj3vLSpvwEhTcwjmD9-KUG5wYFz9FELt7c";
const supabase = createClient(url, serviceKey);

async function main() {
  const userId = '1d8e4391-5fee-4e0b-b104-d41ed9888e9f';
  const ctx = await getDatabankContextForUser(supabase, userId);
  const formatted = formatDatabankContext(ctx);
  console.log("Formatted System Prompt String:\n", formatted);
}

main().catch(console.error);
