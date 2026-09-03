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
  { id: "gtbank", label: "GTBank", pattern: /\b(?:gtbank|gtb|guaranty\s*trust|gtco)\b/i },
  { id: "zenith", label: "Zenith Bank", pattern: /\bzenith\b/i },
  { id: "access", label: "Access Bank", pattern: /\baccess\s*bank\b|\baccessbank\b|\baccess\s*more\b/i },
  { id: "uba", label: "UBA", pattern: /\buba\b|united\s*bank\s*for\s*africa/i },
  { id: "firstbank", label: "First Bank", pattern: /\bfirst\s*bank\b|\bfirstbank\b|\bfirstmonie\b/i },
  { id: "stanbic", label: "Stanbic IBTC", pattern: /\bstanbic\b/i },
  { id: "fcmb", label: "FCMB", pattern: /\bfcmb\b|first\s*city\s*monument\s*bank/i },
  { id: "fidelity", label: "Fidelity Bank", pattern: /\bfidelity\b/i },
  { id: "union", label: "Union Bank", pattern: /\bunion\s*bank\b/i },
  { id: "wema", label: "Wema Bank", pattern: /\bwema\b|\balat\b/i },
  { id: "providus", label: "Providus Bank", pattern: /\bprovidus\b/i },
  { id: "sterling", label: "Sterling Bank", pattern: /\bsterling\b/i },
  { id: "polaris", label: "Polaris Bank", pattern: /\bpolaris\b/i },
  { id: "keystone", label: "Keystone Bank", pattern: /\bkeystone\b/i },
  { id: "unity", label: "Unity Bank", pattern: /\bunity\s*bank\b/i },
  { id: "jaiz", label: "Jaiz Bank", pattern: /\bjaiz\b/i },
  { id: "taj", label: "TAJBank", pattern: /\btaj\s*bank\b|\btajbank\b/i },
  { id: "carbon", label: "Carbon", pattern: /\bcarbon\b|\bsparkle\b/i },
  { id: "flutterwave", label: "Flutterwave", pattern: /\bflutterwave\b|\bbarter\b/i },
  { id: "paystack", label: "Paystack", pattern: /\bpaystack\b/i },
  { id: "squad", label: "Squad", pattern: /\bsquad\b/i },
  { id: "chipper", label: "Chipper Cash", pattern: /\bchipper\s*cash\b/i },
  { id: "remita", label: "Remita", pattern: /\bremita\b/i },
  { id: "interswitch", label: "Interswitch", pattern: /\binterswitch\b|\bquickteller\b/i },
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
 * Check if a matched number token is actually a balance rather than a transaction amount.
 * Looks in both preceding and trailing windows.
 */
function isNearBalanceKeyword(text: string, index: number, matchLength = 10): boolean {
  const windowStart = Math.max(0, index - 50);
  const lookBehind = text.slice(windowStart, index).toLowerCase();
  if (
    /(?:available|avail|current|ledger|closing|opening|acct|account)?\s*(?:balance|bal)\s*[:\s\-=]*$/i.test(lookBehind) ||
    /\b(?:balance|bal)\s*[:\s\-=]*$/i.test(lookBehind)
  ) {
    return true;
  }

  const windowEnd = Math.min(text.length, index + matchLength + 50);
  const lookAhead = text.slice(index + matchLength, windowEnd).toLowerCase();
  if (/^\s*(?:is\s+your\s+|avail|available|ledger|current)?\s*bal(?:ance)?\b/i.test(lookAhead)) {
    return true;
  }

  return false;
}

