export type ParsedFinancialEmail = {
  amount: number; // amount in base currency units (e.g., Naira)
  description: string;
  entry_type: "income" | "expense";
  category: string;
  provider?: string;
  bank?: string;
  account_balance?: number; // in base currency units
};

const BANK_PATTERNS: Array<{ id: string; label: string; pattern: RegExp }> = [
  { id: "opay", label: "OPay", pattern: /\bopay(?:web)?\b/i },
  { id: "kuda", label: "Kuda Bank", pattern: /\bkuda\b/i },
  { id: "palmpay", label: "PalmPay", pattern: /\bpalmpay\b/i },
  { id: "moniepoint", label: "Moniepoint", pattern: /\bmoniepoint\b/i },
  { id: "gtbank", label: "GTBank", pattern: /\b(?:gtbank|gtb|guaranty\s*trust)\b/i },
  { id: "zenith", label: "Zenith Bank", pattern: /\bzenith\b/i },
  { id: "access", label: "Access Bank", pattern: /\baccess\s*bank\b|\baccessbank\b/i },
  { id: "uba", label: "UBA", pattern: /\buba\b|united\s*bank\s*for\s*africa/i },
  { id: "firstbank", label: "First Bank", pattern: /\bfirst\s*bank\b|\bfirstbank\b/i },
  { id: "stanbic", label: "Stanbic IBTC", pattern: /\bstanbic\b/i },
  { id: "fidelity", label: "Fidelity Bank", pattern: /\bfidelity\b/i },
  { id: "union", label: "Union Bank", pattern: /\bunion\s*bank\b/i },
  { id: "wema", label: "Wema Bank", pattern: /\bwema\b/i },
  { id: "providus", label: "Providus Bank", pattern: /\bprovidus\b/i },
  { id: "carbon", label: "Carbon", pattern: /\bcarbon\b|\bsparkle\b/i },
  { id: "flutterwave", label: "Flutterwave", pattern: /\bflutterwave\b/i },
  { id: "paystack", label: "Paystack", pattern: /\bpaystack\b/i },
];

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function parseMoneyToken(raw: string): number | null {
  const cleaned = raw
    .replace(/[NGN₦$£€\s]/gi, "")
    .replace(/,/g, "")
    .trim();
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  if (Number.isNaN(num) || num <= 0) return null;
  return num;
}

/**
 * Parse a money amount near the match, skipping values that look like balances.
 */
function isNearBalanceKeyword(text: string, index: number): boolean {
  const windowStart = Math.max(0, index - 40);
  const window = text.slice(windowStart, index + 10).toLowerCase();
  return /(?:available|avail|acct|account|current|ledger|closing|opening)?\s*(?:balance|bal)\b/.test(window)
    || /\bbal(?:ance)?\b/.test(window);
}

function extractAmount(text: string): number | null {
  // Priority 1: explicit transaction amount labels used by Nigerian banks
  const labeledPatterns = [
    /(?:amt|amount|debited|credited|paid|sum|value|txn\s*amt|transaction\s*amount)[:\s]*(?:of\s*)?(?:NGN|₦|N(?=[\d\s,])|USD|\$)?\s*([\d,]+\.?\d*)/gi,
    /(?:NGN|₦)\s*([\d,]+\.?\d*)/gi,
    /(?:debited|credited|paid|sent|received|transferred)\s+(?:with\s+)?(?:NGN|₦|N(?=[\d\s,]))\s*([\d,]+\.?\d*)/gi,
  ];

  for (const pattern of labeledPatterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      if (isNearBalanceKeyword(text, match.index)) continue;
      const amount = parseMoneyToken(match[1]);
      if (amount !== null) return amount;
    }
  }

  // Priority 2: currency-prefixed amounts (skip balance context)
  const currencyPattern = /(?:NGN|₦|\$|£|€)\s*([\d,]+\.\d{2}|[\d,]{3,})/gi;
  let match: RegExpExecArray | null;
  while ((match = currencyPattern.exec(text)) !== null) {
    if (isNearBalanceKeyword(text, match.index)) continue;
    const amount = parseMoneyToken(match[1]);
    if (amount !== null) return amount;
  }

  // Priority 3: bare decimal money amounts (xx.xx) away from balance keywords
  const decimalPattern = /\b([\d,]+\.\d{2})\b/g;
  while ((match = decimalPattern.exec(text)) !== null) {
    if (isNearBalanceKeyword(text, match.index)) continue;
    const amount = parseMoneyToken(match[1]);
    if (amount !== null && amount >= 1) return amount;
  }

  return null;
}

