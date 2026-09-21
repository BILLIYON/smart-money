import io
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from bs4 import BeautifulSoup
import pdfplumber

EXCLUDED_SUBJECT_KEYWORDS = [
    "security alert", "login alert", "verification code", "password reset",
    "welcome to", "newsletter", "unsubscribe", "survey", "rate your experience",
    "bonus cash", "promo code", "claim your discount", "special offer", "limited time offer"
]

TRANSACTION_KEYWORDS = [
    "debit alert", "credit alert", "account debited", "account credited",
    "credited with", "debited with", "transfer notification", "transfer successful",
    "payment received", "payment successful", "pos purchase", "atm withdrawal",
    "paid to", "received from", "inflow", "outflow", "top-up", "airtime recharge",
    "transaction alert", "transaction notification", "payment receipt", "money sent", "money received",
    "transaction", "transfer", "receipt", "credited", "debited", "successful", "payout", "purchase",
    "debit", "credit", "payment", "advice", "recharge", "inward", "outward", "nip", "nibss", "paid"
]

FINTECH_DOMAINS = [
    "opay-nigeria.com", "opay.com", "kudabank.com", "kuda.com", "palmpay.com", "moniepoint.com",
    "gtbank.com", "gtco.com", "zenithbank.com", "accessbankplc.com", "ubagroup.com",
    "firstbanknigeria.com", "stanbic.com", "fcmb.com", "fidelitybank.ng", "unionbankng.com",
    "wema.africa", "providusbank.com", "sterling.ng", "polarisbanklimited.com", "flutterwave.com",
    "paystack.com", "taxtech.com.ng", "jobberman.com"
]

def is_valid_transaction_email(text: str, subject: str = "", sender: str = "") -> bool:
    subj_lower = (subject or "").lower()
    text_lower = (text or "").lower()
    sender_lower = (sender or "").lower()
    
    # 1. Reject if subject is explicitly a security alert, login code, or marketing promo
    if any(k in subj_lower for k in EXCLUDED_SUBJECT_KEYWORDS):
        return False

    combined = f"{subj_lower} {sender_lower} {text_lower}"

    # 2. Check if sender is a known bank / fintech
    if any(domain in sender_lower for domain in FINTECH_DOMAINS):
        if re.search(r"[\d,]+(?:\.\d{2})?", combined):
            return True

    # 3. Check for transaction keywords
    if any(k in combined for k in TRANSACTION_KEYWORDS):
        return True
        
    return False

def parse_amount_str(raw_val: str) -> Optional[int]:
    """
    Parses currency string like 'NGN 15,500.50', '₦1,200', '1500.00' into integer cents (e.g. 1550050).
    """
    if not raw_val:
        return None
    clean = re.sub(r"[^\d.]", "", raw_val)
    if not clean:
        return None
    try:
        val = float(clean)
        # Filter out 0 or unrealistically tiny amounts
        if val <= 0:
            return None
        return int(round(val * 100))
    except ValueError:
        return None

def detect_entry_type(text: str, subject: str = "") -> str:
    combined = f"{subject} {text}".lower()
    if any(k in combined for k in ["credit alert", "credited with", "payment received", "top-up", "inflow", "received from", "money received"]):
        return "income"
    if any(k in combined for k in ["debit alert", "debited with", "spent", "paid to", "pos purchase", "atm withdrawal", "outflow", "money sent"]):
        return "expense"
    if "credit" in combined:
        return "income"
    return "expense"

