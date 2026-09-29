export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getGoogleClient, injectAppsScriptToLedger, getOrCreateLedgerSheet } from "@/lib/google-sheets";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { oauth2Client, metadata } = await getGoogleClient(user.id);
    let spreadsheetId = metadata?.sheets_ledger_id;

    if (!spreadsheetId) {
      const created = await getOrCreateLedgerSheet(user.id);
      spreadsheetId = created.spreadsheetId;
    }

    const result = await injectAppsScriptToLedger(oauth2Client, spreadsheetId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        scriptId: result.scriptId,
        message: "⚡ Native Google Apps Script successfully injected into your Google Sheet!",
      });
    }

    if (result.apiDisabled) {
      return NextResponse.json({
        success: false,
        apiDisabled: true,
        enableUrl: result.enableUrl,
        message: "Google Apps Script API needs to be enabled in your Google Cloud Console project.",
      });
    }

    if (result.error?.includes("insufficient authentication scopes")) {
      return NextResponse.json({
        success: false,
        needsReauth: true,
        message: "Additional permission needed to inject Apps Script. Please re-authorize Google.",
      });
    }

    return NextResponse.json({
      success: false,
      error: result.error || "Failed to inject Apps Script",
    });
  } catch (err: any) {
    console.error("[sheets/inject-script] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
