import hashlib
import json
import os
import re
from typing import Any, Dict, List, Optional
import httpx

def generate_dedup_hash(user_id: str, amount_cents: int, entry_type: str, date_str: str, description: str) -> str:
    """
    Generates a unique deduplication hash for a transaction.
    """
    clean_desc = re.sub(r"\s+", " ", description.lower().strip())
    # Strip dynamic reference codes or random hex IDs for stable hashing
    clean_desc = re.sub(r"ref:?\s*[\w\d]+", "", clean_desc)
    
    # Standardize date to YYYY-MM-DD
    date_day = date_str[:10] if date_str else "1970-01-01"
    raw_str = f"{user_id}:{amount_cents}:{entry_type}:{date_day}:{clean_desc[:30]}"
    return hashlib.sha256(raw_str.encode("utf-8")).hexdigest()

async def call_llm_financial_extractor(
    email_text: str, 
    subject: str, 
    sender: str
) -> Optional[Dict[str, Any]]:
    """
    Pass 4: Calls LLM API (Groq / Gemini / OpenAI) to extract financial payload from tricky emails.
    """
    groq_key = os.getenv("GROQ_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")
    
    prompt = f"""You are a high-precision bank alert financial parser.
Extract the transaction details from this email alert.

Subject: {subject}
Sender: {sender}
Email Body:
{email_text[:2500]}

Respond ONLY with valid JSON in this exact structure:
{{
  "is_financial_transaction": true,
  "amount_in_currency": 1500.50,
  "currency": "NGN",
  "entry_type": "income" | "expense",
  "description": "Short clean description or beneficiary",
  "category": "Food & Dining" | "Shopping" | "Bills & Utilities" | "Transfers" | "Subscriptions" | "General Expense" | "Income",
  "bank_name": "the issuing financial institution that sent this alert email (e.g. Zenith Bank for emails from @zenithbank.com). Do NOT set bank_name to a destination/beneficiary bank mentioned in a transfer narration."
}}
If this email is NOT a financial debit/credit transaction alert (e.g. security alert, login code, spam), return {{"is_financial_transaction": false}}.
"""

    # 1. Try Groq (ultra fast)
    if groq_key:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {groq_key}"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.1,
                        "response_format": {"type": "json_object"}
                    }
                )
                if res.status_code == 200:
                    content = res.json()["choices"][0]["message"]["content"]
                    data = json.loads(content)
                    if data.get("is_financial_transaction") and data.get("amount_in_currency"):
                        amount_cents = int(round(float(data["amount_in_currency"]) * 100))
                        return {
                            "amount": amount_cents,
                            "description": data.get("description", subject),
                            "entry_type": data.get("entry_type", "expense"),
                            "category": data.get("category", "General Expense"),
                            "bank_name": data.get("bank_name", "Bank"),
                            "parse_method": "ai_agentic_pass4"
                        }
        except Exception as e:
            print(f"[Agentic] Groq LLM fallback warning: {e}")

    # 2. Try Gemini API if key available
    if gemini_key:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}",
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"responseMimeType": "application/json"}
                    }
                )
                if res.status_code == 200:
                    text_out = res.json()["candidates"][0]["content"]["parts"][0]["text"]
                    data = json.loads(text_out)
                    if data.get("is_financial_transaction") and data.get("amount_in_currency"):
                        amount_cents = int(round(float(data["amount_in_currency"]) * 100))
                        return {
                            "amount": amount_cents,
                            "description": data.get("description", subject),
                            "entry_type": data.get("entry_type", "expense"),
                            "category": data.get("category", "General Expense"),
                            "bank_name": data.get("bank_name", "Bank"),
                            "parse_method": "ai_agentic_pass4"
                        }
        except Exception as e:
            print(f"[Agentic] Gemini LLM fallback warning: {e}")

    return None

from datetime import datetime
from email.utils import parsedate_to_datetime

