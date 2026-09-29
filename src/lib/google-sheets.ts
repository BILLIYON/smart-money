import { google, sheets_v4 } from "googleapis";
import { Pool } from "pg";
import fs from "fs";
import path from "path";
import { decrypt, encrypt } from "./crypto";

let sharedPool: Pool | null = null;
function getPool(): Pool {
  if (!sharedPool) {
    const dbUrl = process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money";
    const isRemote = dbUrl.includes("supabase.com") || dbUrl.includes("pooler") || dbUrl.includes("aws-");
    sharedPool = new Pool({
      connectionString: dbUrl,
      ssl: isRemote ? { rejectUnauthorized: false } : false,
      max: 10,
    });
  }
  return sharedPool;
}

export type SheetTransactionRow = {
  date: string;
  bank: string;
  entry_type: "income" | "expense" | "asset";
  amount: number; // in Naira units
  amount_cents: number; // in kobo/cents
  description: string;
  category: string;
  account_balance?: number;
  reference?: string;
  status?: string;
};

export async function getGoogleClient(userId: string) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT access_token, refresh_token, token_expiry, metadata 
     FROM user_integrations 
     WHERE user_id = $1 AND provider = 'gmail' 
     LIMIT 1;`,
    [userId]
  );

  const integration = rows[0];
  if (!integration?.access_token) {
    throw new Error("Google integration not found. Please connect your Google account.");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || "64971754557-dt5ldg3u1vrvbns4k7venkvvcdtajfhl.apps.googleusercontent.com";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "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";

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    access_token: decrypt(integration.access_token),
    refresh_token: integration.refresh_token ? decrypt(integration.refresh_token) : undefined,
    expiry_date: integration.token_expiry ? new Date(integration.token_expiry).getTime() : undefined,
  });

  oauth2Client.on("tokens", async (newTokens) => {
    try {
      const updatePool = getPool();
      if (newTokens.refresh_token && newTokens.refresh_token.trim()) {
        await updatePool.query(
          `UPDATE user_integrations 
           SET access_token = $1, refresh_token = $2, token_expiry = COALESCE($3, token_expiry) 
           WHERE user_id = $4 AND provider = 'gmail';`,
          [
            encrypt(newTokens.access_token!),
            encrypt(newTokens.refresh_token.trim()),
            newTokens.expiry_date ? new Date(newTokens.expiry_date).toISOString() : null,
            userId,
          ]
        );
      } else {
        await updatePool.query(
          `UPDATE user_integrations 
           SET access_token = $1, token_expiry = COALESCE($2, token_expiry) 
           WHERE user_id = $3 AND provider = 'gmail';`,
          [
            encrypt(newTokens.access_token!),
            newTokens.expiry_date ? new Date(newTokens.expiry_date).toISOString() : null,
            userId,
          ]
        );
      }
    } catch (err) {
      console.error("[getGoogleClient] Token refresh error:", err);
    }
  });

  return {
    oauth2Client,
    sheets: google.sheets({ version: "v4", auth: oauth2Client }),
    drive: google.drive({ version: "v3", auth: oauth2Client }),
    metadata: (integration.metadata as any) || {},
  };
}

/**
 * Creates or retrieves the user's dedicated "Smart Money — Financial Ledger" Google Sheet.
 */
export async function getOrCreateLedgerSheet(userId: string): Promise<{
  spreadsheetId: string;
  spreadsheetUrl: string;
  isNew: boolean;
}> {
  const { sheets, metadata } = await getGoogleClient(userId);
  const pool = getPool();

  if (metadata.sheets_ledger_id) {
    try {
      // Verify sheet still exists and is accessible
      const check = await sheets.spreadsheets.get({
        spreadsheetId: metadata.sheets_ledger_id,
        fields: "spreadsheetId,spreadsheetUrl",
      });
      if (check.data.spreadsheetId) {
        return {
          spreadsheetId: check.data.spreadsheetId,
          spreadsheetUrl: check.data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${check.data.spreadsheetId}/edit`,
          isNew: false,
        };
      }
    } catch {
      console.warn(`[getOrCreateLedgerSheet] Existing sheet ${metadata.sheets_ledger_id} not found, creating new.`);
    }
  }

  // Create new styled Financial Ledger spreadsheet
  const createRes = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: "Smart Money — Financial Ledger",
      },
      sheets: [
        {
          properties: {
            title: "Transactions",
            gridProperties: {
              frozenRowCount: 1,
              columnCount: 10,
            },
          },
        },
      ],
    },
  });

  const spreadsheetId = createRes.data.spreadsheetId!;
  const spreadsheetUrl = createRes.data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Format headers and column widths
  const headers = [
    "Date",
    "Bank",
    "Entry Type",
    "Amount (₦)",
    "Description / Counterparty",
    "Category",
    "Available Balance (₦)",
    "Reference / ID",
    "Status",
    "Idempotency Hash",
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Transactions!A1:J1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [headers],
    },
  });

  // Apply styling: Navy Header, white text, bold, frozen row
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 10,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.06, green: 0.09, blue: 0.16 }, // #0f172a Dark Navy
                  textFormat: {
                    bold: true,
                    foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                    fontSize: 10,
                  },
                  horizontalAlignment: "CENTER",
                },
              },
              fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
            },
          },
          // Set column width for Description & Amount
          {
            updateDimensionProperties: {
              range: {
                sheetId: 0,
                dimension: "COLUMNS",
                startIndex: 4,
                endIndex: 5,
              },
              properties: { pixelSize: 280 },
              fields: "pixelSize",
            },
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId: 0,
                dimension: "COLUMNS",
                startIndex: 3,
                endIndex: 4,
              },
              properties: { pixelSize: 130 },
              fields: "pixelSize",
            },
          },
        ],
      },
    });
  } catch (styleErr) {
    console.warn("[getOrCreateLedgerSheet] Non-critical header style error:", styleErr);
  }

  // Auto-inject the container-bound Google Apps Script into the newly created sheet
  let appsScriptId: string | undefined = undefined;
  try {
    const injectRes = await injectAppsScriptToLedger(oauth2Client, spreadsheetId);
    if (injectRes.success && injectRes.scriptId) {
      appsScriptId = injectRes.scriptId;
    }
  } catch (injectErr) {
    console.warn("[getOrCreateLedgerSheet] Apps Script auto-injection non-critical error:", injectErr);
  }

  // Save sheet ID to user metadata
  const updatedMeta = {
    ...metadata,
    sheets_ledger_id: spreadsheetId,
    sheets_ledger_url: spreadsheetUrl,
    sheets_apps_script_id: appsScriptId || metadata.sheets_apps_script_id,
    sheets_connected_at: new Date().toISOString(),
  };

  await pool.query(
    `UPDATE user_integrations 
     SET metadata = $1 
     WHERE user_id = $2 AND provider = 'gmail';`,
    [JSON.stringify(updatedMeta), userId]
  );

  return {
    spreadsheetId,
    spreadsheetUrl,
    appsScriptId,
    isNew: true,
  };
}