def detect_bank_name(sender: str, subject: str, text: str) -> str:
    sender_lower = (sender or "").lower()
    subject_lower = (subject or "").lower()

    # Priority 1: Check sender email header domain & name
    if "zenith" in sender_lower: return "Zenith Bank"
    if "gtbank" in sender_lower or "gtb" in sender_lower or "guaranty" in sender_lower: return "GTBank"
    if "access" in sender_lower: return "Access Bank"
    if "uba" in sender_lower or "united bank for africa" in sender_lower: return "UBA"
    if "firstbank" in sender_lower or "first bank" in sender_lower: return "FirstBank"
    if "opay" in sender_lower: return "OPay"
    if "kuda" in sender_lower: return "Kuda Bank"
    if "palmpay" in sender_lower: return "PalmPay"
    if "moniepoint" in sender_lower: return "Moniepoint"
    if "stanbic" in sender_lower: return "Stanbic IBTC"
    if "fcmb" in sender_lower: return "FCMB"
    if "sterling" in sender_lower: return "Sterling Bank"
    if "wema" in sender_lower or "alat" in sender_lower: return "Wema / ALAT"
    if "flutterwave" in sender_lower: return "Flutterwave"
    if "paystack" in sender_lower: return "Paystack"
    if "taxtech" in sender_lower or "taxaide" in sender_lower: return "Taxtech"
    if "jobberman" in sender_lower: return "Jobberman"

    # Priority 2: Check Subject header
    if "zenith" in subject_lower: return "Zenith Bank"
    if "gtbank" in subject_lower or "gtb" in subject_lower: return "GTBank"
    if "access" in subject_lower: return "Access Bank"
    if "uba" in subject_lower: return "UBA"
    if "firstbank" in subject_lower: return "FirstBank"
    if "opay" in subject_lower: return "OPay"
    if "kuda" in subject_lower: return "Kuda Bank"
    if "palmpay" in subject_lower: return "PalmPay"
    if "moniepoint" in subject_lower: return "Moniepoint"
    if "stanbic" in subject_lower: return "Stanbic IBTC"
    if "fcmb" in subject_lower: return "FCMB"
    if "sterling" in subject_lower: return "Sterling Bank"

    # Priority 3: Body text check — clean destination/beneficiary bank keywords first
    clean_text = re.sub(
        r"(?:transfer\s+to|paid\s+to|sent\s+to|credited\s+to|beneficiary(?:\s+bank)?[:\s]+|recipient(?:\s+bank)?[:\s]+|dest(?:\s+bank)?[:\s]+|to\s+bank[:\s]+)\s*([a-z0-9\s]{2,30})",
        "",
        (text or "").lower(),
        flags=re.IGNORECASE
    )
    clean_text = re.sub(r"(?:opay|kuda|palmpay|moniepoint|gtbank|zenith|access|uba|firstbank|stanbic|fcmb|sterling|wema)\s+account", "", clean_text, flags=re.IGNORECASE)

    if "opay" in clean_text: return "OPay"
    if "kuda" in clean_text: return "Kuda Bank"
    if "palmpay" in clean_text: return "PalmPay"
    if "moniepoint" in clean_text: return "Moniepoint"
    if "gtbank" in clean_text or "gtb" in clean_text: return "GTBank"
    if "zenith" in clean_text: return "Zenith Bank"
    if "access" in clean_text: return "Access Bank"
    if "uba" in clean_text or "united bank for africa" in clean_text: return "UBA"
    if "firstbank" in clean_text or "first bank" in clean_text: return "FirstBank"
    if "stanbic" in clean_text: return "Stanbic IBTC"
    if "fcmb" in clean_text: return "FCMB"
    if "sterling" in clean_text: return "Sterling Bank"
    if "wema" in clean_text or "alat" in clean_text: return "Wema / ALAT"
    if "flutterwave" in clean_text: return "Flutterwave"
    if "paystack" in clean_text: return "Paystack"
    return "Bank Alert"