function extractBalance(text: string): number | null {
  const patterns = [
    /(?:available|avail(?:able)?)\s*(?:balance|bal)[:\s]*(?:is\s*)?([NGN₦$£€N\s]*[\d,]+\.?\d*)/i,
    /(?:acct|account|current|ledger|closing)\s*(?:balance|bal)[:\s]*(?:is\s*)?([NGN₦$£€N\s]*[\d,]+\.?\d*)/i,
    /(?:balance|bal)[:\s]*(?:is\s*)?([NGN₦$£€N\s]*[\d,]+\.?\d*)/i,
    /(?:bal|balance)\s+(?:NGN|₦|N)\s*([\d,]+\.?\d*)/i,
  ];

  for (const pattern of patterns) {
    const balMatch = text.match(pattern);
    if (!balMatch?.[1]) continue;
    const num = parseMoneyToken(balMatch[1]);
    if (num !== null) return num;
  }

  return null;
}

function extractDescription(text: string, from: string, bank?: string): string {
  const descMatch = text.match(
    /(?:Desc|Description|Remarks|Narration|Merchant|To|From|Beneficiary)[:\s]+([^,\.\n]{2,60})/i
  );
  if (descMatch?.[1]?.trim()) {
    return descMatch[1].trim().slice(0, 60);
  }
  if (bank) return bank;
  if (from) {
    return from.split("<")[0].replace(/"/g, "").trim().slice(0, 40) || "Transaction";
  }
  return "Transaction";
}

function detectBank(text: string, from: string): { id: string; label: string } | null {
  const haystack = `${from} ${text}`;
  for (const bank of BANK_PATTERNS) {
    if (bank.pattern.test(haystack)) {
      return { id: bank.id, label: bank.label };
    }
  }
  return null;
}

function inferEntryType(text: string): "income" | "expense" {
  const normalized = normalizeText(text);

  const incomeIndicators = [
    "credit alert",
    "credited",
    "credit:",
    "salary",
    "inflow",
    "received",
    "deposit",
    "cash in",
    "refund",
    "transfer in",
    "money received",
    "you received",
    "payment received",
  ];

  const expenseIndicators = [
    "debit alert",
    "debit:",
    "debited",
    "charged",
    "payment",
    "purchase",
    "pos",
    "transfer out",
    "sent",
    "paid",
    "withdraw",
    "subscription",
    "you sent",
    "you paid",
    "money sent",
  ];

  // Subject-level signals win when both sides match (common in bank templates)
  const subjectFirst = text.slice(0, Math.min(120, text.length)).toLowerCase();
  if (/credit\s*alert|credited|salary\s*credit|money\s*received|you\s*received/.test(subjectFirst)) {
    return "income";
  }
  if (/debit\s*alert|debited|money\s*sent|you\s*sent|you\s*paid|pos\s*purchase/.test(subjectFirst)) {
    return "expense";
  }

  if (incomeIndicators.some((indicator) => normalized.includes(indicator))) {
    return "income";
  }

  if (expenseIndicators.some((indicator) => normalized.includes(indicator))) {
    return "expense";
  }

  return "expense";
}

function inferCategory(text: string, entryType: "income" | "expense", bank?: string): string {
  const normalized = normalizeText(text);

  if (entryType === "income") {
    if (/(salary|payroll|wages)/.test(normalized)) return "Salary";
    return "Income";
  }

  if (/(uber|bolt|indrive|transport|flight|ride|ride-hailing)/.test(normalized)) return "Transport";
  if (/(netflix|spotify|apple|amazon prime|subscription|dstv|gotv|showmax)/.test(normalized)) return "Subscriptions";
  if (/(food|restaurant|pizza|kfc|chicken republic|eat|chow|sweet sensation)/.test(normalized)) return "Food & Dining";
  if (/(mtn|airtel|glo|9mobile|data|airtime|recharge)/.test(normalized)) return "Phone & Data";
  if (/(shoprite|spar|supermarket|mall|store|buy|market)/.test(normalized)) return "Shopping";
  if (bank) return bank;
  return "General Expense";
}

/**
 * Only accept clear transaction / transfer / alert emails.
 * Marketing and newsletters are ignored.
 */
function isTransactionEmail(text: string): boolean {
  return /(debit|credit|transaction|transfer|receipt|payment|alert|credited|debited|paid|sent|received|purchase|pos|invoice|bill)/i.test(
    text
  );
}

export function parseFinancialEmailData(
  emailBody: string,
  subject: string,
  from: string
): ParsedFinancialEmail | null {
  const text = `${subject} ${emailBody}`.replace(/\s+/g, " ").trim();
  if (!text) return null;

  if (!isTransactionEmail(text)) return null;

  const amount = extractAmount(text);
  if (amount === null || amount <= 0) return null;

  const entryType = inferEntryType(text);
  const bankInfo = detectBank(text, from);
  const account_balance = extractBalance(text) ?? undefined;

  return {
    amount,
    description: extractDescription(text, from, bankInfo?.label),
    entry_type: entryType,
    category: inferCategory(text, entryType, bankInfo?.label),
    provider: bankInfo?.id,
    bank: bankInfo?.label,
    account_balance,
  };
}
