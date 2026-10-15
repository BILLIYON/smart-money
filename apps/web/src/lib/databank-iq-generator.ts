import { Pool } from "pg";
import { normalizeMerchant, getMerchantRules } from "./merchant-rules";
import { computeIQScore, getIQLevel } from "./databank-iq";

let sharedPool: Pool | null = null;
function getPool() {
  if (!sharedPool) {
    const dbUrl = process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money";
    const isRemote = dbUrl.includes("supabase.com") || dbUrl.includes("pooler") || dbUrl.includes("aws-");
    sharedPool = new Pool({
      connectionString: dbUrl,
      ssl: isRemote ? { rejectUnauthorized: false } : false,
      max: 10,
    });
  }
  return sharedPool;
}

export type QuestionTier = "tier1_merchant" | "tier2_ambiguous" | "tier3_intent";

export interface IQQuestionOption {
  id: string;
  label: string;
  category?: string;
  intent?: string;
  isCustom?: boolean;
  isSplit?: boolean;
}

export interface IQQuestion {
  id: string;
  tier: QuestionTier;
  badge: string;
  title: string;
  subtitle: string;
  merchantName?: string;
  matchingEntryIds: string[];
  totalAmount: number; // in Naira (major units)
  transactionCount: number;
  suggestedCategory: string;
  suggestedIntent?: string;
  options: IQQuestionOption[];
  dateStr?: string;
}

export interface DataBankIQSessionData {
  openingNarrative: string;
  estimatedMinutes: number;
  currentScore: number;
  currentLevel: ReturnType<typeof getIQLevel>;
  totalTransactions: number;
  unresolvedCount: number;
  questions: IQQuestion[];
}

// Known common merchants and their default probable categories
const KNOWN_MERCHANTS: Record<string, string> = {
  bolt: "Transport",
  uber: "Transport",
  indrive: "Transport",
  chowdeck: "Food & Dining",
  glovo: "Food & Dining",
  eden: "Food & Dining",
  netflix: "Subscriptions",
  spotify: "Subscriptions",
  apple: "Subscriptions",
  google: "Subscriptions",
  dstv: "Utilities",
  gotv: "Utilities",
  startimes: "Utilities",
  mtn: "Utilities",
  airtel: "Utilities",
  glo: "Utilities",
  ikeja: "Utilities",
  ekedc: "Utilities",
  eko: "Utilities",
  ibedc: "Utilities",
  spar: "Groceries",
  shoprite: "Groceries",
  hubmart: "Groceries",
  supermart: "Groceries",
  chicken: "Food & Dining",
  kfc: "Food & Dining",
  dominos: "Food & Dining",
  sweet: "Food & Dining",
  bukka: "Food & Dining",
};

// Known savings/investment platforms for Tier 3 intent capture
const SAVINGS_TARGETS: Record<string, { label: string; defaultIntent: string }> = {
  piggyvest: { label: "PiggyVest", defaultIntent: "Emergency Fund / Savings" },
  cowrywise: { label: "Cowrywise", defaultIntent: "Mutual Funds & Long-Term Wealth" },
  risevest: { label: "Risevest", defaultIntent: "Dollar Asset Investment" },
  bamboo: { label: "Bamboo", defaultIntent: "US Stock Portfolio" },
  trove: { label: "Trove", defaultIntent: "Equities & Stocks" },
  stanbic: { label: "Stanbic IBTC Asset Mgmt", defaultIntent: "Mutual Fund Investment" },
};

function formatNaira(amount: number): string {
  return "₦" + Math.round(amount).toLocaleString();
}

/**
 * Extracts a recognizable merchant brand name from transaction text
 */
function extractBrandMerchant(desc: string): { name: string; category?: string } | null {
  const lower = desc.toLowerCase();
  for (const [key, category] of Object.entries(KNOWN_MERCHANTS)) {
    if (new RegExp(`\\b${key}\\b`, "i").test(lower)) {
      const properName = key.charAt(0).toUpperCase() + key.slice(1);
      return { name: properName, category };
    }
  }

  // Fallback: extract leading merchant tokens from POS or Web purchases
  const clean = normalizeMerchant(desc);
  if (clean.length > 2) {
    const parts = clean.split(" ");
    const token = parts.slice(0, 2).join(" ");
    if (token.length >= 3 && !/^(transfer|trf|nip|cash|atm|reversal|charge|interest)/i.test(token)) {
      const proper = token
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      return { name: proper };
    }
  }

  return null;
}

