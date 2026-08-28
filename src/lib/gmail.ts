import { google } from "googleapis";
import { encrypt, decrypt } from "./crypto";
import { Pool } from "pg";
import { extractFinancialDataFromEmail, askAIWithEngine } from "./ai";

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
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
    label: "Default Broad Scan (All Bank Alerts)",
    query: `subject:(receipt OR payment OR transfer OR transaction OR alert OR notice OR advice OR purchase OR pos OR bank OR opay OR kuda OR palmpay OR moniepoint OR zenith OR gtbank OR access OR uba OR firstbank OR stanbic OR flutterwave OR paystack OR debit OR credit OR successful) OR "debit alert" OR "credit alert" OR "transaction alert" OR "transfer notification" OR "payment received"`,
    filter: ""
  },
  {
    id: "opay",
    label: "OPay alerts only",
    query: `opay (subject:(receipt OR payment OR transfer OR alert OR transaction OR debit OR credit) OR "opay alert")`,
    filter: "include:opay"
  },
  {
    id: "uba",
    label: "UBA bank alerts only",
    query: `uba (subject:(receipt OR payment OR transfer OR alert OR transaction OR debit OR credit) OR "uba alert")`,
    filter: "include:uba"
  },
  {
    id: "debits_credits",
    label: "Debits & Credits only",
    query: `"debit alert" OR "credit alert" OR "transaction alert"`,
    filter: ""
  }
];

// ── 1. Get an authenticated Gmail client for a user ──────────
export async function getGmailClient(userId: string) {
  const pool = getPool();
  let data: any = null;
  try {
    const { rows } = await pool.query(
      `SELECT access_token, refresh_token, token_expiry FROM user_integrations WHERE user_id = $1 AND provider = 'gmail' LIMIT 1;`,
      [userId]
    );
    data = rows[0];
  } finally {
    await pool.end();
  }

  if (!data) throw new Error("Gmail not connected for user");

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2.setCredentials({
    access_token: decrypt(data.access_token),
    refresh_token: decrypt(data.refresh_token),
    expiry_date: new Date(data.token_expiry).getTime(),
  });

  oauth2.on("tokens", async (newTokens) => {
    const poolInner = getPool();
    try {
      await poolInner.query(
        `UPDATE user_integrations SET access_token = $1, token_expiry = COALESCE($2, token_expiry) WHERE user_id = $3 AND provider = 'gmail';`,
        [
          encrypt(newTokens.access_token!),
          newTokens.expiry_date ? new Date(newTokens.expiry_date).toISOString() : null,
          userId,
        ]
      );
    } finally {
      await poolInner.end();
    }
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
  const from = headers.find((h) => h.name === "From")?.value ?? "";
  const date = headers.find((h) => h.name === "Date")?.value ?? "";

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

    let queries: string[] = [];
    if (presetFilter === "all" || !presetFilter) {
      queries = DEFAULT_PRESETS.map((p) => `${p.query} after:${lastSync}`);
    } else {
      const preset = DEFAULT_PRESETS.find((p) => p.id === presetFilter);
      if (preset) {
        queries = [`${preset.query} after:${lastSync}`];
      } else {
        queries = [`${DEFAULT_PRESETS[0].query} after:${lastSync}`];
      }
    }

    if (customQuery.trim()) {
      queries.push(`${customQuery.trim()} after:${lastSync}`);
    }

    const allIds = (
      await Promise.all(queries.map((q) => searchEmails(gmail, q, 500)))
    ).flat();

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

    const BATCH = 10;
    const entries: DataBankEntry[] = [];
    onProgress?.(0, 0);

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
      const emails = await Promise.all(batch.map((id) => getEmailBody(gmail, id)));

      // Parse emails in parallel via user-selected AI engine (default: Groq Llama)
      const extractedData = await Promise.all(
        emails.map(async (email) => {
          if (!email) return null;
          const cleanBody = stripHtml(email.body);
          const data = await extractFinancialDataFromEmail(
            cleanBody,
            email.subject,
            email.from,
            syncMode,
            aiPrompt,
            aiEngine,
            { enableFallback, fallbackEngine }
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
          };
          if (data.provider) metadataVal.provider = data.provider;
          if (data.bank) metadataVal.bank = data.bank;
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
        })
      );

      for (const entry of extractedData) {
        if (entry) entries.push(entry);
      }

      const progressPct = Math.min(99, Math.round(((i + batch.length) / uniqueIds.length) * 100));
      onProgress?.(progressPct, entries.length);

      // Update progress in DB metadata with fresh heartbeat timestamp
      await updateMeta({
        ...currentMeta,
        is_syncing: true,
        sync_progress: progressPct,
        sync_message: `Processed ${i + batch.length} of ${uniqueIds.length} emails...`,
        sync_updated_at: new Date().toISOString(),
      });

      if (i + BATCH < uniqueIds.length) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    if (saveToDb && entries.length > 0) {
      for (const entry of entries) {
        await pool.query(
          `INSERT INTO databank_entries (
            user_id, source, entry_type, amount, description, category, entry_date, metadata, gmail_message_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (gmail_message_id) DO UPDATE SET
            amount = EXCLUDED.amount,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
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
            entry.gmail_message_id || null,
          ]
        );
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
  } finally {
    await pool.end();
  }
}