def sanitize_date_to_yyyy_mm_dd(raw_date: Any, internal_date_ms: int = 0) -> str:
    if not raw_date:
        if internal_date_ms:
            return datetime.fromtimestamp(internal_date_ms / 1000.0).strftime("%Y-%m-%d")
        return datetime.now().strftime("%Y-%m-%d")
    
    raw_str = str(raw_date).strip()
    if re.match(r"^\d{4}-\d{2}-\d{2}$", raw_str):
        return raw_str
        
    try:
        clean_rfc = re.sub(r"\s*\([^)]*\)", "", raw_str).strip()
        dt = parsedate_to_datetime(clean_rfc)
        return dt.strftime("%Y-%m-%d")
    except Exception:
        pass
        
    try:
        dt = datetime.fromisoformat(raw_str.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d")
    except Exception:
        pass
        
    if internal_date_ms:
        try:
            return datetime.fromtimestamp(internal_date_ms / 1000.0).strftime("%Y-%m-%d")
        except Exception:
            pass
            
    return datetime.now().strftime("%Y-%m-%d")

class AgenticReconciler:
    def __init__(self):
        self.learned_rules = {}

    def reconcile_entry(
        self, 
        user_id: str, 
        raw_msg: Dict[str, Any], 
        parsed_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Applies categorization, bank detection, and deduplication metadata enrichment.
        """
        amount_cents = parsed_result.get("amount", 0)
        entry_type = parsed_result.get("entry_type", "expense")
        desc = parsed_result.get("description", raw_msg.get("subject", "Transaction"))
        raw_date = raw_msg.get("date", "")
        internal_ms = raw_msg.get("internal_date_ms", 0)
        
        clean_date = sanitize_date_to_yyyy_mm_dd(raw_date, internal_ms)
        dedup_hash = generate_dedup_hash(user_id, amount_cents, entry_type, clean_date, desc)
        
        # Categorization logic
        desc_lower = desc.lower()
        category = parsed_result.get("category")
        if not category:
            if any(w in desc_lower for w in ["airtime", "data", "recharge", "mtn", "glo", "airtel", "9mobile"]):
                category = "Utilities & Airtime"
            elif any(w in desc_lower for w in ["food", "eatery", "chicken", "bukka", "restaurant", "chowdeck", "bolt food"]):
                category = "Food & Dining"
            elif any(w in desc_lower for w in ["uber", "bolt", "indrive", "fuel", "total", "filling station"]):
                category = "Transportation"
            elif any(w in desc_lower for w in ["subscription", "netflix", "spotify", "apple", "prime", "dstv", "gotv"]):
                category = "Subscriptions"
            elif entry_type == "income":
                category = "Income & Deposits"
            else:
                category = "General Expense"

        # Bank detection logic & sender domain override
        sender = raw_msg.get("sender", "")
        subject = raw_msg.get("subject", "")
        sender_lower = sender.lower()
        subject_lower = subject.lower()

        plain_body = raw_msg.get("plain", "") or ""
        html_body = raw_msg.get("html", "") or ""
        stripped_html = re.sub(r"<[^>]+>", " ", html_body).strip() if html_body else ""
        clean_full_body = plain_body if plain_body.strip() else (stripped_html if stripped_html else (raw_msg.get("snippet") or ""))
        snippet = clean_full_body[:1500] if isinstance(clean_full_body, str) else ""

        # 1. First check if sender email matches a known issuing financial institution
        sender_bank = None
        if "zenith" in sender_lower: sender_bank = "Zenith Bank"
        elif "gtbank" in sender_lower or "gtb" in sender_lower or "guaranty" in sender_lower: sender_bank = "GTBank"
        elif "access" in sender_lower: sender_bank = "Access Bank"
        elif "uba" in sender_lower or "united bank for africa" in sender_lower: sender_bank = "UBA"
        elif "firstbank" in sender_lower or "first bank" in sender_lower: sender_bank = "FirstBank"
        elif "opay" in sender_lower: sender_bank = "OPay"
        elif "kuda" in sender_lower: sender_bank = "Kuda Bank"
        elif "palmpay" in sender_lower: sender_bank = "PalmPay"
        elif "moniepoint" in sender_lower: sender_bank = "Moniepoint"
        elif "stanbic" in sender_lower: sender_bank = "Stanbic IBTC"
        elif "fcmb" in sender_lower: sender_bank = "FCMB"
        elif "sterling" in sender_lower: sender_bank = "Sterling Bank"
        elif "wema" in sender_lower or "alat" in sender_lower: sender_bank = "Wema / ALAT"
        elif "taxtech" in sender_lower or "taxaide" in sender_lower: sender_bank = "Taxtech"
        elif "jobberman" in sender_lower: sender_bank = "Jobberman"
        elif "grey" in sender_lower: sender_bank = "Grey Finance"

        if sender_bank:
            bank_name = sender_bank
        else:
            bank_name = parsed_result.get("bank_name") or parsed_result.get("bank") or parsed_result.get("provider")
            if not bank_name or str(bank_name).lower() in ["gmail alert", "bank alert", "bank"]:
                desc_clean = re.sub(r"(?:transfer\s+to|paid\s+to|sent\s+to|credited\s+to|beneficiary[:\s]+)\s*([a-z0-9\s]{2,30})", "", desc.lower(), flags=re.I)

                # 2. Subject header check
                if "zenith" in subject_lower: bank_name = "Zenith Bank"
                elif "gtbank" in subject_lower or "gtb" in subject_lower: bank_name = "GTBank"
                elif "access" in subject_lower: bank_name = "Access Bank"
                elif "uba" in subject_lower: bank_name = "UBA"
                elif "firstbank" in subject_lower: bank_name = "FirstBank"
                elif "kuda" in subject_lower: bank_name = "Kuda Bank"
                elif "opay" in subject_lower: bank_name = "OPay"
                elif "palmpay" in subject_lower: bank_name = "PalmPay"
                elif "moniepoint" in subject_lower: bank_name = "Moniepoint"

                # 3. Clean description check
                if not bank_name:
                    if "zenith" in desc_clean: bank_name = "Zenith Bank"
                    elif "gtbank" in desc_clean or "gtb" in desc_clean: bank_name = "GTBank"
                    elif "access" in desc_clean: bank_name = "Access Bank"
                    elif "uba" in desc_clean: bank_name = "UBA"
                    elif "firstbank" in desc_clean: bank_name = "FirstBank"
                    elif "kuda" in desc_clean: bank_name = "Kuda Bank"
                    elif "opay" in desc_clean: bank_name = "OPay"
                    elif "palmpay" in desc_clean: bank_name = "PalmPay"
                    elif "moniepoint" in desc_clean: bank_name = "Moniepoint"
                    elif "taxtech" in desc_clean or "taxaide" in desc_clean: bank_name = "Taxtech"
                    elif "jobberman" in desc_clean: bank_name = "Jobberman"
                    elif "grey" in desc_clean: bank_name = "Grey Finance"
                    elif "demerge" in desc_clean: bank_name = "DEMERGE NIGERIA LIMITED"

        metadata = {
            "dedup_hash": dedup_hash,
            "parse_method": parsed_result.get("parse_method", "unknown"),
            "sender": sender,
            "subject": subject,
            "email_from": sender,
            "email_subject": subject,
            "email_body_snippet": snippet,
            "bank": bank_name,
            "provider": bank_name,
            "reason": desc,
            "kv_extracted": parsed_result.get("kv_extracted")
        }

        acc_bal = parsed_result.get("account_balance")
        if isinstance(acc_bal, (int, float)) and acc_bal > 0:
            metadata["account_balance"] = int(acc_bal)

        return {
            "user_id": user_id,
            "source": "gmail",
            "entry_type": entry_type,
            "amount": amount_cents,
            "description": desc,
            "category": category,
            "entry_date": clean_date,
            "gmail_message_id": raw_msg.get("id"),
            "metadata": metadata
        }
