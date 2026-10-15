import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateLedgerSheet, exportDataBankToSheet } from "@/lib/google-sheets";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { spreadsheetId, spreadsheetUrl } = await getOrCreateLedgerSheet(user.id);
    const exportedCount = await exportDataBankToSheet(user.id, spreadsheetId);

    return NextResponse.json({
      success: true,
      exportedCount,
      spreadsheetId,
      spreadsheetUrl,
      message: `Successfully exported ${exportedCount} DataBank transactions to your Google Sheet!`,
    });
  } catch (err: any) {
    console.error("[sheets/export] POST Error:", err);
    const msg = String(err?.message || "");
    const isScopeError = msg.toLowerCase().includes("insufficient") || msg.toLowerCase().includes("scope") || err?.code === 403;
    return NextResponse.json({
      success: false,
      error: isScopeError
        ? "Google Sheets permission required. Please click 'Grant Google Sheets Access' to export."
        : (err.message || "Failed to export to Google Sheets"),
      needsReauth: isScopeError,
    }, { status: isScopeError ? 403 : 500 });
  }

}
