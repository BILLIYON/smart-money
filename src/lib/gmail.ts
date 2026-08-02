import { google } from "googleapis";
import { encrypt, decrypt } from "./crypto";
import { createServiceClient } from "./supabase/service";
import { extractFinancialDataFromEmail } from "./ai";

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
    access_token: decrypt(data.access_token),
    refresh_token: decrypt(data.refresh_token),
    expiry_date: new Date(data.token_expiry).getTime(),
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
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
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



// ── 5. Full sync for one user ─────────────────────────────────
export async function syncGmailForUser(
  userId: string,
  force90Days = true,
  onProgress?: (progress: number, syncedCount: number) => void
) {
  const gmail = await getGmailClient(userId);
  const supabase = createServiceClient();

  // Load last synced date and metadata preferences
  const { data: integration } = await supabase
    .from("user_integrations")
    .select("last_synced_at, metadata")
    .eq("user_id", userId)
    .eq("provider", "gmail")
    .single();

  // Always backfill full 3 months (90 days) by default so user gets all their transaction history!
  const ninetyDaysAgo = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000);
  let lastSync = ninetyDaysAgo;

  if (!force90Days && integration?.last_synced_at) {
    lastSync = Math.floor(new Date(integration.last_synced_at).getTime() / 1000);
  }

  const metadata = integration?.metadata as any || {};
  const syncMode = (metadata.sync_mode as "lightweight" | "deep") || "lightweight";
  const presetFilter = metadata.preset_filter || "all";
  const customQuery = metadata.custom_query || "";
  const aiPrompt = metadata.ai_prompt || "";

  try {
    // 1. Mark as syncing
    await supabase
      .from("user_integrations")
      .update({
        metadata: {
          ...metadata,
          is_syncing: true,
          sync_progress: 0,
          sync_message: "Searching Gmail inbox..."
        }
      })
      .eq("user_id", userId)
      .eq("provider", "gmail");

    // Load presets from metadata or defaults
    const presets = (metadata.presets || DEFAULT_PRESETS) as Array<{ id: string; label: string; query: string; filter: string }>;
    const activePreset = presets.find((p) => p.id === presetFilter) || presets.find((p) => p.id === "all") || presets[0];

    const queryTerms = activePreset ? activePreset.query : DEFAULT_PRESETS[0].query;
    const filterRules = activePreset ? activePreset.filter : "";

    const lastSyncDate = new Date(lastSync * 1000).toISOString().split("T")[0];
    const queries = [
      `after:${lastSyncDate} (${queryTerms})`
    ];

    // Search all queries with maxResults=500 to fetch full 3 months of bank emails
    const allIds = (
      await Promise.all(queries.map((q) => searchEmails(gmail, q, 500)))
    ).flat();

    // Deduplicate message IDs
    const uniqueIds = [...new Set(allIds)];

    if (uniqueIds.length === 0) {
      onProgress?.(100, 0);
      // Update last sync time
      await supabase
        .from("user_integrations")
        .update({
          last_synced_at: new Date().toISOString(),
          metadata: {
            ...metadata,
            is_syncing: false,
            sync_progress: 100,
            sync_message: "No new transactions found"
          }
        })
        .eq("user_id", userId)
        .eq("provider", "gmail");
      return { synced: 0 };
    }

    // Fetch and parse each email
    // Batch to avoid Gmail API rate limits (250 quota units/user/second)
    const BATCH = 10;
    const entries: DataBankEntry[] = [];

    onProgress?.(0, 0);

    for (let i = 0; i < uniqueIds.length; i += BATCH) {
      // Check if sync was cancelled/stopped by the user
      const { data: currentIntegration } = await supabase
        .from("user_integrations")
        .select("metadata")
        .eq("user_id", userId)
        .eq("provider", "gmail")
        .single();
      const currentMeta = currentIntegration?.metadata as any || {};
      if (currentMeta.should_stop_sync) {
        // Reset flags and stop
        await supabase
          .from("user_integrations")
          .update({
            metadata: {
              ...currentMeta,
              is_syncing: false,
              should_stop_sync: false,
              sync_progress: null,
              sync_message: "Sync stopped by user"
            }
          })
          .eq("user_id", userId)
          .eq("provider", "gmail");
        throw new Error("Sync stopped by user");
      }

      const batch = uniqueIds.slice(i, i + BATCH);
      const emails = await Promise.all(batch.map((id) => getEmailBody(gmail, id)));

      // Parse emails in parallel via Groq Llama with Claude fallback
      const extractedData = await Promise.all(
        emails.map(async (email) => {
          const cleanBody = stripHtml(email.body);
          const data = await extractFinancialDataFromEmail(cleanBody, email.subject, email.from, syncMode, aiPrompt);
          if (!data) return null;

          // Apply strict preset filter rules
          if (filterRules) {
            const rules = filterRules.split(",").map((r) => r.trim().toLowerCase());
            let isMatch = true;
            const bankName = (data.bank || data.provider || "").toLowerCase();
            const desc = (data.description || "").toLowerCase();
            const subjectLower = email.subject.toLowerCase();
            const bodyLower = cleanBody.toLowerCase();

            for (const rule of rules) {
              if (rule.startsWith("exclude:")) {
                const target = rule.substring(8).trim();
                if (target && (bankName.includes(target) || desc.includes(target) || subjectLower.includes(target) || bodyLower.includes(target))) {
                  isMatch = false;
                  break;
                }
              } else if (rule.startsWith("include:")) {
                const target = rule.substring(8).trim();
                if (target && (!bankName.includes(target) && !desc.includes(target) && !subjectLower.includes(target) && !bodyLower.includes(target))) {
                  isMatch = false;
                  break;
                }
              } else {
                if (rule && !bankName.includes(rule) && !desc.includes(rule) && !subjectLower.includes(rule) && !bodyLower.includes(rule)) {
                  isMatch = false;
                  break;
                }
              }
            }

            if (!isMatch) {
              console.log(`[Gmail Sync] Strictly filtered out transaction from "${email.subject}" due to rule: ${filterRules}`);
              return null;
            }
          }

          // Prefer real email Date header; fall back to today if unparseable
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
          // Store account balance in kobo (same unit as amount) for consistent conversion later
          if (typeof data.account_balance === "number" && data.account_balance > 0) {
            metadataVal.account_balance = Math.round(data.account_balance * 100);
          }

          return {
            source: "gmail",
            entry_type: data.entry_type,
            amount: Math.round(data.amount * 100), // convert Naira → kobo
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

      // Update progress in DB metadata as well
      await supabase
        .from("user_integrations")
        .update({
          metadata: {
            ...metadata,
            is_syncing: true,
            sync_progress: progressPct,
            sync_message: `Processed ${i + batch.length} of ${uniqueIds.length} emails...`
          }
        })
        .eq("user_id", userId)
        .eq("provider", "gmail");

      // Small delay between batches to respect rate limits
      if (i + BATCH < uniqueIds.length) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    // Upsert entries utilizing gmail_message_id unique index
    if (entries.length > 0) {
      const { error: upsertError } = await supabase.from("databank_entries").upsert(entries, {
        onConflict: "gmail_message_id",
        ignoreDuplicates: false,
      });
      if (upsertError) {
        console.error("[gmail] Database upsert failed:", upsertError.message);
        throw new Error(`Database upsert failed: ${upsertError.message}`);
      }
    }

    // Update last sync time
    await supabase
      .from("user_integrations")
      .update({
        last_synced_at: new Date().toISOString(),
        metadata: {
          ...metadata,
          is_syncing: false,
          sync_progress: 100,
          sync_message: `Synced ${entries.length} new transactions`
        }
      })
      .eq("user_id", userId)
      .eq("provider", "gmail");

    onProgress?.(100, entries.length);

    return { synced: entries.length };
  } catch (err: any) {
    // Reset syncing status on error
    await supabase
      .from("user_integrations")
      .update({
        metadata: {
          ...metadata,
          is_syncing: false,
          sync_progress: null,
          sync_message: err.message || "Sync failed"
        }
      })
      .eq("user_id", userId)
      .eq("provider", "gmail");
    throw err;
  }
}
