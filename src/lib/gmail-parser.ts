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
  // Check for OPay transfer recipient patterns (e.g. "Name: PAUL KWAGWI DEMBO Bank: OPay Account Number: ...")
  const opayMatch = text.match(/Name:\s*([^:\n\.\,]{2,40})/i);
  if (opayMatch?.[1]?.trim()) {
    const rawName = opayMatch[1].trim();
    if (!/transaction|account|amount|debit|credit/i.test(rawName)) {
      return `Transfer to ${rawName.slice(0, 50)}`;
    }
  }

  // Check for explicit transfer narration or details labels
  const descMatch = text.match(
    /(?:Desc|Description|Remarks|Narration|Merchant|Paid to|Received from|Beneficiary|Recipient|Sender|Details)[:\s\-=]+([^,\.\n]{2,80})/i
  );
  if (descMatch?.[1]?.trim()) {
    const rawDesc = descMatch[1].trim();
    if (!/inform you that a (?:debit|credit) transaction occurred/i.test(rawDesc)) {
      return rawDesc.slice(0, 80);
    }
  }

  if (bank) {
    if (/\b(?:debit|dr|debited|sent|paid|withdrawal)\b/i.test(text.slice(0, 300))) {
      return `${bank} Debit Alert`;
    }
    if (/\b(?:credit|cr|credited|received|deposit)\b/i.test(text.slice(0, 300))) {
      return `${bank} Credit Alert`;
    }
    return `${bank} Alert`;
  }

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

export function inferEntryType(text: string, subject = "", from = ""): "income" | "expense" {
  const combined = normalizeText(`${subject} ${text}`);
  const normalizedSubject = normalizeText(subject);

  // 1. Check if Subject is explicitly a Credit Alert for the User
  const isSubjectExplicitCredit =
    /\b(?:credit\s*alert|credit\s*notification|account\s*credited|money\s*received|you\s*received|transfer\s*received|deposit\s*successful|inward\s*transfer|salary)\b/i.test(normalizedSubject);

  // 2. Explicit User Debit / Expense Signals (User's money left account)
  const isUserDebited =
    /\b(?:debit|dr)\s*alert\b/i.test(combined) ||
    /\bdebit\s*notification\b/i.test(combined) ||
    /\b(?:your\s+)?acct(?:ount)?\s*(?:[^\n\.\,]{0,40})?\bdebited\b/i.test(combined) ||
    /\bdebited\s+(?:with|for|by|of|amount)\b/i.test(combined) ||
    /\b(?:you\s+)?transferred\b/i.test(combined) ||
    /\b(?:you\s+)?sent\b/i.test(combined) ||
    /\b(?:you\s+)?paid\b/i.test(combined) ||
    /\b(?:you\s+)?spent\b/i.test(combined) ||
    /\btransfer\s+(?:successful|sent|outward|to)\b/i.test(combined) ||
    /\bwithdrawal\s+(?:successful|notification)\b/i.test(combined) ||
    /\batm\s+withdrawal\b/i.test(combined) ||
    /\bpos\s+(?:purchase|transaction|receipt|payment|transfer)\b/i.test(combined) ||
    /\bairtime\s+(?:purchase|recharge|top-up|topup)\b/i.test(combined) ||
    /\b(?:bill|data|utility|dstv|gotv|electricity)\s+payment\b/i.test(combined) ||
    /\btransaction\s*type\s*[:\s]*(?:debit|dr)\b/i.test(combined) ||
    /\bdr\s+amount\b/i.test(combined) ||
    /\bcard\s+(?:charge|payment|debit)\b/i.test(combined) ||
    /\bcommission\s+charge\b/i.test(combined) ||
    /\bsms\s+charge\b/i.test(combined) ||
    /\bstamp\s+duty\b/i.test(combined) ||
    /\bvat\s+charge\b/i.test(combined) ||
    /\boutward\s+transfer\b/i.test(combined);

  // 3. Explicit User Credit / Income Signals (User received money into account)
  const isUserCredited =
    /\b(?:credit|cr)\s*alert\b/i.test(combined) ||
    /\bcredit\s*notification\b/i.test(combined) ||
    /\b(?:your\s+)?acct(?:ount)?\s*(?:[^\n\.\,]{0,40})?\bcredited\b/i.test(combined) ||
    /\bcredited\s+(?:with|for|by|of|amount)\b/i.test(combined) ||
    /\b(?:you\s+)?received\b/i.test(combined) ||
    /\breceived\s+from\b/i.test(combined) ||
    /\btransfer\s+(?:received|from)\b/i.test(combined) ||
    /\binward\s+transfer\b/i.test(combined) ||
    /\binflow\s*(?:alert|notification)?\b/i.test(combined) ||
    /\bsalary\b/i.test(combined) ||
    /\bpayroll\b/i.test(combined) ||
    /\brefund\b/i.test(combined) ||
    /\bcash\s*in\b/i.test(combined) ||
    /\bdeposit\s+(?:alert|successful)\b/i.test(combined) ||
    /\btransaction\s*type\s*[:\s]*(?:credit|cr)\b/i.test(combined) ||
    /\bcr\s+amount\b/i.test(combined);

  // Priority Rule 1: If user's account was debited, it MUST be classified as an expense
  // UNLESS the subject line explicitly specifies a Credit Alert for the user.
  // (Phrases like "Beneficiary Account Credited: [Name]" inside debit alerts refer to the recipient, NOT the user).
  if (isUserDebited && !isSubjectExplicitCredit) {
    return "expense";
  }

  // Priority Rule 2: Pure credit signal for user
  if (isUserCredited && !isUserDebited) {
    return "income";
  }

  // Priority Rule 3: Subject fallback with strict word boundaries
  if (/\b(?:debit|dr|sent|paid|spent|transfer|withdrawal|pos|bill|recharge|outward)\b/i.test(normalizedSubject)) {
    return "expense";
  }
  if (/\b(?:credit|cr|received|salary|deposit|inflow|inward|refund)\b/i.test(normalizedSubject)) {
    return "income";
  }

  // Priority Rule 4: Body fallback with strict word boundaries
  if (/\b(?:debit|debited|spent|paid|purchase|charge|fee|withdraw|outflow|outward)\b/i.test(combined)) {
    return "expense";
  }
  if (/\b(?:credit|credited|inflow|received|deposit|salary|payroll|refund)\b/i.test(combined)) {
    return "income";
  }

  return "expense";
}

