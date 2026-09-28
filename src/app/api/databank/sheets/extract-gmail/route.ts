export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { syncGmailForUser } from "@/lib/gmail";
import { getOrCreateLedgerSheet, exportDataBankToSheet } from "@/lib/google-sheets";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Ensure user has a valid Google Sheet ledger
    const { spreadsheetId, spreadsheetUrl } = await getOrCreateLedgerSheet(user.id);

    // 2. Scan Gmail and extract transactions into the database
    const entries = await syncGmailForUser(user.id, true, undefined, true);

    // 3. Export all transactions directly into the Google Sheet
    const totalSheetRows = await exportDataBankToSheet(user.id, spreadsheetId);

    return NextResponse.json({
      success: true,
      extractedCount: entries.length,
      totalSheetRows,
      spreadsheetId,
      spreadsheetUrl,
      message: `Extracted ${entries.length} transactions from your Gmail directly into your Google Sheet!`,
    });
  } catch (err: any) {
    console.error("[sheets/extract-gmail] POST Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to extract Gmail alerts to Google Sheet",
      },
      { status: 500 }
    );
  }
}