/**
 * Generates an opening narrative from user's actual 90-day activity
 */
function buildOpeningNarrative(
  totalSpendNaira: number,
  uncategorisedPct: number,
  totalTxCount: number,
  uncatCount: number
): { narrative: string; estimatedMinutes: number } {
  const estMins = Math.max(2, Math.min(5, Math.ceil(uncatCount / 10)));
  const formattedSpend = formatNaira(totalSpendNaira);

  let narrative = "";
  if (uncatCount === 0 || uncatCount < 5) {
    narrative = `Your financial data is remarkably crisp! Over the past 90 days, ${formattedSpend} was tracked across ${totalTxCount} transactions. Let's do a fast 1-minute sweep of intent goals so your AI Buddy can provide razor-sharp wealth recommendations.`;
  } else if (uncategorisedPct > 50) {
    narrative = `In the last 3 months, ${formattedSpend} left your account across ${totalTxCount} transactions. While your income is readable, ${uncategorisedPct}% of your expenses have no category. That's a significant blind spot that limits how specific my financial advice can be. Let's fix it together in about ${estMins} minutes!`;
  } else {
    narrative = `In the last 3 months, ${formattedSpend} flowed through your account. Most recurring habits are visible, but ${uncatCount} transactions (${uncategorisedPct}%) are still unclassified. Nailing these down unlocks specific savings strategies from your Buddy in just ${estMins} minutes.`;
  }

  return { narrative, estimatedMinutes: estMins };
}

/**
 * Generates 3 tiers of high-impact questions for a DataBank IQ session
 */
