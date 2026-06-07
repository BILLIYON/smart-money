import { google } from "googleapis";
import { encrypt, decrypt } from "./crypto";
import { createServiceClient } from "./supabase/service";

type DataBankEntry = {
  user_id?: string;
  source: string;
  entry_type: "income" | "expense" | "subscription" | "asset" | "debt";
  amount: number;       // stored in cents
  description: string;
  category: string;
  entry_date: string;
  metadata: Record<string, unknown>;
  gmail_message_id?: string;
};

// ── 1. Get an authenticated Gmail client for a user ──────────
export async function getGmailClient(userId: string) {
  const supabase = createServiceClient(); // service role, bypasses RLS
  const { data } = await supabase
    .from("user_integrations")
    .select("access_token, refresh_token, token_expiry")
    .eq("user_id", userId)
    .eq("provider", "gmail")
    .single();

  if (!data) throw new Error("Gmail not connected for user");

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2.setCredentials({
    access_token:  decrypt(data.access_token),
    refresh_token: decrypt(data.refresh_token),
    expiry_date:   new Date(data.token_expiry).getTime(),
  });

  // Auto-refresh: when token expires, oauth2 client refreshes
  // and fires "tokens" event — save the new access token
  oauth2.on("tokens", async (newTokens) => {
    await supabase
      .from("user_integrations")
      .update({
        access_token: encrypt(newTokens.access_token!),
        token_expiry: new Date(newTokens.expiry_date!).toISOString(),
      })
      .eq("user_id", userId)
      .eq("provider", "gmail");
  });

  return google.gmail({ version: "v1", auth: oauth2 });
}

// ── 2. Search Gmail with a query, return message IDs ─────────
export async function searchEmails(
  gmail: Awaited<ReturnType<typeof getGmailClient>>,
  query: string,
  maxResults = 50
): Promise<string[]> {
  const res = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults,
  });
  return (res.data.messages ?? []).map((m) => m.id as string);
}

