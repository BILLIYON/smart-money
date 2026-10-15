export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateLedgerSheet, getGoogleClient } from "@/lib/google-sheets";
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

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pool = getPool();
    const { rows: intRows } = await pool.query(
      `SELECT access_token, last_synced_at, metadata, scopes 
       FROM user_integrations 
       WHERE user_id = $1 AND provider = 'gmail' 
       LIMIT 1;`,
      [user.id]
    );

    const integration = intRows[0];
    if (!integration?.access_token) {
      return NextResponse.json({
        connected: false,
        message: "Google account not connected",
      });
    }

    let meta = (integration.metadata as any) || {};
    let sheetId = meta.sheets_ledger_id || null;
    let sheetUrl = meta.sheets_ledger_url || (sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : null);

    const { rows: countRows } = await pool.query(
      `SELECT count(*) FROM databank_entries WHERE user_id = $1;`,
      [user.id]
    );
    const databankCount = parseInt(countRows[0]?.count || "0", 10);

    const rawScopes: string[] = Array.isArray(integration.scopes) ? integration.scopes : [];
    const hasSheetsScope = rawScopes.length === 0 || rawScopes.some((s: string) => s.includes("spreadsheets") || s.includes("drive"));
    const needsReauth = !hasSheetsScope;

    // Auto-provision ledger sheet from master template if user is connected with scopes but doesn't have a sheet yet
    if (!needsReauth && !sheetId) {
      try {
        const created = await getOrCreateLedgerSheet(user.id);
        if (created.spreadsheetId) {
          sheetId = created.spreadsheetId;
          sheetUrl = created.spreadsheetUrl;
        }
      } catch (autoErr) {
        console.warn("[sheets/status] Auto-provision ledger sheet deferred:", autoErr);
      }
    }

    return NextResponse.json(
      {
        connected: true,
        hasSheet: Boolean(sheetId),
        sheetId,
        sheetUrl,
        lastSyncedAt: meta.sheets_last_synced_at || integration.last_synced_at || null,
        databankCount,
        needsReauth,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );

  } catch (err: any) {
    console.error("[sheets/status] GET Error:", err);
    return NextResponse.json({ error: err.message || "Failed to check status" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const forceNew = Boolean(body?.forceNew);

    const result = await getOrCreateLedgerSheet(user.id, forceNew);
    return NextResponse.json({
      success: true,
      sheetId: result.spreadsheetId,
      sheetUrl: result.spreadsheetUrl,
      isNew: result.isNew,
      clonedFromTemplate: result.clonedFromTemplate,
      message: result.clonedFromTemplate
        ? "✨ Cloned fresh Financial Ledger with pre-loaded automation script from Master Template!"
        : result.isNew
        ? "Created new Smart Money Financial Ledger sheet"
        : "Connected to existing ledger sheet",
    });
  } catch (err: any) {
    console.error("[sheets/status] POST Error:", err);
    const msg = String(err?.message || "");
    const isApiDisabled =
      msg.toLowerCase().includes("has not been used in project") ||
      msg.toLowerCase().includes("disabled") ||
      msg.toLowerCase().includes("enable it by visiting");

    if (isApiDisabled) {
      return NextResponse.json(
        {
          success: false,
          apiDisabled: true,
          enableUrl: "https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=64971754557",
          driveEnableUrl: "https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=64971754557",
          error: "Google Sheets API is currently disabled in your Google Cloud project (64971754557). Click below to enable it.",
        },
        { status: 403 }
      );
    }

    const isScopeError =
      (msg.toLowerCase().includes("insufficient") || msg.toLowerCase().includes("scope")) && !isApiDisabled;

    return NextResponse.json(
      {
        success: false,
        error: isScopeError
          ? "Google Sheets permission required. Please click 'Grant Google Sheets Access' below to enable your Financial Ledger."
          : err.message || "Failed to initialize sheet",
        needsReauth: isScopeError,
        reauthUrl: "/api/auth/gmail?return=/databank",
      },
      { status: isScopeError ? 403 : 500 }
    );
  }

}