/**
 * Automatically injects the container-bound Google Apps Script project into the spreadsheet.
 */
export async function injectAppsScriptToLedger(
  oauth2Client: any,
  spreadsheetId: string
): Promise<{ success: boolean; scriptId?: string; apiDisabled?: boolean; enableUrl?: string; error?: string }> {
  try {
    const script = google.script({ version: "v1", auth: oauth2Client });
    
    // 1. Create a container-bound Apps Script project attached to this spreadsheet
    const projectRes = await script.projects.create({
      requestBody: {
        title: "Smart Money Gmail Syncer",
        parentId: spreadsheetId,
      },
    });

    const scriptId = projectRes.data.scriptId;
    if (!scriptId) {
      return { success: false, error: "Failed to get scriptId" };
    }

    // 2. Read the script code from public asset
    let scriptCode = "";
    try {
      scriptCode = fs.readFileSync(path.resolve(process.cwd(), "public/smart_money_gmail_to_sheets.js"), "utf-8");
    } catch {
      scriptCode = `// Smart Money Native Sync Script`;
    }

    // 3. Upload Code.gs and appsscript manifest
    await script.projects.updateContent({
      scriptId,
      requestBody: {
        files: [
          {
            name: "appsscript",
            type: "JSON",
            source: JSON.stringify({
              timeZone: "Africa/Lagos",
              dependencies: {},
              exceptionLogging: "STACKDRIVER",
              runtimeVersion: "V8",
            }),
          },
          {
            name: "Code",
            type: "SERVER_JS",
            source: scriptCode,
          },
        ],
      },
    });

    console.log(`[injectAppsScriptToLedger] Successfully injected Apps Script into spreadsheet ${spreadsheetId} (Script ID: ${scriptId})`);
    return { success: true, scriptId };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.warn(`[injectAppsScriptToLedger] Apps script injection notice:`, errMsg);

    const isApiDisabled = errMsg.includes("has not been used in project") || 
                          errMsg.includes("disabled") || 
                          errMsg.includes("Access Not Configured");
    
    return {
      success: false,
      apiDisabled: isApiDisabled,
      enableUrl: "https://console.developers.google.com/apis/api/script.googleapis.com/overview?project=64971754557",
      error: errMsg,
    };
  }
}

