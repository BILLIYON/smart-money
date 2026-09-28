export const dynamic = "force-dynamic";

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

    // 2. Export existing DataBank transactions immediately to the sheet (instant feedback)
    let totalSheetRows = await exportDataBankToSheet(user.id, spreadsheetId);

    // 3. Trigger a fast background Gmail sync (non-blocking) so HTTP doesn't hang
    syncGmailForUser(user.id, false, undefined, true)
      .then(async () => {
        try {
          await exportDataBankToSheet(user.id, spreadsheetId);
        } catch (e) {
          console.warn("[sheets/extract-gmail] Background sheet update warning:", e);
        }
      })
      .catch((err) => {
        console.warn("[sheets/extract-gmail] Background sync warning:", err);
      });

    return NextResponse.json({
      success: true,
      extractedCount: totalSheetRows,
      totalSheetRows,
      spreadsheetId,
      spreadsheetUrl,
      message: `Populated ${totalSheetRows} transactions directly into your Google Sheet! Background sync is also updating latest alerts.`,
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

