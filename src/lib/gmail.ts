import { google } from "googleapis";
import { encrypt, decrypt } from "./crypto";
import { Pool } from "pg";
import { extractFinancialDataFromEmail, askAIWithEngine } from "./ai";

let sharedPool: Pool | null = null;

function getPool() {
  if (!sharedPool) {
    sharedPool = new Pool({
      connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
    });
  }
  return sharedPool;
}

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

// Default sync presets for Gmail scanning
export const DEFAULT_PRESETS = [
  {
    id: "all",
    label: "Default Broad Scan (All Bank Alerts & Fintechs)",
    query: `("debit alert" OR "credit alert" OR "transaction alert" OR "transaction notification" OR "transfer notification" OR "payment received" OR "payment successful" OR "payment receipt" OR "transfer successful" OR "money sent" OR "money received" OR "you spent" OR "you received" OR "pos purchase" OR "atm withdrawal" OR "airtime recharge" OR "airtime top-up" OR "bill payment" OR "debit advice" OR "credit advice" OR subject:(receipt OR "debit alert" OR "credit alert" OR "transaction alert" OR "transfer notification" OR "payment receipt" OR "payment successful" OR opay OR kuda OR palmpay OR moniepoint OR zenith OR gtbank OR access OR uba OR firstbank OR stanbic OR fcmb OR sterling OR wema OR alat OR fidelity OR union OR providus OR flutterwave OR paystack) OR from:(accessbankplc.com OR gtbank.com OR firstbanknigeria.com OR zenithbank.com OR ubagroup.com OR kudabank.com OR opay-nigeria.com OR palmpay.com OR moniepoint.com OR stanbicibtc.com OR fcmb.com OR sterling.ng OR wemabank.com OR alat.ng OR fidelitybank.ng OR unionbankng.com OR providusbank.com OR flutterwavego.com OR paystack.com OR monnify.com)) -subject:("security alert" OR "login alert" OR "google account" OR "password reset" OR "verification code" OR "terms of service" OR "privacy policy" OR "shared some google account data" OR "need help" OR "opay support" OR "customer support" OR "customer care" OR "helpdesk" OR "support team")`,
    filter: ""
  },
  {
    id: "opay",
    label: "OPay alerts only",
    query: `(from:opay-nigeria.com OR opay) (subject:(receipt OR payment OR transfer OR alert OR transaction OR debit OR credit) OR "opay alert" OR "payment successful" OR "transfer successful") -subject:("security alert" OR "google account" OR "need help" OR "support")`,
    filter: "include:opay"
  },
  {
    id: "uba",
    label: "UBA bank alerts only",
    query: `(from:ubagroup.com OR uba) (subject:(receipt OR payment OR transfer OR alert OR transaction OR debit OR credit) OR "uba alert") -subject:("security alert" OR "google account" OR "raining credit")`,
    filter: "include:uba"
  },
  {
    id: "debits_credits",
    label: "Debits & Credits only",
    query: `"debit alert" OR "credit alert" OR "transaction alert" OR "transaction notification" OR "transfer notification" OR "account debited" OR "account credited"`,
    filter: ""
  }
];

// ── 1. Get an authenticated Gmail client for a user ──────────
export async function getGmailClient(userId: string) {
  const pool = getPool();
  let data: any = null;
  const { rows } = await pool.query(
    `SELECT access_token, refresh_token, token_expiry FROM user_integrations WHERE user_id = $1 AND provider = 'gmail' LIMIT 1;`,
    [userId]
  );
  data = rows[0];

  if (!data) throw new Error("Gmail not connected for user");

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2.setCredentials({
    access_token: data.access_token ? decrypt(data.access_token) : undefined,
    refresh_token: (data.refresh_token && data.refresh_token.trim()) ? decrypt(data.refresh_token) : undefined,
    expiry_date: data.token_expiry ? new Date(data.token_expiry).getTime() : undefined,
  });

  oauth2.on("tokens", async (newTokens) => {
    const poolInner = getPool();
    try {
      if (newTokens.refresh_token && newTokens.refresh_token.trim()) {
        await poolInner.query(
          `UPDATE user_integrations SET access_token = $1, refresh_token = $2, token_expiry = COALESCE($3, token_expiry) WHERE user_id = $4 AND provider = 'gmail';`,
          [
            encrypt(newTokens.access_token!),
            encrypt(newTokens.refresh_token.trim()),
            newTokens.expiry_date ? new Date(newTokens.expiry_date).toISOString() : null,
            userId,
          ]
        );
      } else {
        await poolInner.query(
          `UPDATE user_integrations SET access_token = $1, token_expiry = COALESCE($2, token_expiry) WHERE user_id = $3 AND provider = 'gmail';`,
          [
            encrypt(newTokens.access_token!),
            newTokens.expiry_date ? new Date(newTokens.expiry_date).toISOString() : null,
            userId,
          ]
        );
      }
    } catch (err) {
      console.error("[getGmailClient] Token refresh error:", err);
    }
  });

  return google.gmail({ version: "v1", auth: oauth2 });
}

