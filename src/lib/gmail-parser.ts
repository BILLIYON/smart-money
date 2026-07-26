export type ParsedFinancialEmail = {
  amount: number;
  description: string;
  entry_type: "income" | "expense";
  category: string;
};

const FINANCIAL_KEYWORDS = [
  "debit",
  "credit",
  "receipt",
  "payment",
  "transfer",
  "invoice",
  "charge",
  "alert",
  "salary",
  "purchase",
  "pos",
  "opay",
  "kuda",
  "palmpay",
  "moniepoint",
  "zenith",
  "gtbank",
  "access",
  "uba",
  "firstbank",
  "stanbic",
  "flutterwave",
  "paystack",
  "interswitch",
  "transaction",
];

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function extractAmount(text: string): number | null {
  const amountMatches = [
    text.match(/(?:NGN|₦|N|Amt|Amount|Debited|Credited|Paid|Sum|Value)[:\s]*([\d,]+\.?\d*)/i),
    text.match(/[$£€]([\d,]+\.?\d*)/i),
    text.match(/([\d,]+\.\d{2})/),
  ];

  for (const match of amountMatches) {
    if (match?.[1]) {
      const amountStr = match[1].replace(/,/g, "");
      const amount = parseFloat(amountStr);
      if (!Number.isNaN(amount) && amount > 0) {
        return Math.round(amount * 100);
      }
    }
  }

  return null;
}

function extractDescription(text: string, from: string): string {
  const descMatch = text.match(/(?:Desc|Description|Remarks|Narration|Merchant|To|From)[:\s]+([^,\.\n]+)/i);
  if (descMatch?.[1]?.trim()) {
    return descMatch[1].trim().slice(0, 40);
  }
  if (from) {
    return from.split("<")[0].replace(/"/g, "").trim().slice(0, 40);
  }
  return "Transaction";
}

function inferEntryType(text: string): "income" | "expense" {
  const normalized = normalizeText(text);

  const incomeIndicators = [
    "credit alert",
    "credited",
    "salary",
    "inflow",
    "received",
    "deposit",
    "cash in",
    "refund",
  ];

  const expenseIndicators = [
    "debit alert",
    "debit",
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
  ];

  if (incomeIndicators.some((indicator) => normalized.includes(indicator))) {
    return "income";
  }

  if (expenseIndicators.some((indicator) => normalized.includes(indicator))) {
    return "expense";
  }

  return "expense";
}

function inferCategory(text: string, entryType: "income" | "expense"): string {
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
  return "General Expense";
}

export function parseFinancialEmailData(emailBody: string, subject: string, from: string): ParsedFinancialEmail | null {
  const text = `${subject} ${emailBody}`.replace(/\s+/g, " ");
  const normalizedText = normalizeText(text);

  const isFinancial = FINANCIAL_KEYWORDS.some((keyword) => normalizedText.includes(keyword));
  if (!isFinancial) {
    return null;
  }

  const amount = extractAmount(text);
  if (!amount || amount <= 0) {
    return null;
  }

  const entryType = inferEntryType(text);
  return {
    amount,
    description: extractDescription(text, from),
    entry_type: entryType,
    category: inferCategory(text, entryType),
  };
}