def clean_python_description(raw_desc: Optional[str], subject: str = "", sender: str = "") -> Optional[str]:
    if not raw_desc:
        return None
    cleaned = raw_desc.strip()
    cleaned = re.sub(r"<[^>]+>", " ", cleaned)
    cleaned = re.sub(r"width=[\"']?\d+[\"']?", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"height=[\"']?\d+[\"']?", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"alt=[\"']?[^\"']*[\"']?", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"src=[\"']?[^\"']*[\"']?", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"Logo\"?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^of this transaction are shown below[:\s]*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^the details of this transaction are shown below[:\s]*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"account number\s*:.*$", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+Merchant\s+Order.*$", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+Order\s+(?:No|Number).*$", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+Txn\s+(?:No|Ref).*$", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"(?:current|available|ledger|acct)?\s*balance\s*(?:is)?\s*(?:₦|ngn|n|\$)?\s*[\d,]+(?:\.\d{2})?", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    if not cleaned or len(cleaned) < 2:
        return None

    if re.search(r"^(current balance|available balance|ledger balance|transaction notification|details of this|account number|we write to inform you|logo)$", cleaned, re.IGNORECASE):
        return None

    if re.search(r"current\s*balance|available\s*balance|ledger\s*balance", cleaned, re.IGNORECASE):
        return None

    return cleaned

def extract_account_balance(text: str) -> Optional[int]:
    """
    Extracts available / ledger account balance from email text into integer cents/kobo.
    Handles 'Available Balance: NGN 1,020.00', 'Avail Bal: ₦1,000', 'Ledger Balance: NGN 50,000', etc.
    """
    if not text:
        return None
    clean = re.sub(r"\s+", " ", text)
    pat = r"(?:Available\s+Balance|Ledger\s+Balance|Acct\s+Bal|Available\s+Bal|Avail\s+Bal|Account\s+Balance|New\s+Balance|Book\s+Balance|Ending\s+Balance)\s*(?:is)?[:\s]*(?:NGN|USD|EUR|GBP|₦|\$)?\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)"
    match = re.search(pat, clean, re.IGNORECASE)
    if match:
        val_str = match.group(1).replace(",", "")
        try:
            val = float(val_str)
            if val > 0:
                return int(round(val * 100))
        except ValueError:
            pass
    return None

SAVINGS_PATTERNS = [
    "cowrywise", "piggyvest", "piggybank", "risevest", "stanbic mmf",
    "bamboo", "trove", "kuda save", "savebox", "owealth", "savi",
    "fairmoney savings", "investik", "branch savings"
]

# ── PASS 1: Strict Regex & Key-Value Rule Parser ─────────────────────────
def parse_with_regex_rules(text: str, subject: str = "", sender: str = "") -> Optional[Dict[str, Any]]:
    if not text or len(text.strip()) < 10:
        return None
        
    if not is_valid_transaction_email(text, subject, sender):
        return None
        
    clean_text = re.sub(r"\s+", " ", text)
    
    # Strict Patterns explicitly tied to bank transaction labels
    amount_patterns = [
        r"(?:Amount|Amt|SUM|Value|Trans Amt|Paid|Debited|Credited):\s*(?:NGN|USD|EUR|GBP|₦|\$)?\s*([\d,]+(?:\.\d{2})?)",
        r"(?:credited|debited) with (?:NGN|USD|EUR|GBP|₦|\$)?\s*([\d,]+(?:\.\d{2})?)",
        r"paid (?:NGN|USD|EUR|GBP|₦|\$)?\s*([\d,]+(?:\.\d{2})?)\s+to",
        r"received (?:NGN|USD|EUR|GBP|₦|\$)?\s*([\d,]+(?:\.\d{2})?)\s+from",
        r"you spent (?:NGN|USD|EUR|GBP|₦|\$)?\s*([\d,]+(?:\.\d{2})?)",
        r"you received (?:NGN|USD|EUR|GBP|₦|\$)?\s*([\d,]+(?:\.\d{2})?)",
        r"(?:debit|credit) alert of (?:NGN|USD|EUR|GBP|₦|\$)?\s*([\d,]+(?:\.\d{2})?)",
        r"(?:NGN|USD|EUR|GBP|₦|\$)\s*([\d,]+(?:\.\d{2})?)"
    ]
    
    amount_cents = None
    for pat in amount_patterns:
        match = re.search(pat, clean_text, re.IGNORECASE)
        if match:
            amount_cents = parse_amount_str(match.group(1))
            if amount_cents and amount_cents > 0:
                break
                
    if not amount_cents:
        return None
        
    # Extract Description / Beneficiary / Merchant / Remarks
    desc = None

    # Priority A: Merchant Name
    merchant_match = re.search(r"(?:Merchant\s*Name|Merchant)[:\s\-=]+([^:\n\.,]{2,60})", clean_text, re.IGNORECASE)
    if merchant_match:
        cand = clean_python_description(merchant_match.group(1), subject, sender)
        if cand and not re.search(r"transaction|account|amount|debit|credit|notification|balance", cand, re.IGNORECASE):
            desc = f"Payment to {cand}" if not cand.lower().startswith("payment to") else cand

    # Priority B: Name / Recipient (OPay format)
    if not desc:
        opay_match = re.search(r"Name:\s*([^:\n\.,]{2,50})", clean_text, re.IGNORECASE)
        if opay_match:
            cand = clean_python_description(opay_match.group(1), subject, sender)
            if cand and not re.search(r"transaction|account|amount|debit|credit|notification|balance", cand, re.IGNORECASE):
                desc = f"Transfer to {cand}"

    # Priority C: Explicit Narration / Remarks / Beneficiary / Paid to / Received from
    if not desc:
        field_match = re.search(r"(?:Description|Narration|Remarks|Details|Beneficiary|Paid to|Received from)[:\s\-=]+([^,\.\n]{2,80})", clean_text, re.IGNORECASE)
        if field_match:
            cand = clean_python_description(field_match.group(1), subject, sender)
            if cand:
                desc = cand

    # Priority D: Airtime / Data
    if not desc and re.search(r"\b(?:airtime|recharge|data top-up|data topup|mobile data)\b", clean_text, re.IGNORECASE):
        telco = re.search(r"\b(MTN|Airtel|Glo|9mobile)\b", clean_text, re.IGNORECASE)
        desc = f"{telco.group(1).upper()} Airtime & Data" if telco else "Airtime & Data Top-up"

    # Priority E: Sender Organization (Taxtech, Taxaide, Jobberman, etc.)
    if not desc and sender:
        cleaned_sender = re.sub(r"<[^>]+>", "", sender).replace('"', '').strip()
        if cleaned_sender and not re.search(r"no-reply|noreply|notification|alert|service|info", cleaned_sender, re.IGNORECASE):
            sender_cand = clean_python_description(cleaned_sender, subject, sender)
            if sender_cand:
                if re.search(r"jobberman", sender_cand, re.IGNORECASE):
                    desc = "Jobberman Payment"
                elif re.search(r"taxtech|taxaide", sender_cand, re.IGNORECASE):
                    desc = f"Payment to {sender_cand}"
                else:
                    desc = sender_cand

    # Priority F: Bank fallback
    if not desc:
        bank_name = detect_bank_name(sender, subject, clean_text)
        if re.search(r"\b(?:pos|pos purchase|pos payment)\b", clean_text, re.IGNORECASE):
            desc = f"{bank_name} POS Purchase"
        elif re.search(r"\b(?:atm|atm withdrawal)\b", clean_text, re.IGNORECASE):
            desc = f"{bank_name} ATM Withdrawal"
        else:
            desc = f"{bank_name} Alert" if bank_name != "Bank Alert" else (subject or "Bank Alert")

    combined_desc = f"{desc} {subject} {clean_text}".lower()

    # Check for Savings & Investments platforms (Cowrywise, Piggyvest, Risevest, Stanbic MMF, etc.)
    is_savings = any(s in combined_desc for s in SAVINGS_PATTERNS)
    entry_type = "asset" if is_savings else detect_entry_type(clean_text, subject)
    category = "Savings & Investments" if is_savings else ("Transfers" if "transfer" in combined_desc else "General Expense")
    
    account_bal = extract_account_balance(clean_text)

    return {
        "amount": amount_cents,
        "description": desc,
        "entry_type": entry_type,
        "category": category,
        "account_balance": account_bal,
        "parse_method": "regex_pass1"
    }

# ── PASS 2: BeautifulSoup DOM Table Parser ──────────────────────────────
def parse_html_dom(html_content: str, subject: str, sender: str = "") -> Optional[Dict[str, Any]]:
    if not html_content or len(html_content.strip()) < 50:
        return None
        
    soup = BeautifulSoup(html_content, "lxml")
    plain_text = soup.get_text()
    
    if not is_valid_transaction_email(plain_text, subject, sender):
        return None

    kv_pairs = {}
    
    # Strategy A: <td>Key:</td><td>Value</td> or <th>Key</th><td>Value</td>
    for tr in soup.find_all("tr"):
        cells = tr.find_all(["td", "th"])
        if len(cells) >= 2:
            key = cells[0].get_text(strip=True).replace(":", "").lower()
            val = cells[1].get_text(strip=True)
            if key and val:
                kv_pairs[key] = val
                
    # Check extracted table pairs for amount
    amount_cents = None
    for k, v in kv_pairs.items():
        if any(w in k for w in ["amount", "amt", "sum", "value", "trans amount"]):
            parsed = parse_amount_str(v)
            if parsed and parsed > 0:
                amount_cents = parsed
                break
                
    if not amount_cents:
        return None
        
    # Find best description
    desc = None
    for k in ["merchant name", "merchant", "recipient", "name", "narration", "description", "remarks", "beneficiary", "sender", "paid to", "received from", "details", "to", "from"]:
        if k in kv_pairs:
            cand = clean_python_description(kv_pairs[k], subject, sender)
            if cand:
                if k in ["merchant name", "merchant"]:
                    desc = f"Payment to {cand}" if not cand.lower().startswith("payment to") else cand
                elif k in ["name", "recipient"]:
                    desc = f"Transfer to {cand}"
                else:
                    desc = cand
                break
            
    if not desc:
        cand_regex = parse_with_regex_rules(plain_text, subject, sender)
        if cand_regex:
            desc = cand_regex.get("description")
            
    if not desc:
        bank_name = detect_bank_name(sender, subject, plain_text)
        desc = f"{bank_name} Alert" if bank_name != "Bank Alert" else (subject or "HTML Bank Alert")
        
    entry_type = detect_entry_type(plain_text, subject)
    
    return {
        "amount": amount_cents,
        "description": desc,
        "entry_type": entry_type,
        "kv_extracted": kv_pairs,
        "parse_method": "dom_pass2"
    }

# ── PASS 3: PDF Statement Parser ──────────────────────────────────────────
def parse_pdf_statement(pdf_bytes: bytes) -> List[Dict[str, Any]]:
    results = []
    if not pdf_bytes:
        return results
        
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    if not table or len(table) < 2:
                        continue
                    
                    headers = [str(h).lower() if h else "" for h in table[0]]
                    
                    amount_idx = next((i for i, h in enumerate(headers) if any(w in h for w in ["amount", "val", "debit", "credit"])), -1)
                    desc_idx = next((i for i, h in enumerate(headers) if any(w in h for w in ["narration", "description", "details", "particulars"])), -1)
                    date_idx = next((i for i, h in enumerate(headers) if any(w in h for w in ["date", "txn date", "post date"])), -1)
                    
                    for row in table[1:]:
                        if not row or len(row) <= max(amount_idx, desc_idx, 0):
                            continue
                        
                        raw_amt = row[amount_idx] if amount_idx >= 0 and amount_idx < len(row) else ""
                        amt_cents = parse_amount_str(str(raw_amt))
                        
                        if amt_cents and amt_cents > 0:
                            raw_desc = str(row[desc_idx]) if desc_idx >= 0 and desc_idx < len(row) else "PDF Statement Entry"
                            raw_date = str(row[date_idx]) if date_idx >= 0 and date_idx < len(row) else ""
                            
                            entry_type = "expense"
                            if "credit" in str(raw_amt).lower() or "inflow" in str(raw_amt).lower():
                                entry_type = "income"
                                
                            results.append({
                                "amount": amt_cents,
                                "description": raw_desc.strip(),
                                "entry_type": entry_type,
                                "date_raw": raw_date.strip(),
                                "parse_method": "pdf_pass3"
                            })
    except Exception as e:
        print(f"[Parser] Error parsing PDF statement: {e}")
        
    return results
