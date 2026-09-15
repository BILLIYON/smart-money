import json
import os
import sys
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# Load environment from root or local
load_dotenv(dotenv_path="../../.env.local")

from engine.agent import AgenticReconciler, call_llm_financial_extractor
from engine.db import (
    get_user_gmail_integration, 
    save_databank_entries, 
    update_sync_progress
)
from engine.gmail_client import (
    download_attachment_bytes, 
    fetch_transaction_messages, 
    get_gmail_service, 
    get_message_detail
)
from engine.parser import (
    parse_html_dom, 
    parse_pdf_statement, 
    parse_with_regex_rules
)

app = FastAPI(
    title="Smart Money Transaction Syncer Engine",
    version="1.0.0",
    description="High-performance Python microservice engine for financial email DOM/PDF parsing and agentic data sync."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

reconciler = AgenticReconciler()

class SyncRequest(BaseModel):
    user_id: str
    query: Optional[str] = None
    max_results: Optional[int] = 100
    mode: Optional[str] = "python_transaction" # "python_transaction" or "ai_agentic"
    save_to_db: Optional[bool] = True

class ParseEmailRequest(BaseModel):
    subject: Optional[str] = ""
    sender: Optional[str] = ""
    plain: Optional[str] = ""
    html: Optional[str] = ""

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "transaction-syncer-engine",
        "engine_version": "1.0.0",
        "environment": os.getenv("NODE_ENV", "development")
    }

@app.post("/api/v1/parse-email")
async def parse_email_endpoint(payload: ParseEmailRequest):
    # Try Pass 1
    res1 = parse_with_regex_rules(payload.plain or payload.html, payload.subject)
    if res1:
        return {"success": True, "data": res1}
        
    # Try Pass 2
    if payload.html:
        res2 = parse_html_dom(payload.html, payload.subject)
        if res2:
            return {"success": True, "data": res2}
            
    # Try Pass 4 (LLM Agent)
    res4 = await call_llm_financial_extractor(
        payload.plain or payload.html, 
        payload.subject, 
        payload.sender
    )
    if res4:
        return {"success": True, "data": res4}
        
    return {"success": False, "message": "No transaction payload detected"}

async def execute_user_sync(
    user_id: str, 
    custom_query: Optional[str], 
    max_results: int, 
    mode: str, 
    save_to_db: bool
):
    # 1. Fetch user integration
    integration = get_user_gmail_integration(user_id)
    if not integration or not integration.get("access_token"):
        yield json.dumps({"error": "Gmail connection not found for user", "progress": 100}) + "\n"
        return

    update_sync_progress(user_id, 5.0, "Authenticating Gmail client...")
    yield json.dumps({"progress": 5, "message": "Authenticating..."}) + "\n"
    
    try:
        service = get_gmail_service(
            user_id,
            integration["access_token"],
            integration.get("refresh_token"),
            integration.get("token_expiry")
        )
    except Exception as e:
        err_msg = f"Gmail Auth Error: {str(e)}"
        update_sync_progress(user_id, 100.0, err_msg, is_syncing=False)
        yield json.dumps({"error": err_msg, "progress": 100}) + "\n"
        return

    # 2. Build search query
    default_query = '("debit alert" OR "credit alert" OR "transaction alert" OR "transfer notification" OR "payment received" OR opay OR kuda OR palmpay OR moniepoint OR zenith OR gtbank OR access OR uba OR firstbank) -subject:("security alert" OR "login alert" OR "verification code")'
    final_query = custom_query if custom_query and custom_query.strip() else default_query

    update_sync_progress(user_id, 15.0, "Searching transaction emails...")
    yield json.dumps({"progress": 15, "message": "Fetching message list..."}) + "\n"

    try:
        messages = fetch_transaction_messages(service, final_query, max_results=max_results)
    except Exception as e:
        err_msg = f"Failed to list emails: {str(e)}"
        update_sync_progress(user_id, 100.0, err_msg, is_syncing=False)
        yield json.dumps({"error": err_msg, "progress": 100}) + "\n"
        return

    total_msgs = len(messages)
    if total_msgs == 0:
        update_sync_progress(user_id, 100.0, "No new bank alert emails found.", is_syncing=False)
        yield json.dumps({"progress": 100, "synced": 0, "entries": []}) + "\n"
        return

    update_sync_progress(user_id, 25.0, f"Found {total_msgs} alert emails. Processing multi-pass sync...")
    yield json.dumps({"progress": 25, "total": total_msgs}) + "\n"

    parsed_entries = []
    
    for idx, msg_stub in enumerate(messages):
        msg_id = msg_stub["id"]
        detail = get_message_detail(service, msg_id)
        if not detail:
            continue

        extracted = None

        # Pass 1: Regex
        extracted = parse_with_regex_rules(detail["plain"] or detail["html"], detail["subject"])

        # Pass 2: BeautifulSoup DOM
        if not extracted and detail["html"]:
            extracted = parse_html_dom(detail["html"], detail["subject"])

        # Pass 3: PDF Attachment check
        if not extracted and detail["pdfs"]:
            for pdf_info in detail["pdfs"]:
                pdf_bytes = download_attachment_bytes(service, msg_id, pdf_info["attachment_id"])
                if pdf_bytes:
                    pdf_results = parse_pdf_statement(pdf_bytes)
                    if pdf_results:
                        for pdf_res in pdf_results:
                            reconciled = reconciler.reconcile_entry(user_id, detail, pdf_res)
                            parsed_entries.append(reconciled)

        # Pass 4: AI Agentic LLM Fallback (if mode is ai_agentic or regex failed)
        if not extracted and mode == "ai_agentic":
            extracted = await call_llm_financial_extractor(
                detail["plain"] or detail["html"],
                detail["subject"],
                detail["sender"]
            )

        if extracted:
            reconciled = reconciler.reconcile_entry(user_id, detail, extracted)
            parsed_entries.append(reconciled)

        pct = 25.0 + ((idx + 1) / total_msgs) * 65.0
        if (idx + 1) % 5 == 0 or (idx + 1) == total_msgs:
            update_sync_progress(user_id, pct, f"Parsed {idx+1}/{total_msgs} emails ({len(parsed_entries)} entries)...")
            yield json.dumps({"progress": round(pct, 1), "synced": len(parsed_entries)}) + "\n"

    # Save to database
    saved_count = 0
    if save_to_db and parsed_entries:
        update_sync_progress(user_id, 95.0, "Saving entries to databank...")
        saved_count = save_databank_entries(user_id, parsed_entries)

    update_sync_progress(user_id, 100.0, f"Sync complete. Extracted {len(parsed_entries)} transactions ({saved_count} new saved).", is_syncing=False)
    yield json.dumps({
        "progress": 100,
        "synced": len(parsed_entries),
        "saved": saved_count,
        "entries": parsed_entries
    }) + "\n"

@app.post("/api/v1/sync")
async def trigger_sync(req: SyncRequest):
    return StreamingResponse(
        execute_user_sync(
            user_id=req.user_id,
            custom_query=req.query,
            max_results=req.max_results or 100,
            mode=req.mode or "python_transaction",
            save_to_db=req.save_to_db if req.save_to_db is not None else True
        ),
        media_type="application/x-ndjson"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