function extractAmount(text: string): number | null {
  // Priority 1: Explicit transaction amount labels used by Nigerian banking & fintech emails
  const labeledPatterns = [
    /(?:txn\s*amt|trans\s*amt|transaction\s*amount|total\s*amount|amount(?:\s*\([^\)]+\))?|debited|credited|paid|sum|value|transferred|received)[:\s\-=]*(?:of\s*)?(?:NGN|₦|N(?=[\d\s,])|USD|\$)?\s*([\d,]+\.?\d*)/gi,
    /(?:credit\s*alert|debit\s*alert|transfer\s*alert)[:\s\-=]*(?:NGN|₦|N(?=[\d\s,]))?\s*([\d,]+\.?\d*)/gi,
    /(?:debited|credited|paid|sent|received|transferred)\s+(?:with\s+)?(?:NGN|₦|N(?=[\d\s,]))?\s*([\d,]+\.?\d*)/gi,
  ];

  for (const pattern of labeledPatterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      if (isNearBalanceKeyword(text, match.index, match[0].length)) continue;
      const amount = parseMoneyToken(match[1]);
      if (amount !== null && amount > 0) return amount;
    }
  }

  // Priority 2: Currency-prefixed amounts (NGN 5,000.00 or ₦5,000.00)
  const currencyPattern = /(?:NGN|₦)\s*([\d,]+\.?\d*)/gi;
  let match: RegExpExecArray | null;
  while ((match = currencyPattern.exec(text)) !== null) {
    if (isNearBalanceKeyword(text, match.index, match[0].length)) continue;
    const amount = parseMoneyToken(match[1]);
    if (amount !== null && amount > 0) return amount;
  }

  // Priority 3: Bare decimal money amounts (xx.xx) away from balance keywords
  const decimalPattern = /\b([\d,]+\.\d{2})\b/g;
  while ((match = decimalPattern.exec(text)) !== null) {
    if (isNearBalanceKeyword(text, match.index, match[0].length)) continue;
    const amount = parseMoneyToken(match[1]);
    if (amount !== null && amount >= 1) return amount;
  }

  return null;
}