// ── 2. Search Gmail with a query, return message IDs with pagination ─────────
export async function searchEmails(
  gmail: Awaited<ReturnType<typeof getGmailClient>>,
  query: string,
  maxResults = 1000
): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined = undefined;

  try {
    do {
      const res: any = await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: Math.min(500, maxResults - ids.length),
        pageToken,
      });

      const msgs = res.data.messages ?? [];
      for (const m of msgs) {
        if (m.id && !ids.includes(m.id)) {
          ids.push(m.id);
        }
      }

      pageToken = res.data.nextPageToken || undefined;
    } while (pageToken && ids.length < maxResults);

    return ids;
  } catch (err: any) {
    console.warn(`[searchEmails] Query failed ("${query.slice(0, 60)}..."):`, err?.message || err);
    if (query.includes("OR") || query.includes("subject:") || query.includes("from:")) {
      try {
        const afterMatch = query.match(/after:\d+/);
        const afterClause = afterMatch ? ` ${afterMatch[0]}` : "";
        const fallbackQuery = `"debit alert" OR "credit alert" OR "transaction alert" OR "payment received" OR "transfer notification" OR "payment successful"${afterClause}`;
        console.log(`[searchEmails] Attempting simplified fallback query: ${fallbackQuery}`);
        
        let fbPageToken: string | undefined = undefined;
        do {
          const res: any = await gmail.users.messages.list({
            userId: "me",
            q: fallbackQuery,
            maxResults: Math.min(500, maxResults - ids.length),
            pageToken: fbPageToken,
          });
          const msgs = res.data.messages ?? [];
          for (const m of msgs) {
            if (m.id && !ids.includes(m.id)) {
              ids.push(m.id);
            }
          }
          fbPageToken = res.data.nextPageToken || undefined;
        } while (fbPageToken && ids.length < maxResults);

        return ids;
      } catch (fbErr: any) {
        console.warn("[searchEmails] Fallback query also failed:", fbErr?.message || fbErr);
      }
    }
    return ids;
  }
}

