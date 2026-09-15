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
  "bank_name": "OPay / GTBank / etc."
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
        date_str = raw_msg.get("date", "")
        
        dedup_hash = generate_dedup_hash(user_id, amount_cents, entry_type, date_str, desc)
        
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

        return {
            "user_id": user_id,
            "source": "Gmail Transaction Syncer",
            "entry_type": entry_type,
            "amount": amount_cents,
            "description": desc,
            "category": category,
            "entry_date": date_str,
            "gmail_message_id": raw_msg.get("id"),
            "metadata": {
                "dedup_hash": dedup_hash,
                "parse_method": parsed_result.get("parse_method", "unknown"),
                "sender": raw_msg.get("sender"),
                "subject": raw_msg.get("subject"),
                "kv_extracted": parsed_result.get("kv_extracted")
            }
        }
