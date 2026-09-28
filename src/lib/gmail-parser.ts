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
  { id: "gtbank", label: "GTBank", pattern: /\b(?:gtbank|gtb|guaranty\s*trust|gtco)\b/i },
  { id: "zenith", label: "Zenith Bank", pattern: /\bzenith\b/i },
  { id: "access", label: "Access Bank", pattern: /\baccess\s*bank\b|\baccessbank\b|\baccess\s*more\b/i },
  { id: "uba", label: "UBA", pattern: /\buba\b|united\s*bank\s*for\s*africa/i },
  { id: "firstbank", label: "First Bank", pattern: /\bfirst\s*bank\b|\bfirstbank\b|\bfirstmonie\b/i },
  { id: "stanbic", label: "Stanbic IBTC", pattern: /\bstanbic\b/i },
  { id: "fcmb", label: "FCMB", pattern: /\bfcmb\b|first\s*city\s*monument\s*bank/i },
  { id: "opay", label: "OPay", pattern: /\bopay(?:web)?\b/i },
  { id: "kuda", label: "Kuda Bank", pattern: /\bkuda\b/i },
  { id: "palmpay", label: "PalmPay", pattern: /\bpalmpay\b/i },
  { id: "moniepoint", label: "Moniepoint", pattern: /\bmoniepoint\b/i },
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
  { id: "taxtech", label: "Taxtech", pattern: /\b(?:taxtech|taxaide)\b/i },
  { id: "jobberman", label: "Jobberman", pattern: /\bjobberman\b/i },
];

// ── Negative Keyword Blacklist for Marketing & Announcement Emails ─────────
const EXCLUDED_MARKETING_KEYWORDS = [
  "security alert", "login alert", "verification code", "password reset", "two-factor", "2fa", "otp",
  "welcome to", "newsletter", "unsubscribe", "survey", "rate your experience",
  "bonus cash", "promo code", "claim your discount", "special offer", "limited time offer",
  "notice of branch closure", "branch closure", "important update on", "naira card",
  "spending limit", "terms of service", "terms and conditions", "privacy policy",
  "dangote ipo", "dangote refinery", "school fees from abroad", "subscribe to",
  "system upgrade", "scheduled maintenance", "maintenance window", "service downtime",
  "public holiday", "eid el", "easter", "christmas", "father's day", "mother's day",
  "democracy day", "independence day", "annual report", "annual general meeting",
  "financial statement", "statutory notice", "tariff", "webinar", "cashback promo",
  "win a chance", "level up", "make a move", "business series", "chowdeck",
  "tech conversation", "business success story", "summer body", "get rewarded on your account anniversary",
  "not every leo message is from leo", "meet uba money explorers", "help kids spend smarter"
];

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function extractTableKeyValuePairs(html: string): Record<string, string> {
  const kv: Record<string, string> = {};
  if (!html) return kv;

  // Match <tr><td>Key</td><td>Value</td></tr> patterns
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const rowHtml = match[1];
    const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
    const cells: string[] = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      const clean = cellMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (clean) cells.push(clean);
    }
    if (cells.length >= 2) {
      const key = cells[0].replace(/:/g, "").trim().toLowerCase();
      const val = cells[1].trim();
      if (key && val) {
        kv[key] = val;
      }
    }
  }

  return kv;
}