// ── 3. Get full email content from a message ID ───────────────
export async function getEmailBody(
  gmail: Awaited<ReturnType<typeof getGmailClient>>,
  messageId: string
) {
  let res: any;
  let attempts = 0;
  while (attempts < 3) {
    try {
      res = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });
      break;
    } catch (err: any) {
      attempts++;
      const isRateLimit = err?.status === 429 || err?.code === 429 || /quota|rate limit|too many requests/i.test(err?.message || "");
      if (isRateLimit && attempts < 3) {
        console.warn(`[getEmailBody] Quota limit hit for message ${messageId}, retrying attempt ${attempts}/3 after backoff...`);
        await new Promise((r) => setTimeout(r, attempts * 1500));
      } else {
        throw err;
      }
    }
  }

  const headers = res.data.payload?.headers ?? [];
  const subject = headers.find((h: any) => h.name === "Subject")?.value ?? "";
  const from = headers.find((h: any) => h.name === "From")?.value ?? "";
  const date = headers.find((h: any) => h.name === "Date")?.value ?? "";

  // Extract body text — prefer plain text, fall back to HTML (most bank alerts are HTML-only)
  function decodePart(data?: string | null): string {
    if (!data) return "";
    return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  }

  function extractText(payload: typeof res.data.payload): { plain: string; html: string } {
    let plain = "";
    let html = "";

    function walk(part: typeof payload) {
      if (!part) return;
      if (part.mimeType === "text/plain" && part.body?.data) {
        plain += (plain ? " " : "") + decodePart(part.body.data);
      } else if (part.mimeType === "text/html" && part.body?.data) {
        html += (html ? " " : "") + decodePart(part.body.data);
      }
      if (part.parts) {
        for (const child of part.parts) walk(child);
      }
    }

    walk(payload);
    // Some messages put body data on the root payload without mimeType parts
    if (!plain && !html && payload?.body?.data) {
      const raw = decodePart(payload.body.data);
      if (payload.mimeType === "text/html" || /<html|<body|<div/i.test(raw)) {
        html = raw;
      } else {
        plain = raw;
      }
    }
    return { plain, html };
  }

  const { plain, html } = extractText(res.data.payload);
  const body = plain.trim() ? plain : html;
  return { messageId, subject, from, date, body };
}

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, " ")
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|td|th)>/gi, " \n ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&naira;|&#8358;|&#x20a6;/gi, "₦")
    .replace(/&#(\d+);/g, (_, code) => {
      try {
        return String.fromCharCode(Number(code));
      } catch {
        return " ";
      }
    })
    .replace(/\s+/g, " ")
    .trim();
}

function cleanQueryForGmail(query: string): string {
  const includes: string[] = [];
  const excludes: string[] = [];
  
  const terms = query.match(/"[^"]+"|[^\s,]+/g) || [];
  const negWords = ["ignore", "exclude", "omit", "without", "except", "dont", "don't", "no", "stop"];
  
  let skipNext = false;
  for (let i = 0; i < terms.length; i++) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    const current = terms[i].trim();
    if (!current) continue;
    
    const lower = current.toLowerCase();
    
    if (current.startsWith("-")) {
      excludes.push(current);
    } else if (negWords.includes(lower)) {
      if (i + 1 < terms.length) {
        let val = terms[i + 1].trim();
        if ((val.toLowerCase() === "include" || val.toLowerCase() === "including") && i + 2 < terms.length) {
          val = terms[i + 2].trim();
          skipNext = true;
        }
        if (val) {
          if (val.startsWith('"') && val.endsWith('"')) {
            excludes.push(`-${val}`);
          } else {
            excludes.push(`-${val.replace(/["()]/g, "")}`);
          }
        }
        skipNext = true;
      }
    } else {
      if (lower !== "or" && lower !== "and") {
        includes.push(current);
      } else {
        includes.push(current.toUpperCase());
      }
    }
  }
  
  return [...includes, ...excludes].join(" ");
}