function inferCategory(text: string, entryType: "income" | "expense", bank?: string): string {
  const normalized = normalizeText(text);

  if (entryType === "income") {
    if (/(salary|payroll|wages)/.test(normalized)) return "salary";
    return "income";
  }

  if (/(transfer|sent|pos transfer|paid to|beneficiary)/.test(normalized)) return "transfer";
  if (/(uber|bolt|indrive|transport|flight|ride|ride-hailing)/.test(normalized)) return "transport";
  if (/(netflix|spotify|apple|amazon prime|subscription|dstv|gotv|showmax|youtube)/.test(normalized)) return "subscriptions";
  if (/(food|restaurant|pizza|kfc|chicken republic|eat|chow|sweet sensation|bukka|grill)/.test(normalized)) return "dining";
  if (/(mtn|airtel|glo|9mobile|data|airtime|recharge)/.test(normalized)) return "utilities";
  if (/(shoprite|spar|supermarket|mall|store|buy|market|hubmart|jumia|konga)/.test(normalized)) return "shopping";
  if (/(electricity|ikedc|ekedc|aedc|phed|eedc|water|waste|utility|utilities|bill)/.test(normalized)) return "utilities";
  if (/(hospital|pharmacy|drugs|health|clinic|medplus|healthplus)/.test(normalized)) return "healthcare";
  return "transfer";
}

/**
 * Accept ONLY legitimate transaction / transfer / alert emails.
 * Marketing, newsletters, job alerts, security alerts, and system notifications are strictly rejected.
 */
function isTransactionEmail(text: string, subject = "", from = ""): boolean {
  const normalizedFrom = (from || "").toLowerCase();
  const normalizedSubject = (subject || "").toLowerCase();
  const combined = `${normalizedSubject} ${text}`.toLowerCase();

  // 1. Sender Blacklist (Non-financial service senders)
  if (
    /jobberman|linkedin|indeed|glassdoor|careers|recruitment|newsletter|no-reply@accounts\.google\.com|security-noreply@github\.com|facebook|twitter|instagram|x\.com|tiktok/i.test(
      normalizedFrom
    )
  ) {
    return false;
  }

  // 2. Subject Blacklist (Non-financial notification titles)
  if (
    /\b(?:job\s*alert|jobs\s*available|security\s*alert|login\s*alert|new\s*sign-in|password\s*reset|verify\s*your\s*email|verification\s*code|\botp\b|two-factor|\b2fa\b|newsletter|promotions|welcome\s*to|terms\s*of\s*service|privacy\s*policy)\b/i.test(
      normalizedSubject
    )
  ) {
    return false;
  }

  // 3. Known Financial Institution / Fintech Domain Check
  const isFinancialDomain = /@(?:opay-nigeria\.com|kudabank\.com|palmpay\.com|moniepoint\.com|gtbank\.com|gtco\.com|zenithbank\.com|accessbankplc\.com|ubagroup\.com|firstbanknigeria\.com|stanbic\.com|fcmb\.com|fidelitybank\.ng|unionbankng\.com|wema\.africa|providusbank\.com|sterling\.ng|polarisbanklimited\.com|grey\.co|flutterwave\.com|paystack\.com|chippercash\.com|remita\.net|quickteller\.com)/i.test(
    normalizedFrom
  );

  // 4. Require explicit transaction phrases (never match bare standalone word "alert")
  const hasExplicitTransactionPhrase =
    /\b(?:debit\s*alert|credit\s*alert|debit\s*notification|credit\s*notification|transfer\s*notification|transfer\s*alert|transfer\s*successful|withdrawal\s*successful|deposit\s*successful|payment\s*successful|transaction\s*notification|transaction\s*alert|account\s*debited|account\s*credited|transfer\s*sent|transfer\s*received|pos\s*purchase|pos\s*transaction|atm\s*withdrawal|airtime\s*recharge|bill\s*payment|refund\s*notification|salary\s*credit|inflow\s*alert|outflow\s*alert|money\s*received|you\s*sent|you\s*paid|you\s*received|you\s*spent)\b/i.test(
      combined
    );

  if (hasExplicitTransactionPhrase) {
    return true;
  }

  if (isFinancialDomain && /(?:amount|naira|ngn|₦|debited|credited|paid|sent|received|transferred|value)/i.test(combined)) {
    return true;
  }

  return false;
}

export function parseFinancialEmailData(
  emailBody: string,
  subject: string,
  from: string
): ParsedFinancialEmail | null {
  const text = `${subject} ${emailBody}`.replace(/\s+/g, " ").trim();
  if (!text) return null;

  if (!isTransactionEmail(text, subject, from)) return null;

  const amount = extractAmount(text);
  if (amount === null || amount <= 0) return null;

  const entryType = inferEntryType(text, subject, from);
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


