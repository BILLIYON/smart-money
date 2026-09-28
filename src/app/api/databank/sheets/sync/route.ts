import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateLedgerSheet, readTransactionsFromSheet } from "@/lib/google-sheets";
import { applyMerchantRules } from "@/lib/merchant-rules";
import { Pool } from "pg";

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

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pool = getPool();
    const { spreadsheetId } = await getOrCreateLedgerSheet(user.id);

    // Read clean tabular rows from the user's Financial Ledger sheet
    const sheetRows = await readTransactionsFromSheet(user.id, spreadsheetId);
    if (!sheetRows.length) {
      return NextResponse.json({
        success: true,
        syncedCount: 0,
        totalRows: 0,
        message: "No transactions found in Google Sheet. Add rows or export DataBank first.",
      });
    }

    let insertedCount = 0;
    let updatedCount = 0;

    for (const row of sheetRows) {
      const metadata = {
        source_sheet_id: spreadsheetId,
        bank: row.bank,
        reference: row.reference,
        account_balance: row.account_balance ? Math.round(row.account_balance * 100) : undefined,
        sheet_status: row.status,
      };

      // Check if entry already exists by reference or same date+amount+description
      const checkRes = await pool.query(
        `SELECT id FROM databank_entries 
         WHERE user_id = $1 
           AND entry_date = $2 
           AND amount = $3 
           AND (description = $4 OR (metadata->>'reference' IS NOT NULL AND metadata->>'reference' = $5))
         LIMIT 1;`,
        [user.id, row.date, row.amount_cents, row.description, row.reference || ""]
      );

      if (checkRes.rows.length > 0) {
        // Update existing entry with clean values from sheet
        await pool.query(
          `UPDATE databank_entries 
           SET entry_type = $1,
               category = $2,
               metadata = metadata || $3::jsonb
           WHERE id = $4;`,
          [row.entry_type, row.category, JSON.stringify(metadata), checkRes.rows[0].id]
        );
        updatedCount++;
      } else {
        // Insert new entry
        await pool.query(
          `INSERT INTO databank_entries (
            user_id, source, entry_type, amount, description, category, entry_date, metadata
          ) VALUES ($1, 'upload', $2, $3, $4, $5, $6, $7);`,
          [
            user.id,
            row.entry_type,
            row.amount_cents,
            row.description,
            row.category,
            row.date,
            JSON.stringify(metadata),
          ]
        );
        insertedCount++;
      }
    }

    // Auto-apply user merchant rules
    try {
      await applyMerchantRules(user.id);
    } catch {}

    // Update last synced timestamp in integration metadata
    await pool.query(
      `UPDATE user_integrations 
       SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{sheets_last_synced_at}', to_jsonb(NOW()::text))
       WHERE user_id = $1 AND provider = 'gmail';`,
      [user.id]
    );

    return NextResponse.json({
      success: true,
      syncedCount: insertedCount + updatedCount,
      insertedCount,
      updatedCount,
      totalRows: sheetRows.length,
      message: `Successfully synchronized ${insertedCount} new and updated ${updatedCount} transactions from Google Sheets!`,
    });
  } catch (err: any) {
    console.error("[sheets/sync] POST Error:", err);
    const msg = String(err?.message || "");
    const isScopeError = msg.toLowerCase().includes("insufficient") || msg.toLowerCase().includes("scope") || err?.code === 403;
    return NextResponse.json({
      success: false,
      error: isScopeError
        ? "Google Sheets permission required. Please click 'Grant Google Sheets Access' to sync."
        : (err.message || "Failed to sync from Google Sheets"),
      needsReauth: isScopeError,
    }, { status: isScopeError ? 403 : 500 });
  }

}