/**
 * Reads all transaction rows from the user's Financial Ledger Google Sheet cleanly.
 */
export async function readTransactionsFromSheet(
  userId: string,
  spreadsheetId: string
): Promise<SheetTransactionRow[]> {
  const { sheets } = await getGoogleClient(userId);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Transactions!A2:J",
  });

  const rawRows = res.data.values || [];
  const entries: SheetTransactionRow[] = [];

  for (const row of rawRows) {
    if (!row || row.length === 0) continue;

    const dateStr = (row[0] || "").trim();
    const bank = (row[1] || "").trim() || "Bank Alert";
    const typeRaw = (row[2] || "").trim().toLowerCase();
    const amountRaw = (row[3] || "").toString().replace(/[^\d.-]/g, "").trim();
    const desc = (row[4] || "").trim();
    const category = (row[5] || "").trim() || "General Expense";
    const balanceRaw = (row[6] || "").toString().replace(/[^\d.-]/g, "").trim();
    const reference = (row[7] || "").trim();
    const status = (row[8] || "").trim();

    const amountFloat = parseFloat(amountRaw);
    if (isNaN(amountFloat) || amountFloat <= 0) continue;

    let entry_type: "income" | "expense" | "asset" = "expense";
    if (typeRaw.includes("income") || typeRaw.includes("credit") || typeRaw.includes("cr")) {
      entry_type = "income";
    } else if (typeRaw.includes("asset") || typeRaw.includes("saving") || typeRaw.includes("invest")) {
      entry_type = "asset";
    }

    entries.push({
      date: dateStr || new Date().toISOString().split("T")[0],
      bank,
      entry_type,
      amount: amountFloat,
      amount_cents: Math.round(amountFloat * 100),
      description: desc || `${bank} Transaction`,
      category,
      account_balance: balanceRaw ? parseFloat(balanceRaw) : undefined,
      reference: reference || undefined,
      status: status || "Synced",
    });
  }

  return entries;
}

/**
 * Appends new transactions to the user's Google Sheet ledger.
 */
export async function appendTransactionsToSheet(
  userId: string,
  spreadsheetId: string,
  transactions: Array<{
    date: string;
    bank: string;
    entry_type: string;
    amount: number;
    description: string;
    category?: string;
    account_balance?: number;
    reference?: string;
    status?: string;
    hash?: string;
  }>
): Promise<number> {
  if (!transactions.length) return 0;
  const { sheets } = await getGoogleClient(userId);

  const rows = transactions.map((t) => [
    t.date,
    t.bank,
    t.entry_type === "income" ? "Income" : t.entry_type === "asset" ? "Savings & Investments" : "Expense",
    t.amount,
    t.description,
    t.category || "General Expense",
    t.account_balance ?? "",
    t.reference ?? "",
    t.status || "Auto-Synced",
    t.hash || "",
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Transactions!A:J",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: rows,
    },
  });

  return rows.length;
}

/**
 * Exports all existing DataBank entries to the user's Financial Ledger Google Sheet.
 */
export async function exportDataBankToSheet(
  userId: string,
  spreadsheetId: string
): Promise<number> {
  const pool = getPool();
  const { sheets } = await getGoogleClient(userId);

  const { rows } = await pool.query(
    `SELECT entry_date, description, amount, entry_type, category, metadata
     FROM databank_entries
     WHERE user_id = $1
     ORDER BY entry_date DESC;`,
    [userId]
  );

  if (!rows.length) return 0;

  const sheetRows = rows.map((r) => {
    const meta = (r.metadata as any) || {};
    const amountNaira = (r.amount || 0) / 100;
    const typeLabel = r.entry_type === "income" ? "Income" : r.entry_type === "asset" ? "Savings & Investments" : "Expense";
    const balance = meta.account_balance ? (meta.account_balance / 100) : "";

    return [
      r.entry_date ? new Date(r.entry_date).toISOString().split("T")[0] : "",
      meta.bank || "Bank Alert",
      typeLabel,
      amountNaira,
      r.description,
      r.category || "General Expense",
      balance,
      meta.gmail_message_id || meta.reference || "",
      "DataBank Mirror",
      meta.dedup_hash || "",
    ];
  });

  // Clear existing data rows (preserve header A1:J1)
  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: "Transactions!A2:J",
    });
  } catch {}

  // Bulk write all transactions
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Transactions!A2",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: sheetRows,
    },
  });

  return sheetRows.length;
}