function extractBalance(text: string): number | null {
  const patterns = [
    /(?:available|avail(?:able)?|current|ledger|closing|opening|acct|account)?\s*(?:balance|bal)[:\s\-=]*(?:is\s*)?([NGN₦$£€N\s]*[\d,]+\.?\d*)/i,
    /(?:bal|balance)\s*[:\s\-=]+\s*(?:NGN|₦|N)?\s*([\d,]+\.?\d*)/i,
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
    /(?:Desc|Description|Remarks|Narration|Merchant|To|From|Beneficiary|Recipient|Sender|Paid to|Received from|Details)[:\s\-=]+([^,\.\n]{2,80})/i
  );
  if (descMatch?.[1]?.trim()) {
    return descMatch[1].trim().slice(0, 80);
  }
  if (bank) return `${bank} Alert`;
  if (from) {
    return from.split("<")[0].replace(/"/g, "").trim().slice(0, 50) || "Transaction";
  }
  return "Transaction";
}

function detectBank(text: string, from: string): { id: string; label: string } | null {
  // Priority 1: Check the email sender address (From)
  if (from) {
    for (const bank of BANK_PATTERNS) {
      if (bank.pattern.test(from)) {
        return { id: bank.id, label: bank.label };
      }
    }
  }
  // Priority 2: Search text content
  for (const bank of BANK_PATTERNS) {
    if (bank.pattern.test(text)) {
      return { id: bank.id, label: bank.label };
    }
  }
  return null;
}


function inferEntryType(text: string): "income" | "expense" {
  const normalized = normalizeText(text);

  // 1. Explicit Debit / Expense Signals (User's account debited)
  const isUserDebited =
    /\b(?:debit|dr)\s*alert\b/i.test(text) ||
    /\bdebit\s*notification\b/i.test(text) ||
    /\b(?:your\s+)?acct(?:ount)?\s*(?:[^\n\.\,]{0,40})?\bdebited\b/i.test(text) ||
    /\bdebited\s+(?:with|for|by|of)\b/i.test(text) ||
    /\b(?:you\s+)?sent\s+(?:NGN|₦|\$|N\d|[\d,]+)/i.test(text) ||
    /\b(?:you\s+)?paid\s+(?:NGN|₦|\$|N\d|[\d,]+)/i.test(text) ||
    /\bpos\s+(?:purchase|transaction|receipt|transfer)\b/i.test(text) ||
    /\bpos\s*transfer\b/i.test(text) ||
    /\batm\s+withdrawal\b/i.test(text) ||
    /\bairtime\s+(?:purchase|recharge|top-up|topup)\b/i.test(text) ||
    /\b(?:bill|data|utility|dstv|gotv)\s+payment\b/i.test(text) ||
    /\btransfer\s+to\b/i.test(text) ||
    /\bpaid\s+to\b/i.test(text) ||
    /\bbeneficiary\b/i.test(text) ||
    /\bremita\b/i.test(text) ||
    /\bcard\s+charge\b/i.test(text) ||
    /\boutflow\b/i.test(text);


  // 2. Explicit Credit / Income Signals (User's account credited)
  const isUserCredited =
    /\b(?:credit|cr)\s*alert\b/i.test(text) ||
    /\bcredit\s*notification\b/i.test(text) ||
    /\b(?:your\s+)?acct(?:ount)?\s*(?:[^\n\.\,]{0,40})?\bcredited\b/i.test(text) ||
    /\bcredited\s+(?:with|for|by|of)\b/i.test(text) ||
    /\b(?:you\s+)?received\s+(?:NGN|₦|\$|N\d|[\d,]+)/i.test(text) ||
    /\binflow\s*(?:alert|notification)?\b/i.test(text) ||
    /\bsalary\b/i.test(text) ||
    /\btransfer\s+from\b/i.test(text) ||
    /\breceived\s+from\b/i.test(text) ||
    /\bmoney\s+received\b/i.test(text) ||
    /\brefund\b/i.test(text) ||
    /\bcash\s*in\b/i.test(text);

  // If user's account was explicitly debited (e.g. transfer alert with "Account Credited: [Beneficiary]"),
  // then expense takes priority unless the subject/first snippet clearly says credit alert for the user.
  if (isUserDebited && !/\b(?:your\s+)?acct(?:ount)?\s*(?:[^\n\.\,]{0,40})?\bcredited\b/i.test(text.slice(0, 300))) {
    return "expense";
  }

  if (isUserDebited && isUserCredited) {
    const subjectSnippet = text.slice(0, 120).toLowerCase();
    if (/debit|dr|sent|paid|purchase|outflow/.test(subjectSnippet)) {
      return "expense";
    }
    if (/credit|cr|received|inflow|salary/.test(subjectSnippet)) {
      return "income";
    }
    return "expense";
  }

  if (isUserDebited) return "expense";
  if (isUserCredited) return "income";

  // Fallback word checks
  if (/\b(?:debit|debited|spent|paid|purchase|charge|fee|withdraw|outflow)\b/i.test(normalized)) {
    return "expense";
  }
  if (/\b(?:credit|credited|inflow|received|deposit)\b/i.test(normalized)) {
    return "income";
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
  if (/(netflix|spotify|apple|amazon prime|subscription|dstv|gotv|showmax|youtube)/.test(normalized)) return "Subscriptions";
  if (/(food|restaurant|pizza|kfc|chicken republic|eat|chow|sweet sensation|bukka|grill)/.test(normalized)) return "Food & Dining";
  if (/(mtn|airtel|glo|9mobile|data|airtime|recharge)/.test(normalized)) return "Phone & Data";
  if (/(shoprite|spar|supermarket|mall|store|buy|market|hubmart|jumia|konga)/.test(normalized)) return "Shopping";
  if (/(electricity|ikedc|ekedc|aedc|phed|eedc|water|waste|utility|utilities|bill)/.test(normalized)) return "Utilities";
  if (/(hospital|pharmacy|drugs|health|clinic|medplus|healthplus)/.test(normalized)) return "Healthcare";
  if (bank) return bank;
  return "General Expense";
}

/**
 * Only accept clear transaction / transfer / alert emails.
 * Marketing and newsletters are ignored.
 */
function isTransactionEmail(text: string): boolean {
  return /(debit|credit|transaction|transfer|receipt|payment|alert|credited|debited|paid|sent|received|purchase|pos|invoice|bill|topup|top-up|recharge|withdrawal|deposit|inflow|outflow)/i.test(
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