export async function generateIQSession(userId: string): Promise<DataBankIQSessionData> {
  const pool = getPool();

  // 1. Fetch user transactions from the last 90 days / up to 500 recent
  const { rows: entries } = await pool.query(
    `SELECT id, amount, entry_type, description, category, intent, entry_date, metadata
     FROM public.databank_entries
     WHERE user_id = $1
     ORDER BY entry_date DESC, created_at DESC
     LIMIT 500;`,
    [userId]
  );

  // 2. Fetch existing confirmed merchant rules to avoid repeating resolved merchants
  const existingRules = await getMerchantRules(userId);
  const memorizedMerchants = new Set(existingRules.map((r) => r.merchant_name.toLowerCase()));

  // 3. Compute baseline IQ score
  const iqResult = computeIQScore(entries);

  // 4. Aggregate data for narrative and question generation
  let totalDebitValueMajor = 0;
  const merchantGroups = new Map<
    string,
    {
      merchantName: string;
      category: string;
      totalNaira: number;
      entryIds: string[];
      entries: any[];
    }
  >();

  const ambiguousEntries: any[] = [];
  const intentCandidates: any[] = [];

  for (const entry of entries) {
    const amtMajor = Math.abs(Number(entry.amount) || 0) / 100;
    const isDebit = (entry.entry_type || "").toLowerCase() === "expense" || (entry.entry_type || "").toLowerCase() === "debit";
    const desc = entry.description || "";
    const cat = (entry.category || "").toLowerCase();
    const hasIntent = Boolean(entry.intent && entry.intent.trim());

    if (isDebit) {
      totalDebitValueMajor += amtMajor;
    }

    // Check for Tier 3 Savings / Intent targets
    const lowerDesc = desc.toLowerCase();
    let isSavingsTarget = false;
    for (const [key, target] of Object.entries(SAVINGS_TARGETS)) {
      if (lowerDesc.includes(key)) {
        isSavingsTarget = true;
        if (!hasIntent) {
          intentCandidates.push({
            entry,
            targetName: target.label,
            defaultIntent: target.defaultIntent,
            amtMajor,
          });
        }
        break;
      }
    }

    // High value transfers (> ₦50,000) with no intent
    if (!isSavingsTarget && !hasIntent && amtMajor >= 50000 && isDebit) {
      intentCandidates.push({
        entry,
        targetName: desc.replace(/^(transfer to|trf to|nip to)\s+/i, "").trim() || "Transfer",
        defaultIntent: "Savings / Major Purchase",
        amtMajor,
      });
    }

    // If uncategorized or generic, analyze for Tier 1 or Tier 2
    const isUncategorized =
      !cat ||
      cat === "uncategorized" ||
      cat === "uncategorised" ||
      cat === "general expense" ||
      cat === "other" ||
      cat === "transfer";

    if (isDebit && isUncategorized) {
      const merchantInfo = extractBrandMerchant(desc);

      if (merchantInfo && !memorizedMerchants.has(merchantInfo.name.toLowerCase())) {
        const key = merchantInfo.name.toLowerCase();
        const existing = merchantGroups.get(key) || {
          merchantName: merchantInfo.name,
          category: merchantInfo.category || "General Expense",
          totalNaira: 0,
          entryIds: [],
          entries: [],
        };
        existing.totalNaira += amtMajor;
        existing.entryIds.push(entry.id);
        existing.entries.push(entry);
        merchantGroups.set(key, existing);
      } else {
        ambiguousEntries.push({ entry, amtMajor });
      }
    }
  }

  const questions: IQQuestion[] = [];

  // ── TIER 1: MERCHANT MEMORY QUESTIONS ─────────────────────────────
  // Sort merchant groups by count descending, then total spend
  const sortedMerchants = Array.from(merchantGroups.values())
    .filter((g) => g.entryIds.length >= 1)
    .sort((a, b) => b.entryIds.length - a.entryIds.length || b.totalNaira - a.totalNaira)
    .slice(0, 18);

  for (const m of sortedMerchants) {
    const isSingular = m.entryIds.length === 1;
    const catLabel = m.category !== "General Expense" ? m.category : "Shopping";

    questions.push({
      id: `q_tier1_${m.merchantName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
      tier: "tier1_merchant",
      badge: "Tier 1 · Merchant Memory",
      title: isSingular
        ? `You paid ${formatNaira(m.totalNaira)} to ${m.merchantName}. Is this ${catLabel}?`
        : `You have ${m.entryIds.length} transactions from ${m.merchantName} totalling ${formatNaira(m.totalNaira)}. Is this ${catLabel}?`,
      subtitle: `Answering once will classify ${m.entryIds.length} ${isSingular ? "transaction" : "transactions"} and remember this merchant for future syncs.`,
      merchantName: m.merchantName,
      matchingEntryIds: m.entryIds,
      totalAmount: m.totalNaira,
      transactionCount: m.entryIds.length,
      suggestedCategory: catLabel,
      options: [
        {
          id: "yes",
          label: `Yes, ${catLabel}`,
          category: catLabel,
        },
        {
          id: "no_other",
          label: "No, it's something else",
          isCustom: true,
        },
        {
          id: "split",
          label: "Split — personal & business",
          isSplit: true,
        },
      ],
    });
  }

  // ── TIER 2: AMBIGUOUS TRANSACTIONS ─────────────────────────────────
  // Sort ambiguous by amount descending (highest value impact first)
  ambiguousEntries.sort((a, b) => b.amtMajor - a.amtMajor);
  const topAmbiguous = ambiguousEntries.slice(0, 25);

  for (const amb of topAmbiguous) {
    const e = amb.entry;
    const dateFormatted = e.entry_date
      ? new Date(e.entry_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "recent";

    const cleanTitle = e.description
      ? e.description.replace(/^(transfer to|trf to|pos purchase|web purchase|nip to)\s+/i, "").trim()
      : "Debit Transaction";

    questions.push({
      id: `q_tier2_${e.id}`,
      tier: "tier2_ambiguous",
      badge: "Tier 2 · Ambiguous Transaction",
      title: `${formatNaira(amb.amtMajor)} to ${cleanTitle} on ${dateFormatted} — what was this?`,
      subtitle: "Unclassified transactions leave blind spots in your monthly budget breakdown.",
      matchingEntryIds: [e.id],
      totalAmount: amb.amtMajor,
      transactionCount: 1,
      suggestedCategory: "General Expense",
      dateStr: dateFormatted,
      options: [
        { id: "family", label: "Transfer to Family / Friend", category: "Family & Gifts" },
        { id: "rent", label: "Rent / Housing", category: "Housing" },
        { id: "groceries", label: "Groceries & Household", category: "Groceries" },
        { id: "loan", label: "Loan / Debt Repayment", category: "Debt Repayment" },
        { id: "custom", label: "Something else...", isCustom: true },
      ],
    });
  }

  // ── TIER 3: INTENT CAPTURE ─────────────────────────────────────────
  // Sort intent candidates by amount descending, pick top 6–8
  intentCandidates.sort((a, b) => b.amtMajor - a.amtMajor);
  const selectedIntents = intentCandidates.slice(0, 7);

  for (const intentItem of selectedIntents) {
    const e = intentItem.entry;
    questions.push({
      id: `q_tier3_${e.id}`,
      tier: "tier3_intent",
      badge: "Tier 3 · Intent Capture",
      title: `You transferred ${formatNaira(intentItem.amtMajor)} to ${intentItem.targetName}. What was the goal behind this?`,
      subtitle: "Understanding your intent helps your AI Buddy forecast your runway and track savings goals.",
      matchingEntryIds: [e.id],
      totalAmount: intentItem.amtMajor,
      transactionCount: 1,
      suggestedCategory: "Savings & Investments",
      suggestedIntent: intentItem.defaultIntent,
      options: [
        {
          id: "emergency",
          label: "🛡️ Emergency Fund",
          category: "Savings & Investments",
          intent: "Emergency Fund",
        },
        {
          id: "goal",
          label: "🎯 Specific Savings Goal (Asset / Travel)",
          category: "Savings & Investments",
          intent: "Specific Goal",
        },
        {
          id: "moving",
          label: "🔄 Just moving money between accounts",
          category: "Transfers",
          intent: "Account Rebalancing",
        },
        {
          id: "not_sure",
          label: "🤔 Not sure / Miscellaneous",
          category: "Other",
          intent: "General Movement",
        },
      ],
    });
  }

  // Build the opening narrative
  const uncatPct = entries.length > 0 ? Math.round((iqResult.uncategorisedTransactions / entries.length) * 100) : 0;
  const narrativeInfo = buildOpeningNarrative(
    totalDebitValueMajor,
    uncatPct,
    entries.length,
    iqResult.uncategorisedTransactions
  );

  return {
    openingNarrative: narrativeInfo.narrative,
    estimatedMinutes: narrativeInfo.estimatedMinutes,
    currentScore: iqResult.score,
    currentLevel: iqResult.level,
    totalTransactions: entries.length,
    unresolvedCount: questions.length,
    questions,
  };
}

/**
 * Returns dynamic milestone insights at every 5 completed questions
 */
export function getMilestoneInsight(
  completedCount: number,
  currentScore: number,
  levelName: string
): { title: string; body: string; avatar: string } | null {
  if (completedCount <= 0 || completedCount % 5 !== 0) return null;

  const milestones: Record<number, { title: string; body: string; avatar: string }> = {
    5: {
      title: "5 Down! Blind Spots Shrinking 🔍",
      body: `You've classified your core recurring spending. Your DataBank IQ is now ${currentScore} (${levelName}). Your AI Buddy can now differentiate mandatory bills from flexible lifestyle expenses.`,
      avatar: "🎯",
    },
    10: {
      title: "10 Resolved! Subscriptions & Logistics Clear ⚡",
      body: `Merchant memory rules have been locked in. Next time you sync Gmail, these merchants will auto-resolve instantly without you lifting a finger!`,
      avatar: "🧠",
    },
    15: {
      title: "15 Resolved! Leveling Up 🚀",
      body: `You're in the top quartile of financial clarity. Your Buddy can now forecast next month's cash flow buffer with 90%+ accuracy.`,
      avatar: "🔥",
    },
    20: {
      title: "20 Resolved! Elite Financial Clarity 👑",
      body: `Outstanding audit work! Almost all transaction blind spots are eliminated. Your Buddy has enough high-fidelity data to unlock custom wealth advice.`,
      avatar: "💎",
    },
  };

  return (
    milestones[completedCount] || {
      title: `Streak Master! ${completedCount} Resolved 🌟`,
      body: `Every answer directly sharpens your Buddy's forward-looking insights. Current IQ: ${currentScore} (${levelName}).`,
      avatar: "⚡",
    }
  );
}