function parseQueryToFilter(query: string): string {
  if (!query || !query.trim()) return "";
  
  // If query contains complex Gmail syntax like subject:(...) or OR clauses, don't generate include filters from every term
  const hasComplexSyntax = /\bOR\b|subject:|\(|"/i.test(query);

  const includes: string[] = [];
  const excludes: string[] = [];
  
  const terms = query.match(/"[^"]+"|[^\s,]+/g) || [];
  const negWords = ["ignore", "exclude", "omit", "without", "except", "dont", "don't", "no", "stop"];
  
  let skipNext = false;
  for (let i = 0; i < terms.length; i++) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    const current = terms[i].trim();
    if (!current) continue;
    
    const lower = current.toLowerCase();
    
    if (current.startsWith("-")) {
      const val = current.substring(1).replace(/["()]/g, "").trim().toLowerCase();
      if (val && val !== "or" && val !== "and") {
        excludes.push(val);
      }
    } else if (negWords.includes(lower)) {
      if (i + 1 < terms.length) {
        let val = terms[i + 1].replace(/["()]/g, "").trim().toLowerCase();
        if ((val === "include" || val === "including") && i + 2 < terms.length) {
          val = terms[i + 2].replace(/["()]/g, "").trim().toLowerCase();
          skipNext = true;
        }
        if (val) {
          excludes.push(val);
        }
        skipNext = true;
      }
    } else if (!hasComplexSyntax) {
      const val = current.replace(/["()]/g, "").trim().toLowerCase();
      if (val && val !== "or" && val !== "and" && !val.includes("subject:") && !val.includes("from:") && !val.includes("to:") && !val.includes("label:") && !val.includes("has:")) {
        includes.push(val);
      }
    }
  }
  
  return [
    ...includes.map(i => `include:${i}`),
    ...excludes.map(e => `exclude:${e}`)
  ].join(",");
}

async function translateNaturalLanguageQuery(query: string, engine = "groq"): Promise<{ query: string; filter: string }> {
  const isSimple = !/\b(please|dont|don't|not|include|exclude|ignore|except|only|subject|from|to|label|has|or|and|message|email|transaction|do)\b/i.test(query) && query.length < 30;
  if (isSimple) {
    return {
      query: query,
      filter: parseQueryToFilter(query)
    };
  }

  const prompt = `You are a query translation agent. Convert a user's natural language filter instruction into a clean Gmail search query and local filter rules.
User instruction: "${query}"

Return a JSON object exactly matching this structure (do not output any markdown or commentary):
{
  "gmail_query": "<optimized Gmail search query string using standard terms and negation operators like -term. Do not include conversational words. Use subject: or from: if applicable, otherwise keep it general, e.g. 'opay -paystack'>",
  "filter_rules": "<comma-separated list of include:X or exclude:Y instructions for post-extraction filtering, e.g. 'include:opay,exclude:paystack'>"
}

Example:
Input: "only kuda bank and no uba alerts"
Output:
{
  "gmail_query": "kuda -uba",
  "filter_rules": "include:kuda,exclude:uba"
}

Example:
Input: "do not include paystack or any other transaction except from opay please use opay only"
Output:
{
  "gmail_query": "opay -paystack",
  "filter_rules": "include:opay,exclude:paystack"
}`;

  try {
    const raw = await askAIWithEngine(prompt, engine);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.gmail_query) {
        return {
          query: String(parsed.gmail_query).trim(),
          filter: String(parsed.filter_rules || "").trim()
        };
      }
    }
  } catch (e) {
    console.error("[translateNaturalLanguageQuery] AI translation failed, fallback to local:", e);
  }

  return {
    query: cleanQueryForGmail(query),
    filter: parseQueryToFilter(query)
  };
}

export async function syncGmailForUser(
  userId: string,
  force90Days = true,
  onProgress?: (progress: number, syncedCount: number) => void,
  saveToDb = true
) {
  const gmail = await getGmailClient(userId);
  const pool = getPool();

  const updateMeta = async (newMeta: Record<string, any>, updateLastSynced = false) => {
    await pool.query(
      `UPDATE user_integrations SET metadata = $1 ${updateLastSynced ? ", last_synced_at = NOW()" : ""} WHERE user_id = $2 AND provider = 'gmail';`,
      [JSON.stringify(newMeta), userId]
    );
  };

  let metadata: Record<string, any> = {};

  try {
    const { rows: intRows } = await pool.query(
      `SELECT last_synced_at, metadata FROM user_integrations WHERE user_id = $1 AND provider = 'gmail' LIMIT 1;`,
      [userId]
    );
    const integration = intRows[0];

    const ninetyDaysAgo = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000);
    let lastSync = ninetyDaysAgo;

    if (!force90Days && integration?.last_synced_at) {
      lastSync = Math.floor(new Date(integration.last_synced_at).getTime() / 1000);
    }

    const formatDateForGmail = (sec: number) => {
      const d = new Date(sec * 1000);
      return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`;
    };
    const dateQueryStr = formatDateForGmail(lastSync);

    metadata = (integration?.metadata as any) || {};
    const syncMode = (metadata.sync_mode as "lightweight" | "deep") || "lightweight";
    const presetFilter = metadata.preset_filter || "all";
    const customQuery = metadata.custom_query || "";
    const aiPrompt = metadata.ai_prompt || "";
    const aiEngine = metadata.ai_engine || "groq";
    const enableFallback = metadata.enable_fallback !== undefined ? Boolean(metadata.enable_fallback) : true;
    const fallbackEngine = metadata.fallback_engine || "groq";

    await updateMeta({
      ...metadata,
      is_syncing: true,
      should_stop_sync: false,
      sync_progress: 0,
      sync_message: "Searching Gmail inbox...",
      sync_updated_at: new Date().toISOString(),
    });

    const activePresets: Array<{ id: string; query: string }> =
      Array.isArray(metadata.presets) && metadata.presets.length > 0
        ? metadata.presets
        : DEFAULT_PRESETS;

    let queries: string[] = [];
    if (presetFilter === "all" || !presetFilter) {
      queries = activePresets.map((p) => `${p.query} after:${dateQueryStr}`);
    } else {
      const preset = activePresets.find((p) => p.id === presetFilter) || DEFAULT_PRESETS.find((p) => p.id === presetFilter);
      if (preset) {
        queries = [`${preset.query} after:${dateQueryStr}`];
      } else {
        queries = [`${activePresets[0]?.query || DEFAULT_PRESETS[0].query} after:${dateQueryStr}`];
      }
    }

    if (customQuery.trim()) {
      queries.push(`${customQuery.trim()} after:${dateQueryStr}`);
    }

    onProgress?.(5, 0);

    const searchResults = await Promise.allSettled(
      queries.map((q) => searchEmails(gmail, q, 500))
    );

    const allIds = searchResults
      .filter((r): r is PromiseFulfilledResult<string[]> => r.status === "fulfilled")
      .flatMap((r) => r.value);

    const uniqueIds = [...new Set(allIds)];

    if (uniqueIds.length === 0) {
      onProgress?.(100, 0);
      await updateMeta(
        {
          ...metadata,
          is_syncing: false,
          sync_progress: 100,
          sync_message: "No new transactions found",
          sync_updated_at: new Date().toISOString(),
        },
        true
      );
      return { synced: 0 };
    }

function withTimeout<T>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallbackValue), ms)),
  ]);
}

    const BATCH = 3;
    const entries: DataBankEntry[] = [];
    onProgress?.(12, 0);

    for (let i = 0; i < uniqueIds.length; i += BATCH) {
      const { rows: checkRows } = await pool.query(
        `SELECT metadata FROM user_integrations WHERE user_id = $1 AND provider = 'gmail' LIMIT 1;`,
        [userId]
      );
      const currentMeta = (checkRows[0]?.metadata as any) || {};

      if (currentMeta.should_stop_sync) {
        await updateMeta({
          ...currentMeta,
          is_syncing: false,
          should_stop_sync: false,
          sync_progress: null,
          sync_message: "Sync stopped by user",
          sync_updated_at: new Date().toISOString(),
        });
        return entries;
      }

      const batch = uniqueIds.slice(i, i + BATCH);
      // 1.2s throttle between batches guarantees Gmail API quota limits are preserved
      await new Promise((r) => setTimeout(r, 1200));

      const emails = await Promise.all(
        batch.map((id) =>
          withTimeout(
            getEmailBody(gmail, id).catch((err) => {
              console.warn(`[syncGmailForUser] Failed to fetch email ${id}:`, err?.message || err);
              return null;
            }),
            15000,
            null
          )
        )
      );

      // Parse emails in parallel via user-selected AI engine (default: Groq Llama)
      const extractedData = await Promise.all(
        emails.map(async (email) => {
          if (!email) return null;
          try {
            const cleanBody = stripHtml(email.body);
            const data = await withTimeout(
              extractFinancialDataFromEmail(
                cleanBody,
                email.subject,
                email.from,
                syncMode,
                aiPrompt,
                aiEngine,
                { enableFallback, fallbackEngine }
              ),
              15000,
              null
            );
            if (!data) return null;

            let entryDate = new Date().toISOString().split("T")[0];
            if (email.date) {
              const parsed = new Date(email.date);
              if (!Number.isNaN(parsed.getTime())) {
                entryDate = parsed.toISOString().split("T")[0];
              }
            }

            const metadataVal: Record<string, unknown> = {
              email_from: email.from,
              email_subject: email.subject,
              email_date: email.date,
              email_body_snippet: cleanBody.slice(0, 1500),
            };
            if (data.provider) metadataVal.provider = data.provider;
            if (data.bank) metadataVal.bank = data.bank;
            if (data.reason) metadataVal.reason = data.reason;
            if (data.transaction_time) metadataVal.transaction_time = data.transaction_time;
            if (typeof data.account_balance === "number" && data.account_balance > 0) {
              metadataVal.account_balance = Math.round(data.account_balance * 100);
            }

            return {
              source: "gmail",
              entry_type: data.entry_type,
              amount: Math.round(data.amount * 100),
              description: data.description,
              category: data.category,
              entry_date: entryDate,
              metadata: metadataVal,
              user_id: userId,
              gmail_message_id: email.messageId,
            } as DataBankEntry;
          } catch (err: any) {
            console.warn(`[syncGmailForUser] Extraction error for email ${email.messageId}:`, err?.message || err);
            return null;
          }
        })
      );

      const batchEntries: DataBankEntry[] = [];
      for (const entry of extractedData) {
        if (entry) {
          entries.push(entry);
          batchEntries.push(entry);
        }
      }

      if (saveToDb && batchEntries.length > 0) {
        await pool.query(
          `CREATE UNIQUE INDEX IF NOT EXISTS databank_entries_gmail_message_id_key ON public.databank_entries (gmail_message_id);`
        ).catch(() => {});

        for (const entry of batchEntries) {
          const gmailMsgId =
            entry.gmail_message_id &&
            typeof entry.gmail_message_id === "string" &&
            entry.gmail_message_id.trim()
              ? entry.gmail_message_id.trim()
              : null;

          await pool.query(
            `INSERT INTO databank_entries (
              user_id, source, entry_type, amount, description, category, entry_date, metadata, gmail_message_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (gmail_message_id) WHERE gmail_message_id IS NOT NULL DO UPDATE SET
              entry_type = EXCLUDED.entry_type,
              amount = EXCLUDED.amount,
              description = COALESCE(NULLIF(databank_entries.description, ''), EXCLUDED.description),
              category = CASE
                WHEN databank_entries.category IS NOT NULL AND databank_entries.category NOT IN ('', 'Uncategorized', 'General Expense')
                THEN databank_entries.category
                ELSE EXCLUDED.category
              END,
              entry_date = EXCLUDED.entry_date,
              metadata = EXCLUDED.metadata;`,
            [
              userId,
              entry.source,
              entry.entry_type,
              entry.amount,
              entry.description,
              entry.category,
              entry.entry_date,
              JSON.stringify(entry.metadata),
              gmailMsgId,
            ]
          );
        }
      }

      const progressPct = Math.min(
        95,
        Math.round(15 + ((i + batch.length) / uniqueIds.length) * 80)
      );
      onProgress?.(progressPct, entries.length);

      // Update progress & last_synced_at in DB metadata with fresh heartbeat timestamp
      await updateMeta(
        {
          ...currentMeta,
          is_syncing: true,
          sync_progress: progressPct,
          sync_message: `Processed ${Math.min(i + batch.length, uniqueIds.length)} of ${uniqueIds.length} emails (${entries.length} transactions)...`,
          sync_updated_at: new Date().toISOString(),
        },
        saveToDb && batchEntries.length > 0
      );

      if (i + BATCH < uniqueIds.length) {
        await new Promise((r) => setTimeout(r, 250));
      }
    }

    await updateMeta(
      {
        ...metadata,
        is_syncing: false,
        sync_progress: 100,
        sync_message: saveToDb
          ? `Synced ${entries.length} new transactions`
          : `Found ${entries.length} new transactions for review`,
        sync_updated_at: new Date().toISOString(),
      },
      saveToDb
    );

    onProgress?.(100, entries.length);
    return entries;
  } catch (err: any) {
    await updateMeta({
      ...metadata,
      is_syncing: false,
      sync_progress: null,
      sync_message: err.message || "Sync failed",
      sync_updated_at: new Date().toISOString(),
    });
    throw err;
  }
}