function extractAmount(text: string): number | null {
  const isLikelyYear = (num: number, snippet: string) => {
    if (num >= 1990 && num <= 2040 && Number.isInteger(num)) {
      return !/(?:₦|NGN|\bN\b|\$|Amount|Paid|Value|Txn|Credited|Debited)/i.test(snippet);
    }
    return false;
  };

  // Priority 0: Explicit payment pattern e.g. "Your payment of ₦15,369.00 is successful"
  const paymentMatch = text.match(
    /(?:your\s+payment\s+of|payment\s+of|amount\s+of|sum\s+of|value\s+of)[:\s]*(?:₦|NGN|N|\$)?\s*([1-9]\d{0,2}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/i
  );
  if (paymentMatch?.[1]) {
    const val = parseFloat(paymentMatch[1].replace(/,/g, ""));
    if (!isNaN(val) && val > 0 && !isLikelyYear(val, paymentMatch[0])) return val;
  }

  // Priority 1: Match explicit transaction amount labels (e.g. "Amount: N5,000.00", "Txn Amount: ₦5,000.00", "Credit: ₦5,000", "Debit: ₦5,000", "Value: N5,000")
  const explicitMatch = text.match(
    /(?:Transaction\s*Amount|Txn\s*Amount|Credit\s*Amount|Debit\s*Amount|Amount\s*Credited|Amount\s*Debited|Paid|Received|Amount|Value|Val|Sum)[:\s]*(?:₦|NGN|N|\$)?\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)/i
  );
  if (explicitMatch?.[1]) {
    const val = parseFloat(explicitMatch[1].replace(/,/g, ""));
    if (!isNaN(val) && Math.abs(val) > 0 && !isLikelyYear(val, explicitMatch[0])) return Math.abs(val);
  }

  // Priority 2: Match currency symbols followed directly by numbers (e.g. "₦5,000.00", "N5,000.00", "NGN 5,000.00")
  const currencyMatch = text.match(/(?:₦|NGN|\bN\b|\$)\s*([1-9]\d{0,2}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/i);
  if (currencyMatch?.[1]) {
    const val = parseFloat(currencyMatch[1].replace(/,/g, ""));
    if (!isNaN(val) && Math.abs(val) > 0) return Math.abs(val);
  }

  return null;
}

function extractBalance(text: string): number | null {
  const regex = /(?:Available\s+Balance|Ledger\s+Balance|Acct\s+Bal|Account\s+Balance|Bal|Balance|New\s+Balance|Book\s+Balance|Ending\s+Balance)(?:\s+is)?[:\s]*(?:₦|NGN|N|\$)?\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)/i;
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
    .replace(/<[^>]+>/g, " ")
    .replace(/width=["']?\d+["']?/gi, "")
    .replace(/height=["']?\d+["']?/gi, "")
    .replace(/alt=["']?[^"']*["']?/gi, "")
    .replace(/src=["']?[^"']*["']?/gi, "")
    .replace(/Logo"?\s*/gi, "")
    .replace(/^of this transaction are shown below[:\s]*/i, "")
    .replace(/^the details of this transaction are shown below[:\s]*/i, "")
    .replace(/^details of this transaction[:\s]*/i, "")
    .replace(/^are shown below[:\s]*/i, "")
    .replace(/^transaction notification account number\s*:.*$/i, "")
    .replace(/account number\s*:.*$/i, "")
    // Strip trailing Bank/Plc/Account/STAN/Session ID trailers that stick to beneficiary names
    .replace(/(?:\s+Bank[:\s]+.*|\s+Bank$)/gi, "")
    .replace(/(?:\s+Account(?:\s+Number)?[:\s]+.*|\s+Acct(?:\s+No)?[:\s]+.*)$/gi, "")
    .replace(/(?:\s+Order\s+(?:No|Number).*|\s+Txn\s+(?:No|Ref).*|\s+Session\s+ID.*)$/gi, "")
    .replace(/(?:current|available|ledger|acct)?\s*balance\s*(?:is)?\s*(?:₦|ngn|n|\$)?\s*[\d,]+(?:\.\d{2})?/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (
    !cleaned ||
    cleaned.length < 2 ||
    /^(of this transaction|transaction notification|transaction occurred|details of this|are shown below|account number|transaction type|we write to inform you|current balance|available balance|ledger balance|acct bal|logo)$/i.test(cleaned) ||
    /(?:current|available|ledger)\s*balance|inform you that a (?:debit|credit) transaction/i.test(cleaned)
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
  if (/(transfer|trf|sent|paid to|beneficiary)/i.test(normalized)) return `Payment / transfer (${cleanDesc})`;
  if (entryType === "income") return `Inflow credit to ${bank || "account"}`;
  return `Debit transaction (${cleanDesc})`;
}

export function extractDescription(text: string, from: string, bank?: string, kv?: Record<string, string>): string {
  // Check structured KV pairs first if available
  if (kv) {
    for (const k of ["remarks", "narration", "description", "recipient", "name", "beneficiary", "merchant name", "merchant"]) {
      if (kv[k]) {
        const candidate = cleanExtractedDescription(kv[k], bank);
        if (candidate && !/transaction|account|amount|debit|credit|notification|balance/i.test(candidate)) {
          if (k === "merchant name" || k === "merchant") {
            return candidate.startsWith("Payment to") ? candidate : `Payment to ${candidate.slice(0, 50)}`;
          }
          if (k === "recipient" || k === "name") {
            return candidate.startsWith("Transfer to") ? candidate : `Transfer to ${candidate.slice(0, 50)}`;
          }
          return candidate.slice(0, 80);
        }
      }
    }
  }

  // 1. Explicit Merchant Name pattern
  const merchantMatch = text.match(/(?:Merchant\s*Name|Merchant)[:\s\-=]+([^:\n\.,]{2,60})(?:\s+Merchant|\s+Order|\s+Txn|\s+Date|\s*$)/i);
  if (merchantMatch?.[1]) {
    const candidate = cleanExtractedDescription(merchantMatch[1], bank);
    if (candidate && !/transaction|account|amount|debit|credit|notification|balance/i.test(candidate)) {
      return candidate.startsWith("Payment to") ? candidate : `Payment to ${candidate.slice(0, 50)}`;
    }
  }

  // 2. OPay transfer recipient pattern
  const opayMatch = text.match(/Name:\s*([^:\n\.\,]{2,50})(?:\s+Bank:|\s+Account|\s*$)/i) || text.match(/Name:\s*([^:\n\.\,]{2,40})/i);
  if (opayMatch?.[1]) {
    const candidate = cleanExtractedDescription(opayMatch[1], bank);
    if (candidate && !/transaction|account|amount|debit|credit|notification|balance/i.test(candidate)) {
      return `Transfer to ${candidate.slice(0, 50)}`;
    }
  }

  // 3. Explicit bank narration fields
  const explicitFieldMatch = text.match(
    /(?:Remarks|Narration|Paid to|Received from|Beneficiary|Recipient|Sender)[:\s\-=]+([^,\.\n]{2,80})/i
  );
  if (explicitFieldMatch?.[1]) {
    const candidate = cleanExtractedDescription(explicitFieldMatch[1], bank);
    if (candidate && !/current balance|available balance|ledger balance/i.test(candidate)) {
      return candidate.slice(0, 80);
    }
  }

  // 4. "Transfer to <Name>" or "Paid to <Name>" in body text
  const transferNameMatch = text.match(/(?:transfer\s+to|paid\s+to|sent\s+to|credited\s+to|received\s+from)\s+([A-Z\s]{3,40})/i);
  if (transferNameMatch?.[1]) {
    const candidate = cleanExtractedDescription(transferNameMatch[1], bank);
    if (candidate && candidate.length >= 3 && !/transaction|account|amount|debit|credit|notification|balance/i.test(candidate)) {
      return `Transfer to ${candidate.slice(0, 50)}`;
    }
  }

  // 5. Airtime / Mobile data patterns
  if (/\b(?:airtime|recharge|data top-up|data topup|mobile data)\b/i.test(text)) {
    const telcoMatch = text.match(/\b(MTN|Airtel|Glo|9mobile)\b/i);
    if (telcoMatch?.[1]) {
      return `${telcoMatch[1].toUpperCase()} Airtime & Data`;
    }
    return "Airtime & Data Top-up";
  }

  // 6. Known Senders & Organizations
  if (from) {
    const cleanedFrom = from.split("<")[0].replace(/"/g, "").trim();
    if (cleanedFrom && !/no-reply|noreply|notification|alert|service|info/i.test(cleanedFrom)) {
      const fromOrg = cleanExtractedDescription(cleanedFrom, bank);
      if (fromOrg && fromOrg.length > 2) {
        if (/jobberman/i.test(fromOrg)) return "Jobberman Payment";
        if (/taxtech|taxaide/i.test(fromOrg)) return `Payment to ${fromOrg}`;
        return fromOrg.length <= 40 ? fromOrg : fromOrg.slice(0, 40);
      }
    }
  }

  // 7. Generic Description label
  const descMatch = text.match(/(?:Desc|Description)[:\s\-=]+([^,\.\n]{2,80})/i);
  if (descMatch?.[1]) {
    const candidate = cleanExtractedDescription(descMatch[1], bank);
    if (candidate) return candidate.slice(0, 80);
  }

  // 8. Bank fallbacks
  if (bank) {
    if (/\b(?:pos|pos purchase|pos payment)\b/i.test(text)) return `${bank} POS Purchase`;
    if (/\b(?:atm|atm withdrawal)\b/i.test(text)) return `${bank} ATM Withdrawal`;
    if (/\b(?:debit|debited|sent|outward|dr)\b/i.test(text.slice(0, 300))) return `${bank} Debit Alert`;
    if (/\b(?:credit|cr|credited|received|deposit)\b/i.test(text.slice(0, 300))) return `${bank} Credit Alert`;
    return `${bank} Alert`;
  }

  return "Bank Transaction";
}

function detectBank(text: string, from: string, subject = ""): { id: string; label: string } | null {
  // Priority 1: Check the email sender address (From header)
  if (from) {
    for (const bank of BANK_PATTERNS) {
      if (bank.pattern.test(from)) {
        return { id: bank.id, label: bank.label };
      }
    }
  }

  // Priority 2: Check email Subject header
  if (subject) {
    for (const bank of BANK_PATTERNS) {
      if (bank.pattern.test(subject)) {
        return { id: bank.id, label: bank.label };
      }
    }
  }

  // Priority 3: Search body text content — EXCEPT beneficiary/recipient transfer phrases
  const cleanBodyForBank = text
    .replace(/(?:transfer\s+to|paid\s+to|sent\s+to|credited\s+to|beneficiary(?:\s+bank)?[:\s]+|recipient(?:\s+bank)?[:\s]+|dest(?:\s+bank)?[:\s]+|to\s+bank[:\s]+)\s*([a-z0-9\s]{2,30})/gi, "")
    .replace(/(?:opay|kuda|palmpay|moniepoint|gtbank|zenith|access|uba|firstbank|stanbic|fcmb|sterling|wema)\s+account/gi, "");

  for (const bank of BANK_PATTERNS) {
    if (bank.pattern.test(cleanBodyForBank)) {
      return { id: bank.id, label: bank.label };
    }
  }

  return null;
}

export function inferEntryType(text: string, subject = "", from = "", kv?: Record<string, string>): "income" | "expense" {
  const combined = normalizeText(`${subject} ${text}`);
  const normalizedSubject = normalizeText(subject);

  // GTBank explicit subject format: [Credit: NGN ...] vs [Debit: NGN ...]
  if (/\[credit[:\s]/i.test(subject)) return "income";
  if (/\[debit[:\s]/i.test(subject)) return "expense";

  // Zenith Direct explicit subject: "Zenith Direct: Credit Alert" vs "Debit Alert"
  if (/credit\s*alert|credit\s*notification|nip\s*credit/i.test(normalizedSubject)) return "income";
  if (/debit\s*alert|debit\s*notification|nip\s*debit/i.test(normalizedSubject)) return "expense";

  // KV Table Type check (e.g. Transaction Type: CR / DR)
  if (kv) {
    const txnType = (kv["transaction type"] || kv["type"] || "").trim().toLowerCase();
    if (txnType === "cr" || txnType === "credit" || txnType === "inward") return "income";
    if (txnType === "dr" || txnType === "debit" || txnType === "outward") return "expense";
  }

  // Absolute Priority 0: Explicit Merchant / Payment Outflow Patterns
  if (
    /\b(?:merchant\s*name|merchant\s*order|your\s+payment\s+of|payment\s+successful|payment\s+receipt|paid\s+to|payment\s+details)\b/i.test(combined) &&
    !/\b(?:payment\s+received|payout\s+received|received\s+payment|credit\s+alert)\b/i.test(combined)
  ) {
    return "expense";
  }

  // Grammatical Direction Check: "transferred to", "paid to", "sent to" are ALWAYS expense
  if (/\b(?:you\s+)?(?:transferred|paid|sent)\s+(?:(?:ngn|₦|\$)?\s*[\d,]+(?:\.\d{2})?\s+)?to\b/i.test(combined)) {
    return "expense";
  }

  // 1. Explicit Credit / Inflow Signals (User received money)
  const isSubjectCredit =
    /\b(?:credit\s*alert|credit\s*notification|credit\s*advice|account\s*credited|money\s*received|payment\s*received|payout\s*received|transfer\s*received|deposit\s*successful|inward\s*transfer|salary|nip\s*credit|fip\s*credit|cr\s*alert)\b/i.test(
      normalizedSubject
    );

  const isBodyCredit =
    /\b(?:credit|cr)\s*alert\b/i.test(combined) ||
    /\b(?:your\s+)?acct(?:ount)?\s*(?:[^\n\.\,]{0,40})?\bcredited\b/i.test(combined) ||
    /\bcredited\s+(?:with|for|by|of|amount)\b/i.test(combined) ||
    /\breceived\s+from\b/i.test(combined) ||
    /\binward\s+transfer\b/i.test(combined) ||
    /\binflow\s*(?:alert|notification)?\b/i.test(combined) ||
    /\bsalary\b/i.test(combined) ||
    /\bamount\s*credited\b/i.test(combined) ||
    /\bpayment\s*received\b/i.test(combined);

  // 2. Explicit Debit / Outflow Signals (User spent/sent money)
  const isSubjectDebit =
    /\b(?:debit\s*alert|debit\s*notification|debit\s*advice|account\s*debited|transfer\s*sent|payment\s*sent|payment\s*successful|payment\s*receipt|outward\s*transfer|pos\s*purchase|atm\s*withdrawal|dr\s*alert)\b/i.test(
      normalizedSubject
    );

  const isBodyDebit =
    /\b(?:debit|dr)\s*alert\b/i.test(combined) ||
    /\b(?:your\s+)?acct(?:ount)?\s*(?:[^\n\.\,]{0,40})?\bdebited\b/i.test(combined) ||
    /\bdebited\s+(?:with|for|by|of|amount)\b/i.test(combined) ||
    /\bamount\s*debited\b/i.test(combined) ||
    /\b(?:your\s+)?payment\s+(?:of|for|to|is\s+successful)\b/i.test(combined) ||
    /\bwithdrawal\s+(?:successful|notification)\b/i.test(combined) ||
    /\batm\s+withdrawal\b/i.test(combined) ||
    /\bpos\s+(?:purchase|transaction|receipt|payment)\b/i.test(combined) ||
    /\bairtime\s+(?:purchase|recharge|top-up|topup)\b/i.test(combined) ||
    /\boutward\s+transfer\b/i.test(combined);

  if (isSubjectCredit && !isSubjectDebit) return "income";
  if (isSubjectDebit && !isSubjectCredit) return "expense";

  if (isBodyCredit && !isBodyDebit) return "income";
  if (isBodyDebit && !isBodyCredit) return "expense";

  if (/\b(?:credit|cr|received|salary|deposit|inflow|inward|refund)\b/i.test(normalizedSubject)) {
    return "income";
  }

  return "expense";
}

export function inferCategory(text: string, entryType: "income" | "expense", bank?: string): string {
  const normalized = normalizeText(text);

  if (/(cowrywise|piggyvest|piggybank|risevest|stanbic\s*mmf|mutual\s*fund|bamboo|trove|kuda\s*save|savebox|owealth|fairmoney\s*savings|savi|investik|branch\s*savings)/i.test(normalized)) return "Savings & Investments";

  if (entryType === "income") {
    if (/(salary|payroll|wages|stipend)/i.test(normalized)) return "Salary";
    if (/(refund|cashback|reversal)/i.test(normalized)) return "Refunds";
    if (/(dividend|interest|investment|yield)/i.test(normalized)) return "Investments";
    return "Income";
  }

  if (/(mtn|airtel|glo|9mobile|data|airtime|recharge|top-up|topup)/i.test(normalized)) return "Phone & Data";
  if (/(netflix|spotify|apple|amazon prime|subscription|dstv|gotv|showmax|youtube|audible|patreon)/i.test(normalized)) return "Subscriptions";
  if (/(uber|bolt|indrive|transport|flight|airline|ride|taxi|rail|bus|fuel|petrol|gas station)/i.test(normalized)) return "Transport & Fuel";
  if (/(food|restaurant|pizza|kfc|chicken republic|domino|eat|chow|sweet sensation|bukka|grill|cafe|dining|bistro)/i.test(normalized)) return "Food & Dining";
  if (/(shoprite|spar|supermarket|grocery|mall|store|market|hubmart|jumia|konga|boutique|retail)/i.test(normalized)) return "Shopping & Groceries";
  if (/(electricity|ikedc|ekedc|aedc|phed|eedc|water|waste|utility|utilities|bill|power)/i.test(normalized)) return "Utilities & Bills";
  if (/(hospital|pharmacy|drugs|health|clinic|medplus|healthplus|dental|optical|doctor|medical)/i.test(normalized)) return "Healthcare";
  if (/(demerge|technology|technologies|solutions|services|consulting|ventures|enterprise|ltd|limited|inc|corp|company|business)/i.test(normalized)) return "Business & Services";
  if (/(transfer|trf|sent|pos transfer|paid to|beneficiary|withdrawal)/i.test(normalized)) return "Transfer";

  return "General Expense";
}

/**
 * Multi-Factor Transaction Qualifier (Pillar 1).
 * Rejects non-transaction marketing, newsletters, and branch closures.
 */
export function isTransactionEmail(text: string, subject = "", from = ""): boolean {
  const normalizedFrom = (from || "").toLowerCase();
  const normalizedSubject = (subject || "").toLowerCase();
  const combined = `${normalizedSubject} ${text}`.toLowerCase();

  // 1. Non-financial sender blacklist
  if (
    /jobberman|linkedin|indeed|glassdoor|careers|recruitment|newsletter|no-reply@accounts\.google\.com|security-noreply@github\.com|accounts\.google\.com|no-reply@google\.com|security@|auth@|facebook|twitter|instagram|x\.com|tiktok/i.test(
      normalizedFrom
    )
  ) {
    if (!/\b(?:invoice|receipt|purchase|subscription\s+charged|payment\s+receipt)\b/i.test(normalizedSubject)) {
      return false;
    }
  }

  // 2. Strict Negative Blacklist for Announcements, Branch Closures, Newsletters
  if (EXCLUDED_MARKETING_KEYWORDS.some((kw) => normalizedSubject.includes(kw))) {
    return false;
  }

  if (
    /click here to unsubscribe from this newsletter|notice of branch closure|important update on the gtbank naira card|subscribe to the dangote ipo|blocking your card attracts a service fee of ₦5\.00/i.test(
      combined
    )
  ) {
    return false;
  }

  // 3. Positive Transaction Markers
  const hasSubjectTransactionPhrase =
    /\b(?:debit\s*alert|credit\s*alert|debit\s*notification|credit\s*notification|transfer\s*notification|transfer\s*alert|transfer\s*successful|withdrawal\s*successful|deposit\s*successful|payment\s*successful|transaction\s*notification|transaction\s*alert|account\s*debited|account\s*credited|pos\s*purchase|atm\s*withdrawal|airtime|receipt|zenith\s*direct)\b/i.test(
      normalizedSubject
    ) || /\[(?:credit|debit)[:\s]/i.test(subject);

  if (hasSubjectTransactionPhrase) {
    return true;
  }

  const hasBodyTransactionPhrase =
    /\b(?:debit\s*alert|credit\s*alert|debit\s*notification|credit\s*notification|transfer\s*successful|payment\s*successful|account\s*debited|account\s*credited|pos\s*purchase|atm\s*withdrawal|airtime\s*(?:top-up|topup|recharge)|transaction\s*advice|payment\s*advice|nip\s*transfer|nip\s*credit|nip\s*debit)\b/i.test(
      combined
    );

  if (hasBodyTransactionPhrase) {
    const hasAmount = /(?:amount|amt|trans amt|txn amount|sum|paid|debited|credited|ngn|₦|\$)\s*[:=]?\s*[\d,]+(?:\.\d{2})?/i.test(combined);
    if (hasAmount) return true;
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

  // Extract structured table KV pairs if present
  const kv = extractTableKeyValuePairs(emailBody);

  // Read amount from table if available, else extract from body
  let amount: number | null = null;
  for (const k of ["amount", "trans amount", "txn amount", "transfer amount", "sum", "value", "paid"]) {
    if (kv[k]) {
      const parsed = extractAmount(kv[k]);
      if (parsed && parsed > 0) {
        amount = parsed;
        break;
      }
    }
  }

  if (amount === null) {
    amount = extractAmount(text);
  }

  if (amount === null || amount < 10) return null;

  const entryType = inferEntryType(text, subject, from, kv);
  const bankInfo = detectBank(text, from, subject);

  let account_balance: number | undefined;
  for (const k of ["available balance", "book balance", "acct bal", "ledger balance", "ending balance", "balance"]) {
    if (kv[k]) {
      const parsed = extractAmount(kv[k]);
      if (parsed && parsed > 0) {
        account_balance = parsed;
        break;
      }
    }
  }
  if (!account_balance) {
    account_balance = extractBalance(text) ?? undefined;
  }

  const description = extractDescription(text, from, bankInfo?.label, kv);
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
