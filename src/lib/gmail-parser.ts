export type ParsedFinancialEmail = {
  amount: number; // amount in base currency units (e.g., Naira)
  description: string;
  entry_type: "income" | "expense";
  category: string;
  provider?: string;
  bank?: string;
  account_balance?: number; // in base currency units
  transaction_time?: string;
  reason?: string;
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

function extractAmount(text: string): number | null {
  // Priority 1: Match explicit transaction amount labels (e.g. "Amount: N5,000.00", "Txn Amount: ₦5,000.00", "Credit: ₦5,000", "Debit: ₦5,000", "Value: N5,000")
  const explicitMatch = text.match(
    /(?:Transaction\s*Amount|Txn\s*Amount|Credit\s*Amount|Debit\s*Amount|Amount\s*Credited|Amount\s*Debited|Paid|Received|Amount|Value|Val|Sum)[:\s]*(?:₦|NGN|N|\$)?\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)/i
  );
  if (explicitMatch?.[1]) {
    const val = parseFloat(explicitMatch[1].replace(/,/g, ""));
    if (!isNaN(val) && Math.abs(val) > 0) return Math.abs(val);
  }

  // Priority 2: Match currency symbols followed directly by numbers (e.g. "₦5,000.00", "N5,000.00", "NGN 5,000.00")
  const currencyMatch = text.match(/(?:₦|NGN|\bN\b)\s*([1-9]\d{0,2}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/i);
  if (currencyMatch?.[1]) {
    const val = parseFloat(currencyMatch[1].replace(/,/g, ""));
    if (!isNaN(val) && Math.abs(val) > 0) return Math.abs(val);
  }

  // Priority 3: Fallback match for standard number format with thousand separators (e.g., 5,000.00 or 5000.00)
  const fallbackMatch = text.match(/\b([1-9]\d{0,2}(?:,\d{3})+(?:\.\d{2})?)\b/) || text.match(/\b([1-9]\d{3,6}(?:\.\d{2})?)\b/);
  if (fallbackMatch?.[1]) {
    const val = parseFloat(fallbackMatch[1].replace(/,/g, ""));
    if (!isNaN(val) && val > 0) return val;
  }

  return null;
}

function extractBalance(text: string): number | null {
  const regex = /(?:Available\s+Balance|Ledger\s+Balance|Acct\s+Bal|Bal|Balance|New\s+Balance)[:\s]*(?:₦|NGN|N)?\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)/i;
  const match = text.match(regex);
  if (match?.[1]) {
    const val = parseFloat(match[1].replace(/,/g, ""));
    if (!isNaN(val) && Math.abs(val) > 0) return Math.abs(val);
  }
  return null;
}

function extractTime(text: string): string | undefined {
  const timeMatch = text.match(/\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?)\b/i) ||
                    text.match(/\b(\d{2}-\w{3}-\d{4}\s+(\d{2}:\d{2}(?::\d{2})?))\b/i);
  if (timeMatch?.[1]) {
    return timeMatch[1].trim();
  }
  return undefined;
}

