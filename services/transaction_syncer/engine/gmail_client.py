import base64
import os
from typing import Any, Dict, List, Optional, Tuple
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from .db import update_user_tokens

def get_gmail_service(user_id: str, access_token: str, refresh_token: Optional[str] = None, token_expiry: Optional[str] = None):
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
            update_user_tokens(
                user_id=user_id,
                access_token=creds.token,
                refresh_token=creds.refresh_token,
                token_expiry=creds.expiry.isoformat() if creds.expiry else None
            )
        except Exception as e:
            print(f"[GmailClient] Token refresh warning for {user_id}: {e}")
            
    return build("gmail", "v1", credentials=creds)

def fetch_transaction_messages(
    service, 
    query: str, 
    max_results: int = 150
) -> List[Dict[str, Any]]:
    messages = []
    page_token = None
    
    while len(messages) < max_results:
        response = service.users().messages().list(
            userId="me",
            q=query,
            maxResults=min(50, max_results - len(messages)),
            pageToken=page_token
        ).execute()
        
        batch = response.get("messages", [])
        if not batch:
            break
            
        messages.extend(batch)
        page_token = response.get("nextPageToken")
        if not page_token:
            break
            
    return messages

def extract_mime_parts(part: Dict[str, Any]) -> Tuple[str, str, List[Dict[str, Any]]]:
    """
    Extract (plain_text, html_text, pdf_attachments) from a MIME payload part recursively.
    """
    plain = ""
    html = ""
    pdf_attachments = []
    
    mime_type = part.get("mimeType", "")
    filename = part.get("filename", "")
    body = part.get("body", {})
    data_b64 = body.get("data")
    attachment_id = body.get("attachmentId")
    
    if mime_type == "text/plain" and data_b64:
        try:
            plain = base64.urlsafe_b64decode(data_b64).decode("utf-8", errors="replace")
        except Exception:
            pass
    elif mime_type == "text/html" and data_b64:
        try:
            html = base64.urlsafe_b64decode(data_b64).decode("utf-8", errors="replace")
        except Exception:
            pass
    elif filename.lower().endswith(".pdf") or mime_type == "application/pdf":
        pdf_attachments.append({
            "filename": filename,
            "attachment_id": attachment_id,
            "size": body.get("size", 0)
        })
        
    parts = part.get("parts", [])
    for subpart in parts:
        sub_plain, sub_html, sub_pdfs = extract_mime_parts(subpart)
        if sub_plain:
            plain += ("\n" + sub_plain)
        if sub_html:
            html += ("\n" + sub_html)
        pdf_attachments.extend(sub_pdfs)
        
    return plain, html, pdf_attachments

def get_message_detail(service, message_id: str) -> Optional[Dict[str, Any]]:
    try:
        msg = service.users().messages().get(
            userId="me", 
            id=message_id, 
            format="full"
        ).execute()
        
        payload = msg.get("payload", {})
        headers = payload.get("headers", [])
        
        subject = next((h["value"] for h in headers if h["name"].lower() == "subject"), "")
        sender = next((h["value"] for h in headers if h["name"].lower() == "from"), "")
        date_str = next((h["value"] for h in headers if h["name"].lower() == "date"), "")
        
        plain, html, pdfs = extract_mime_parts(payload)
        
        # Internal date timestamp in ms
        internal_date_ms = int(msg.get("internalDate", "0"))
        
        return {
            "id": message_id,
            "subject": subject,
            "sender": sender,
            "date": date_str,
            "internal_date_ms": internal_date_ms,
            "snippet": msg.get("snippet", ""),
            "plain": plain,
            "html": html,
            "pdfs": pdfs
        }
    except Exception as e:
        print(f"[GmailClient] Error fetching msg {message_id}: {e}")
        return None

def download_attachment_bytes(service, message_id: str, attachment_id: str) -> Optional[bytes]:
    try:
        res = service.users().messages().attachments().get(
            userId="me",
            messageId=message_id,
            id=attachment_id
        ).execute()
        data_b64 = res.get("data")
        if data_b64:
            return base64.urlsafe_b64decode(data_b64)
    except Exception as e:
        print(f"[GmailClient] Error fetching attachment {attachment_id}: {e}")
    return None