// ── 3. Get full email content from a message ID ───────────────
export async function getEmailBody(
  gmail: Awaited<ReturnType<typeof getGmailClient>>,
  messageId: string
) {
  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const headers = res.data.payload?.headers ?? [];
  const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
  const from    = headers.find((h) => h.name === "From")?.value ?? "";
  const date    = headers.find((h) => h.name === "Date")?.value ?? "";

  // Extract plain text body (handle multipart)
  function extractText(payload: typeof res.data.payload): string {
    if (payload?.mimeType === "text/plain" && payload.body?.data) {
      return Buffer.from(payload.body.data, "base64").toString("utf8");
    }
    if (payload?.parts) {
      return payload.parts.map(extractText).join(" ");
    }
    return "";
  }

  const body = extractText(res.data.payload);
  return { messageId, subject, from, date, body };
}

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, " ")
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// ── 4. Parse a financial email into a DataBank entry ─────────
// Uses regex patterns tuned for US bank alert formats
export function parseFinancialEmail(email: {
  subject: string;
  from: string;
  date: string;
  body: string;
}): DataBankEntry | null {
  const cleanBody = stripHtml(email.body);
  const text = (email.subject + " " + cleanBody).toLowerCase();
  const raw  =  email.subject + " " + cleanBody;

  // ── Amount extraction ──
  // Matches: $450,000.00 | USD 450,000 | 450,000.00 USD | ₦1,000.00 | 1,000.00 Naira
  const amountPattern =
    /(?:\$|USD|₦|NGN)[\s]*([\d,]+(?:\.\d{2})?)|([\d,]+(?:\.\d{2})?)[\s]*(?:USD|dollars?|naira|ngn)/gi;
  const matches = [...raw.matchAll(amountPattern)];
  let amount = 0;
  for (const match of matches) {
    const val = parseFloat((match[1] || match[2]).replace(/,/g, ""));
    if (isNaN(val) || val <= 0) continue;
    
    // Check if it is likely a balance amount (preceded by 'balance' or 'avail')
    const matchIndex = match.index || 0;
    const context = raw.substring(Math.max(0, matchIndex - 25), matchIndex).toLowerCase();
    if (/balance|avail|bal/i.test(context)) {
      if (amount === 0) amount = val; // fallback if no other amount is found
      continue;
    }
    amount = val;
    break;
  }

  // ── Entry type detection ──
  const isCredit = /\b(?:credit|received|deposit|direct deposit|salary|payment received|payout)\b/i.test(text);
  const isDebit  = /\b(?:debit|withdrawal|transfer|purchase|payment made|charged|payment completed)\b/i.test(text);
  const isSubs   = /\b(?:subscription|renewal|recurring|monthly plan)\b/i.test(text);

  if (!isCredit && !isDebit && !isSubs) return null; // not financial
  if (amount === 0) return null;                      // could not parse amount

  let entry_type: "income" | "expense" = "expense";
  if (isCredit && !isDebit) {
    entry_type = "income";
  } else if (isDebit && !isCredit) {
    entry_type = "expense";
  } else if (isCredit && isDebit) {
    // Conflict resolution (e.g. "deposit" matched in footer of transfer email)
    if (/transfer|debit|payment|charge/i.test(email.subject)) {
      entry_type = "expense";
    } else if (/received|deposit|credit/i.test(email.subject)) {
      entry_type = "income";
    } else {
      entry_type = "expense";
    }
  }

  // ── Merchant / description extraction ──
  let description = email.subject;
  // Try to extract merchant from "at MERCHANT NAME" or "to MERCHANT"
  const merchantMatch = raw.match(
    /(?:at|to|from|merchant):\s*([A-Z][A-Za-z0-9\s&'.,-]{2,40})/i
  );
  if (merchantMatch) description = merchantMatch[1].trim();

  // ── Category inference ──
  const category = isSubs
    ? "Subscriptions"
    : /salary|payroll|pay ?day|direct deposit/i.test(text)
    ? "Salary"
    : /electric|gas|water|utility|con ?ed|pg&?e|utility/i.test(text)
    ? "Utilities"
    : /\b(?:phone bill|wireless bill|at&?t|verizon|t-mobile|sprint|recharge|airtime|data bundle|internet bill)\b/i.test(text)
    ? "Phone & Data"
    : /restaurant|food|grubhub|doordash|uber eat|starbucks|mcdonald/i.test(text)
    ? "Food & Dining"
    : /uber|lyft|transit|parking|transport/i.test(text)
    ? "Transport"
    : /amazon|walmart|target|shopping|order|jumia|aliexpress/i.test(text)
    ? "Shopping"
    : entry_type === "income"
    ? "Income"
    : "General Expense";

  return {
    source:     "gmail",
    entry_type,
    amount:     Math.round(amount * 100), // store in cents / kobo
    description,
    category,
    entry_date: new Date(email.date).toISOString().split("T")[0],
    metadata: {
      email_from:          email.from,
      email_subject:       email.subject,
      raw_amount_string:   amount.toString(),
    },
  };
}

// ── 5. Full sync for one user ─────────────────────────────────
export async function syncGmailForUser(userId: string) {
  const gmail    = await getGmailClient(userId);
  const supabase = createServiceClient();

  // Get the last sync time so we only fetch new emails
  const { data: integration } = await supabase
    .from("user_integrations")
    .select("last_synced_at")
    .eq("user_id", userId)
    .eq("provider", "gmail")
    .single();

  // Query if the user has any entries stored from gmail
  const { count } = await supabase
    .from("databank_entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("source", "gmail");

  // Build time filter — only emails since last sync, unless they have 0 entries (then backfill last 90 days)
  // Gmail uses Unix timestamp in query: after:1704067200
  const lastSync = (integration?.last_synced_at && count && count > 0)
    ? Math.floor(new Date(integration.last_synced_at).getTime() / 1000)
    : Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 90; // last 90 days

  const afterFilter = `after:${lastSync}`;

  // All queries run in parallel for speed
  const queries = [
    `from:(chase.com OR bankofamerica.com OR wellsfargo.com OR citibank.com OR usbank.com) ${afterFilter}`,
    `from:(receipts@paypal.com OR noreply@venmo.com OR stripe.com) ${afterFilter}`,
    `from:(fidelity.com OR schwab.com OR robinhood.com OR coinbase.com) ${afterFilter}`,
    `subject:(receipt OR "payment confirmation" OR invoice) -from:me ${afterFilter}`,
    `subject:(salary OR payroll OR "monthly pay" OR "direct deposit") ${afterFilter}`,
    `subject:("subscription renewed" OR renewal OR "recurring payment") ${afterFilter}`,
    `subject:(electricity OR "internet bill" OR "phone bill" OR "water bill") ${afterFilter}`,
    `from:(opay-nigeria.com OR opayweb.com OR paystack.com OR flutterwave.com OR flutterwavego.com OR fcmb.com OR gtbank.com OR accessbankplc.com OR zenithbank.com OR ubagroup.com OR stanbicibtc.com OR firstbanknigeria.com) ${afterFilter}`,
    `subject:("transfer successful" OR "payment completed" OR payout OR "credit alert" OR "debit alert") ${afterFilter}`,
  ];

  // Search all queries in parallel
  const allIds = (
    await Promise.all(queries.map((q) => searchEmails(gmail, q, 100)))
  ).flat();

  // Deduplicate message IDs
  const uniqueIds = [...new Set(allIds)];

  // Fetch and parse each email
  // Batch to avoid Gmail API rate limits (250 quota units/user/second)
  const BATCH = 10;
  const entries: DataBankEntry[] = [];

  for (let i = 0; i < uniqueIds.length; i += BATCH) {
    const batch  = uniqueIds.slice(i, i + BATCH);
    const emails = await Promise.all(batch.map((id) => getEmailBody(gmail, id)));

    for (const email of emails) {
      const entry = parseFinancialEmail(email);
      if (entry) entries.push({ ...entry, user_id: userId, gmail_message_id: email.messageId });
    }

    // Small delay between batches to respect rate limits
    if (i + BATCH < uniqueIds.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  // Upsert entries utilizing gmail_message_id unique index
  if (entries.length > 0) {
    const { error: upsertError } = await supabase.from("databank_entries").upsert(entries, {
      onConflict:       "gmail_message_id",
      ignoreDuplicates: true,
    });
    if (upsertError) {
      console.error("[gmail] Database upsert failed:", upsertError.message);
      throw new Error(`Database upsert failed: ${upsertError.message}`);
    }
  }

  // Update last sync time
  await supabase
    .from("user_integrations")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("provider", "gmail");

  return { synced: entries.length };
}