export function cleanExtractedDescription(candidate?: string | null, bank?: string): string | null {
  if (!candidate) return null;

  let cleaned = candidate
    .replace(/^of this transaction are shown below[:\s]*/i, "")
    .replace(/^the details of this transaction are shown below[:\s]*/i, "")
    .replace(/^details of this transaction[:\s]*/i, "")
    .replace(/^are shown below[:\s]*/i, "")
    .replace(/^transaction notification account number\s*:.*$/i, "")
    .replace(/account number\s*:.*$/i, "")
    .replace(/\s+bank$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (
    !cleaned ||
    cleaned.length < 2 ||
    /^(of this transaction|transaction notification|transaction occurred|details of this|are shown below|account number|transaction type|we write to inform you)$/i.test(cleaned) ||
    /inform you that a (?:debit|credit) transaction/i.test(cleaned)
  ) {
    return null;
  }

  return cleaned;
}

function extractReason(text: string, description: string, entryType: "income" | "expense", bank?: string): string {
  const normalized = normalizeText(text);

  const cleanDesc = cleanExtractedDescription(description, bank) || (bank ? `${bank} Alert` : "Transaction Alert");

  if (/(uber|bolt|indrive|transport|flight|ride|taxi)/i.test(normalized)) return `Ride hailing & transport via ${bank || "provider"}`;
  if (/(netflix|spotify|apple|subscription|dstv|gotv|youtube)/i.test(normalized)) return `Digital subscription payment`;
  if (/(food|restaurant|pizza|kfc|chicken republic|eat|chow|sweet sensation|bukka|grill|domino)/i.test(normalized)) return `Food & dining purchase`;
  if (/(mtn|airtel|glo|9mobile|data|airtime|recharge)/i.test(normalized)) return `Airtime & mobile data top-up`;
  if (/(shoprite|spar|supermarket|grocery|mall|store|buy|market|jumia|konga)/i.test(normalized)) return `Supermarket & grocery purchase`;
  if (/(electricity|ikedc|ekedc|aedc|phed|eedc|water|utility|bill)/i.test(normalized)) return `Utility bill payment`;
  if (/(salary|payroll|wages|stipend)/i.test(normalized)) return `Salary payout from employer`;
  if (/(transfer|trf|sent|paid to|beneficiary)/i.test(normalized)) return `Interbank transfer (${cleanDesc})`;
  if (entryType === "income") return `Inflow credit to ${bank || "account"}`;
  return `Debit transaction (${cleanDesc})`;
}

function extractDescription(text: string, from: string, bank?: string): string {
  // 1. OPay transfer recipient pattern ("Name: PAUL KWAGWI DEMBO Bank: OPay Account Number: ...")
  const opayMatch = text.match(/Name:\s*([^:\n\.\,]{2,50})(?:\s+Bank:|\s+Account|\s*$)/i) || text.match(/Name:\s*([^:\n\.\,]{2,40})/i);
  if (opayMatch?.[1]) {
    const candidate = cleanExtractedDescription(opayMatch[1], bank);
    if (candidate && !/transaction|account|amount|debit|credit|notification/i.test(candidate)) {
      return `Transfer to ${candidate.slice(0, 50)}`;
    }
  }

  // 2. GTBank & explicit bank narration fields (Remarks, Narration, Beneficiary, Merchant, Paid To, Recipient)
  const explicitFieldMatch = text.match(
    /(?:Remarks|Narration|Merchant|Paid to|Received from|Beneficiary|Recipient|Sender)[:\s\-=]+([^,\.\n]{2,80})/i
  );
  if (explicitFieldMatch?.[1]) {
    const candidate = cleanExtractedDescription(explicitFieldMatch[1], bank);
    if (candidate) {
      return candidate.slice(0, 80);
    }
  }

  // 3. Check for "Transfer to <Name>" or "Paid to <Name>" or "Received from <Name>" in body text
  const transferNameMatch = text.match(/(?:transfer\s+to|paid\s+to|sent\s+to|credited\s+to|received\s+from)\s+([A-Z\s]{3,40})/i);
  if (transferNameMatch?.[1]) {
    const candidate = cleanExtractedDescription(transferNameMatch[1], bank);
    if (candidate && candidate.length >= 3 && !/transaction|account|amount|debit|credit|notification/i.test(candidate)) {
      return `Transfer to ${candidate.slice(0, 50)}`;
    }
  }

  // 4. Airtime / Mobile data patterns
  if (/\b(?:airtime|recharge|data top-up|data topup|mobile data)\b/i.test(text)) {
    const telcoMatch = text.match(/\b(MTN|Airtel|Glo|9mobile)\b/i);
    if (telcoMatch?.[1]) {
      return `${telcoMatch[1].toUpperCase()} Airtime & Data`;
    }
    return "Airtime & Data Top-up";
  }

  // 5. Generic Description / Desc label (excluding GTBank boilerplate headers)
  const descMatch = text.match(/(?:Desc|Description)[:\s\-=]+([^,\.\n]{2,80})/i);
  if (descMatch?.[1]) {
    const candidate = cleanExtractedDescription(descMatch[1], bank);
    if (candidate) return candidate.slice(0, 80);
  }

  // 6. GTBank / Provider fallbacks
  if (bank) {
    if (/\b(?:pos|pos purchase|pos payment)\b/i.test(text)) return `${bank} POS Purchase`;
    if (/\b(?:atm|atm withdrawal)\b/i.test(text)) return `${bank} ATM Withdrawal`;
    if (/\b(?:debit|debited|sent|outward|dr)\b/i.test(text.slice(0, 300))) return `${bank} Debit Alert`;
    if (/\b(?:credit|cr|credited|received|deposit)\b/i.test(text.slice(0, 300))) return `${bank} Credit Alert`;
    return `${bank} Alert`;
  }

  if (from) {
    const cleanedFrom = from.split("<")[0].replace(/"/g, "").trim().slice(0, 50);
    if (cleanedFrom && !/no-reply|noreply|notification|alert/i.test(cleanedFrom)) {
      return cleanedFrom;
    }
  }

  return "Bank Transaction";
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

  // 1. Explicit Credit / Inflow Signals (User received money)
  const isSubjectCredit =
    /\b(?:credit\s*alert|credit\s*notification|credit\s*advice|account\s*credited|money\s*received|payment\s*received|payout\s*received|transfer\s*received|deposit\s*successful|inward\s*transfer|salary|nip\s*credit|fip\s*credit|cr\s*alert)\b/i.test(
      normalizedSubject
    ) ||
    /\[credit[:\s]/i.test(subject); // GTBank format: "Transaction Notification [Credit: N5,000.00]"

  const isBodyCredit =
    /\b(?:credit|cr)\s*alert\b/i.test(combined) ||
    /\bcredit\s*notification\b/i.test(combined) ||
    /\bcredit\s*advice\b/i.test(combined) ||
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
    /\bcr\s+amount\b/i.test(combined) ||
    /\bamount\s*credited\b/i.test(combined) ||
    /\bpayout\s*received\b/i.test(combined) ||
    /\bpayment\s*received\b/i.test(combined) ||
    /\bcredited\s*to\s*your\b/i.test(combined);

  // 2. Explicit Debit / Outflow Signals (User spent/sent money)
  const isSubjectDebit =
    /\b(?:debit\s*alert|debit\s*notification|debit\s*advice|account\s*debited|transfer\s*sent|payment\s*sent|outward\s*transfer|pos\s*purchase|atm\s*withdrawal|dr\s*alert)\b/i.test(
      normalizedSubject
    );

  const isBodyDebit =
    /\b(?:debit|dr)\s*alert\b/i.test(combined) ||
    /\bdebit\s*notification\b/i.test(combined) ||
    /\bdebit\s*advice\b/i.test(combined) ||
    /\b(?:your\s+)?acct(?:ount)?\s*(?:[^\n\.\,]{0,40})?\bdebited\b/i.test(combined) ||
    /\bdebited\s+(?:with|for|by|of|amount)\b/i.test(combined) ||
    /\bamount\s*debited\b/i.test(combined) ||
    /\b(?:you\s+)?transferred\s+to\b/i.test(combined) ||
    /\b(?:you\s+)?sent\s+to\b/i.test(combined) ||
    /\b(?:you\s+)?paid\s+to\b/i.test(combined) ||
    /\b(?:you\s+)?spent\b/i.test(combined) ||
    /\btransfer\s+(?:sent|outward|to)\b/i.test(combined) ||
    /\bwithdrawal\s+(?:successful|notification)\b/i.test(combined) ||
    /\batm\s+withdrawal\b/i.test(combined) ||
    /\bpos\s+(?:purchase|transaction|receipt|payment)\b/i.test(combined) ||
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

  // 3. Priority Evaluation
  if (isSubjectCredit) return "income";
  if (isSubjectDebit) return "expense";

  // If body has explicit CR transaction type or credited label, it's income
  if (isBodyCredit && !isBodyDebit) return "income";
  if (isBodyDebit && !isBodyCredit) return "expense";

  if (isBodyCredit && isBodyDebit) {
    if (/\b(?:transaction\s*type\s*[:\s]*credit|cr\s*amount|amount\s*credited|credited\s*to\s*your)\b/i.test(combined)) {
      return "income";
    }
    if (/\b(?:transaction\s*type\s*[:\s]*debit|dr\s*amount|amount\s*debited|debited\s*from\s*your)\b/i.test(combined)) {
      return "expense";
    }
  }

  // Fallbacks
  if (/\b(?:credit|cr|received|salary|deposit|inflow|inward|refund)\b/i.test(normalizedSubject)) {
    return "income";
  }
  if (/\b(?:debit|dr|sent|paid|spent|transfer|withdrawal|pos|bill|recharge|outward)\b/i.test(normalizedSubject)) {
    return "expense";
  }

  if (/\b(?:credit|credited|inflow|received|deposit|salary|payroll|refund)\b/i.test(combined)) {
    return "income";
  }

  return "expense";
}

export function inferCategory(text: string, entryType: "income" | "expense", bank?: string): string {
  const normalized = normalizeText(text);

  if (entryType === "income") {
    if (/(salary|payroll|wages|stipend)/i.test(normalized)) return "Salary";
    if (/(refund|cashback|reversal)/i.test(normalized)) return "Refunds";
    if (/(dividend|interest|investment|yield)/i.test(normalized)) return "Investments";
    return "Income";
  }

  if (/(uber|bolt|indrive|transport|flight|airline|ride|taxi|rail|bus|fuel|petrol|gas station)/i.test(normalized)) return "Transport & Fuel";
  if (/(netflix|spotify|apple|amazon prime|subscription|dstv|gotv|showmax|youtube|audible|patreon)/i.test(normalized)) return "Subscriptions";
  if (/(food|restaurant|pizza|kfc|chicken republic|domino|eat|chow|sweet sensation|bukka|grill|cafe|dining|bistro)/i.test(normalized)) return "Food & Dining";
  if (/(mtn|airtel|glo|9mobile|data|airtime|recharge)/i.test(normalized)) return "Phone & Data";
  if (/(shoprite|spar|supermarket|grocery|mall|store|market|hubmart|jumia|konga|boutique|retail)/i.test(normalized)) return "Shopping & Groceries";
  if (/(electricity|ikedc|ekedc|aedc|phed|eedc|water|waste|utility|utilities|bill|power)/i.test(normalized)) return "Utilities & Bills";
  if (/(hospital|pharmacy|drugs|health|clinic|medplus|healthplus|dental|optical|doctor|medical)/i.test(normalized)) return "Healthcare";
  if (/(school|tuition|course|udemy|coursera|exam|waec|jamb|education|training)/i.test(normalized)) return "Education";
  if (/(cinema|movie|event|ticket|bet9ja|sportybet|gaming|entertainment)/i.test(normalized)) return "Entertainment";
  if (/(transfer|trf|sent|pos transfer|paid to|beneficiary|withdrawal)/i.test(normalized)) return "Transfer";

  return "General Expense";
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
  const isFinancialDomain = /@(?:opay-nigeria\.com|opayweb\.com|opay\.com|kudabank\.com|kuda\.com|palmpay\.com|moniepoint\.com|gtbank\.com|gtco\.com|zenithbank\.com|accessbankplc\.com|accessbank\.com|ubagroup\.com|firstbanknigeria\.com|stanbic\.com|fcmb\.com|fidelitybank\.ng|unionbankng\.com|wema\.africa|providusbank\.com|sterling\.ng|polarisbanklimited\.com|grey\.co|flutterwave\.com|paystack\.com|chippercash\.com|remita\.net|quickteller\.com)/i.test(
    normalizedFrom
  );

  // 4. Require explicit transaction phrases (never match bare standalone word "alert")
  const hasExplicitTransactionPhrase =
    /\b(?:debit\s*alert|credit\s*alert|debit\s*notification|credit\s*notification|transfer\s*notification|transfer\s*alert|transfer\s*successful|withdrawal\s*successful|deposit\s*successful|payment\s*successful|transaction\s*notification|transaction\s*alert|account\s*debited|account\s*credited|transfer\s*sent|transfer\s*received|pos\s*purchase|pos\s*transaction|atm\s*withdrawal|airtime\s*(?:top-up|topup|recharge)|bill\s*payment|refund\s*notification|salary\s*credit|inflow\s*alert|outflow\s*alert|money\s*received|you\s*sent|you\s*paid|you\s*received|you\s*spent|you\s*recharged|transaction\s*advice|payment\s*advice|debit\s*advice|credit\s*advice|transfer\s*advice|transaction\s*receipt|payment\s*receipt|nip\s*transfer|nibss|card\s*purchase|web\s*purchase|web\s*payment|ussd\s*transfer|direct\s*debit|standing\s*order|notice\s*of\s*credit|notice\s*of\s*debit|funds\s*transferred|funds\s*received|account\s*activity|bank\s*alert)\b/i.test(
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
  const description = extractDescription(text, from, bankInfo?.label);
  const transaction_time = extractTime(text);
  const reason = extractReason(text, description, entryType, bankInfo?.label);

  return {
    amount,
    description,
    entry_type: entryType,
    category: inferCategory(text, entryType, bankInfo?.label),
    provider: bankInfo?.id,
    bank: bankInfo?.label,
    account_balance,
    transaction_time,
    reason,
  };
}
