import os
from typing import Any, Dict, List, Optional
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

def get_sheets_service(
    access_token: str, 
    refresh_token: Optional[str] = None
):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")

    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret
    )

    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
        except Exception as e:
            print(f"[SheetsClient] Token refresh warning: {e}")

    return build("sheets", "v4", credentials=creds)

def append_parsed_entries_to_sheet(
    sheets_service, 
    spreadsheet_id: str, 
    entries: List[Dict[str, Any]]
) -> int:
    """
    Appends normalized transactions to the user's Financial Ledger Google Sheet.
    """
    if not entries or not spreadsheet_id:
        return 0

    rows = []
    for e in entries:
        meta = e.get("metadata") or {}
        amt_naira = round((e.get("amount", 0) or 0) / 100.0, 2)
        entry_type = e.get("entry_type", "expense")
        type_str = "Income" if entry_type == "income" else ("Savings & Investments" if entry_type == "asset" else "Expense")
        bal_naira = round((meta.get("account_balance", 0) or 0) / 100.0, 2) if meta.get("account_balance") else ""

        rows.append([
            str(e.get("entry_date") or ""),
            str(meta.get("bank") or "Bank Alert"),
            type_str,
            amt_naira,
            str(e.get("description") or "Transaction"),
            str(e.get("category") or "General Expense"),
            bal_naira,
            str(e.get("gmail_message_id") or meta.get("reference") or ""),
            "Synced via Python Engine",
            str(meta.get("dedup_hash") or "")
        ])

    try:
        sheets_service.spreadsheets().values().append(
            spreadsheetId=spreadsheet_id,
            range="Transactions!A:J",
            valueInputOption="USER_ENTERED",
            insertDataOption="INSERT_ROWS",
            body={"values": rows}
        ).execute()
        return len(rows)
    except Exception as err:
        print(f"[SheetsClient] Error appending rows to sheet {spreadsheet_id}: {err}")
        return 0
