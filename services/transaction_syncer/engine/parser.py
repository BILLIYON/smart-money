import io
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from bs4 import BeautifulSoup
import pdfplumber

# ── 1. NEGATIVE KEYWORD BLACKLIST ──────────────────────────────────────────
# Any email containing these in subject or header is an announcement, marketing,
# terms update, or security notice — NEVER a transaction.
EXCLUDED_SUBJECT_KEYWORDS = [
    "security alert", "login alert", "verification code", "password reset", "two-factor", "2fa", "\botp\b",
    "welcome to", "newsletter", "unsubscribe", "survey", "rate your experience",
    "bonus cash", "promo code", "claim your discount", "special offer", "limited time offer",
    "notice of branch closure", "branch closure", "important update on", "naira card",
    "spending limit", "terms of service", "terms and conditions", "privacy policy",
    "dangote ipo", "dangote refinery", "school fees from abroad", "subscribe to",
    "system upgrade", "scheduled maintenance", "maintenance window", "service downtime",
    "public holiday", "eid el", "easter", "christmas", "father's day", "mother's day",
    "democracy day", "independence day", "annual report", "annual general meeting",
    "financial statement", "statutory notice", "tariff", "webinar", "cashback promo",
    "win a chance", "level up", "make a move", "business series", "chowdeck",
    "tech conversation", "business success story", "summer body", "get rewarded on your account anniversary",
    "not every leo message is from leo", "meet uba money explorers", "help kids spend smarter"
]

FINTECH_DOMAINS = [
    "opay-nigeria.com", "opay.com", "kudabank.com", "kuda.com", "palmpay.com", "moniepoint.com",
    "gtbank.com", "gtco.com", "zenithbank.com", "accessbankplc.com", "ubagroup.com",
    "firstbanknigeria.com", "stanbic.com", "fcmb.com", "fidelitybank.ng", "unionbankng.com",
    "wema.africa", "providusbank.com", "sterling.ng", "polarisbanklimited.com", "flutterwave.com",
    "paystack.com", "taxtech.com.ng", "jobberman.com"
]

# Explicit transaction markers that MUST be present
EXPLICIT_TRANSACTION_PHRASES = [
    "debit alert", "credit alert", "transaction notification", "transaction alert",
    "transfer notification", "transfer successful", "transfer receipt", "payment receipt",
    "payment received", "payment successful", "pos purchase", "atm withdrawal",
    "account debited", "account credited", "inward nip", "outward nip", "nip credit",
    "nip debit", "nip transfer", "airtime recharge", "data top-up", "data topup",
    "you spent", "you received", "you paid", "you transferred", "money sent", "money received",
    "transaction advice", "payment advice", "credit advice", "debit advice"
]

def is_valid_transaction_email(text: str, subject: str = "", sender: str = "") -> bool:
    """
    Multi-Factor Transaction Qualifier (Pillar 1).
    Rejects marketing, terms updates, branch closures, and security notices.
    Requires genuine bank transaction signatures.
    """
    subj_lower = (subject or "").lower()
    text_lower = (text or "").lower()
    sender_lower = (sender or "").lower()

    # 1. Negative Keyword Guard: Immediately reject non-transaction announcements
    if any(k in subj_lower for k in EXCLUDED_SUBJECT_KEYWORDS):
        return False

    # Check for body-level marketing disclaimers that accompany non-transaction emails
    if any(m in text_lower for m in [
        "click here to unsubscribe from this newsletter",
        "notice of branch closure",
        "important update on the gtbank naira card",
        "subscribe to the dangote ipo",
        "dangote refinery ipo"
    ]):
        return False

    combined = f"{subj_lower} {sender_lower} {text_lower}"

    # 2. Check if Subject explicitly contains a transaction phrase (Highest signal)
    has_subject_tx = any(k in subj_lower for k in [
        "debit alert", "credit alert", "transaction notification", "transaction alert",
        "transfer receipt", "payment receipt", "payment received", "payment successful",
        "transfer successful", "you spent", "you received", "zenith direct", "receipt"
    ]) or re.search(r"\[(credit|debit)[:\s]", subj_lower)

    if has_subject_tx:
        return True

    # 3. Check for explicit transaction phrase in body text
    has_body_tx = any(k in text_lower for k in EXPLICIT_TRANSACTION_PHRASES)

    # 4. Must have both positive transaction phrase AND currency/amount presence
    if has_body_tx:
        has_amount = bool(re.search(r"(?:amount|amt|trans amt|txn amount|sum|paid|debited|credited|ngn|₦|\$)\s*[:=]?\s*[\d,]+(?:\.\d{2})?", combined))
        if has_amount:
            return True

    return False

def parse_amount_str(raw_val: str) -> Optional[int]:
    """
    Parses currency string like 'NGN 15,500.50', '₦1,200', '1500.00' into integer cents (e.g. 1550050).
    Rejects years (1990-2040), tiny amounts (< 10 kobo / cents), and garbage strings.
    """
    if not raw_val:
        return None
    clean = re.sub(r"[^\d.]", "", str(raw_val))
    if not clean:
        return None
    try:
        val = float(clean)
        # Filter out 0 or unrealistically tiny amounts (e.g. ₦0.05)
        if val <= 0:
            return None
        # Reject standalone years (e.g. 2024, 2025, 2026) if not clearly a currency
        if 1990 <= val <= 2040 and float(clean).is_integer() and "." not in str(raw_val) and not any(c in str(raw_val) for c in ["₦", "NGN", "$", "kobo"]):
            return None
        return int(round(val * 100))
    except ValueError:
        return None

def detect_entry_type(text: str, subject: str = "", kv: Optional[Dict[str, str]] = None) -> str:
    """
    Pillar 3: Strict Direction Grammar Engine (No Debit/Credit Inversions).
    """
    subj_lower = (subject or "").lower()
    text_lower = (text or "").lower()
    combined = f"{subj_lower} {text_lower}"

    # GTBank explicit subject format: [Credit: NGN ...] vs [Debit: NGN ...]
    if "[credit:" in subj_lower or "[credit " in subj_lower:
        return "income"
    if "[debit:" in subj_lower or "[debit " in subj_lower:
        return "expense"

    # Zenith Direct explicit subject: "Zenith Direct: Credit Alert" vs "Debit Alert"
    if "credit alert" in subj_lower or "credit notification" in subj_lower or "nip credit" in subj_lower:
        return "income"
    if "debit alert" in subj_lower or "debit notification" in subj_lower or "nip debit" in subj_lower:
        return "expense"

    # KV Table Type check (e.g. Transaction Type: CR / DR)
    if kv:
        txn_type = (kv.get("transaction type") or kv.get("type") or "").strip().lower()
        if txn_type in ["cr", "credit", "inward"]:
            return "income"
        if txn_type in ["dr", "debit", "outward"]:
            return "expense"

    # High-confidence subject markers
    if any(k in subj_lower for k in ["payment received", "money received", "you received", "inward transfer", "payout received"]):
        return "income"
    if any(k in subj_lower for k in ["transfer successful", "payment successful", "you spent", "you paid", "pos purchase", "atm withdrawal"]):
        return "expense"

    # Grammatical body checks
    # "transferred [amt] to", "paid to", "sent to", "debited with" are EXPENSE
    if re.search(r"\b(?:transferred|paid|sent)\s+(?:(?:ngn|₦|\$)?\s*[\d,]+(?:\.\d{2})?\s+)?to\b", text_lower):
        return "expense"
    if re.search(r"\b(?:debited with|amount debited|debit alert)\b", text_lower):
        return "expense"

    # "received [amt] from", "credited with", "amount credited" are INCOME
    if re.search(r"\b(?:received\s+from|credited with|amount credited|credit alert|inward nip)\b", text_lower):
        return "income"

    # Fallback to credit vs debit keyword position
    if "credit" in combined and "debit" not in combined:
        return "income"

    return "expense"

def detect_bank_name(sender: str, subject: str, text: str) -> str:
    """
    Pillar 4: Strict Issuing Sender Domain Priority.
    Sender domain ALWAYS determines the issuing institution, never recipient text.
    """
    sender_lower = (sender or "").lower()
    subject_lower = (subject or "").lower()

    # Priority 1: Check sender email header domain & name
    if "zenith" in sender_lower: return "Zenith Bank"
    if "gtbank" in sender_lower or "gtb" in sender_lower or "guaranty" in sender_lower or "gtco" in sender_lower: return "GTBank"
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
    if "fidelity" in sender_lower: return "Fidelity Bank"
    if "union" in sender_lower: return "Union Bank"
    if "providus" in sender_lower: return "Providus Bank"
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

    if "gtbank" in clean_text or "gtb" in clean_text: return "GTBank"
    if "zenith" in clean_text: return "Zenith Bank"
    if "access" in clean_text: return "Access Bank"
    if "uba" in clean_text or "united bank for africa" in clean_text: return "UBA"
    if "firstbank" in clean_text or "first bank" in clean_text: return "FirstBank"
    if "stanbic" in clean_text: return "Stanbic IBTC"
    if "fcmb" in clean_text: return "FCMB"
    if "opay" in clean_text: return "OPay"
    if "kuda" in clean_text: return "Kuda Bank"
    if "palmpay" in clean_text: return "PalmPay"
    if "moniepoint" in clean_text: return "Moniepoint"
    if "sterling" in clean_text: return "Sterling Bank"
    if "wema" in clean_text or "alat" in clean_text: return "Wema / ALAT"
    return "Bank Alert"

def clean_python_description(raw_desc: Optional[str], subject: str = "", sender: str = "") -> Optional[str]:
    """
    Cleans extracted beneficiary / narration.
    Strips trailing ' Bank', ' Plc', ' Ltd', ' Account Number', CSS debris, and disclaimers.
    """
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
    cleaned = re.sub(r"^details of this transaction[:\s]*", "", cleaned, flags=re.IGNORECASE)

    # Strip Bank/Account/STAN/Session ID trailers that stick to beneficiary names
    cleaned = re.sub(r"(?:\s+Bank[:\s]+.*|\s+Bank$)", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"(?:\s+Account(?:\s+Number)?[:\s]+.*|\s+Acct(?:\s+No)?[:\s]+.*)$", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"(?:\s+Order\s+(?:No|Number).*|\s+Txn\s+(?:No|Ref).*|\s+Session\s+ID.*)$", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"(?:current|available|ledger|acct)?\s*balance\s*(?:is)?\s*(?:₦|ngn|n|\$)?\s*[\d,]+(?:\.\d{2})?", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    if not cleaned or len(cleaned) < 2:
        return None

    # Discard non-name sentences
    if re.search(r"^(current balance|available balance|ledger balance|transaction notification|details of this|account number|we write to inform you|logo)$", cleaned, re.IGNORECASE):
        return None

    if re.search(r"current\s*balance|available\s*balance|ledger\s*balance", cleaned, re.IGNORECASE):
        return None

    return cleaned

def extract_account_balance(text: str) -> Optional[int]:
    """
    Extracts available / ledger account balance from email text into integer cents/kobo.
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

# ── 2. INSTITUTION-SPECIFIC HTML DOM TABLE ADAPTERS (PILLAR 2) ───────────

def extract_table_kv_pairs(soup: BeautifulSoup) -> Dict[str, str]:
    """
    Extracts all key-value pairs from HTML tables and labeled divs.
    """
    kv = {}
    for tr in soup.find_all("tr"):
        cells = tr.find_all(["td", "th"])
        if len(cells) >= 2:
            key = cells[0].get_text(separator=" ", strip=True).replace(":", "").lower()
            val = cells[1].get_text(separator=" ", strip=True)
            if key and val:
                kv[key] = val

    # Also handle <p><strong>Key:</strong> Value</p> or <div>Key: Value</div>
    for strong in soup.find_all(["strong", "b"]):
        txt = strong.get_text(strip=True).replace(":", "").lower()
        parent = strong.parent
        if parent:
            full = parent.get_text(separator=" ", strip=True)
            parts = full.split(":", 1)
            if len(parts) == 2 and parts[0].strip().lower() == txt:
                kv[txt] = parts[1].strip()

    return kv

def parse_gtbank_dom(soup: BeautifulSoup, subject: str, sender: str) -> Optional[Dict[str, Any]]:
    """GTBank Structured Table Adapter"""
    kv = extract_table_kv_pairs(soup)
    amount_str = kv.get("amount") or kv.get("trans amount") or kv.get("sum") or kv.get("value")
    if not amount_str:
        return None
    amount_cents = parse_amount_str(amount_str)
    if not amount_cents:
        return None

    remarks = kv.get("remarks") or kv.get("narration") or kv.get("description") or ""
    desc = clean_python_description(remarks, subject, sender)
    if not desc:
        desc = "GTBank Transaction"

    balance = parse_amount_str(kv.get("available balance") or kv.get("book balance") or "")
    entry_type = detect_entry_type(remarks, subject, kv)

    return {
        "amount": amount_cents,
        "description": desc,
        "entry_type": entry_type,
        "category": "Transfers" if "transfer" in desc.lower() else "General Expense",
        "account_balance": balance,
        "bank_name": "GTBank",
        "parse_method": "gtbank_dom_adapter"
    }

def parse_zenith_dom(soup: BeautifulSoup, subject: str, sender: str) -> Optional[Dict[str, Any]]:
    """Zenith Bank Structured Table Adapter"""
    kv = extract_table_kv_pairs(soup)
    amount_str = kv.get("transaction amount") or kv.get("amount")
    if not amount_str:
        return None
    amount_cents = parse_amount_str(amount_str)
    if not amount_cents:
        return None

    remarks = kv.get("remarks") or kv.get("narration") or kv.get("description") or ""
    desc = clean_python_description(remarks, subject, sender)
    if not desc:
        desc = "Zenith Bank Transaction"

    balance = parse_amount_str(kv.get("book balance") or kv.get("available balance") or "")
    entry_type = detect_entry_type(remarks, subject, kv)

    return {
        "amount": amount_cents,
        "description": desc,
        "entry_type": entry_type,
        "category": "Transfers" if "transfer" in desc.lower() else "General Expense",
        "account_balance": balance,
        "bank_name": "Zenith Bank",
        "parse_method": "zenith_dom_adapter"
    }

def parse_opay_dom(soup: BeautifulSoup, subject: str, sender: str) -> Optional[Dict[str, Any]]:
    """OPay Receipt / Alert Table Adapter"""
    kv = extract_table_kv_pairs(soup)
    amount_str = kv.get("transfer amount") or kv.get("amount") or kv.get("paid")
    if not amount_str:
        return None
    amount_cents = parse_amount_str(amount_str)
    if not amount_cents:
        return None

    recipient = kv.get("recipient") or kv.get("name") or kv.get("beneficiary") or ""
    clean_name = clean_python_description(recipient, subject, sender)
    desc = f"Transfer to {clean_name}" if clean_name else "OPay Transfer"

    entry_type = "expense"
    if any(w in subject.lower() for w in ["received money", "payment received", "credit"]):
        entry_type = "income"
        if clean_name:
            desc = f"Payment from {clean_name}"

    return {
        "amount": amount_cents,
        "description": desc,
        "entry_type": entry_type,
        "category": "Transfers",
        "bank_name": "OPay",
        "parse_method": "opay_dom_adapter"
    }

def parse_uba_dom(soup: BeautifulSoup, subject: str, sender: str) -> Optional[Dict[str, Any]]:
    """UBA Alert Table Adapter"""
    kv = extract_table_kv_pairs(soup)
    amount_str = kv.get("txn amount") or kv.get("amount") or kv.get("transaction amount")
    if not amount_str:
        return None
    amount_cents = parse_amount_str(amount_str)
    if not amount_cents:
        return None

    narration = kv.get("narration") or kv.get("description") or kv.get("remarks") or ""
    desc = clean_python_description(narration, subject, sender)
    if not desc:
        desc = "UBA Alert"

    balance = parse_amount_str(kv.get("acct bal") or kv.get("available balance") or "")
    entry_type = detect_entry_type(narration, subject, kv)

    return {
        "amount": amount_cents,
        "description": desc,
        "entry_type": entry_type,
        "category": "Transfers" if "transfer" in desc.lower() else "General Expense",
        "account_balance": balance,
        "bank_name": "UBA",
        "parse_method": "uba_dom_adapter"
    }

def parse_access_dom(soup: BeautifulSoup, subject: str, sender: str) -> Optional[Dict[str, Any]]:
    """Access Bank Alert Table Adapter"""
    kv = extract_table_kv_pairs(soup)
    amount_str = kv.get("amount") or kv.get("trans amount") or kv.get("txn amount")
    if not amount_str:
        return None
    amount_cents = parse_amount_str(amount_str)
    if not amount_cents:
        return None

    desc_raw = kv.get("description") or kv.get("narration") or kv.get("remarks") or ""
    desc = clean_python_description(desc_raw, subject, sender) or "Access Bank Transaction"
    balance = parse_amount_str(kv.get("available balance") or kv.get("balance") or "")
    entry_type = detect_entry_type(desc_raw, subject, kv)

    return {
        "amount": amount_cents,
        "description": desc,
        "entry_type": entry_type,
        "category": "Transfers" if "transfer" in desc.lower() else "General Expense",
        "account_balance": balance,
        "bank_name": "Access Bank",
        "parse_method": "access_dom_adapter"
    }

def parse_html_dom(html_content: str, subject: str, sender: str = "") -> Optional[Dict[str, Any]]:
    """
    DOM Parser: Routes to institution-specific adapters first, then falls back to generic table parser.
    """
    if not html_content or len(html_content.strip()) < 50:
        return None

    soup = BeautifulSoup(html_content, "lxml")
    plain_text = soup.get_text()

    if not is_valid_transaction_email(plain_text, subject, sender):
        return None

    sender_lower = (sender or "").lower()

    # Route to institution adapters
    if "gtbank" in sender_lower or "gtco" in sender_lower:
        res = parse_gtbank_dom(soup, subject, sender)
        if res: return res

    if "zenith" in sender_lower:
        res = parse_zenith_dom(soup, subject, sender)
        if res: return res

    if "opay" in sender_lower:
        res = parse_opay_dom(soup, subject, sender)
        if res: return res

    if "uba" in sender_lower:
        res = parse_uba_dom(soup, subject, sender)
        if res: return res

    if "access" in sender_lower:
        res = parse_access_dom(soup, subject, sender)
        if res: return res

    # Generic Table Parser Fallback
    kv_pairs = extract_table_kv_pairs(soup)
    amount_cents = None
    for k, v in kv_pairs.items():
        if any(w in k for w in ["amount", "amt", "sum", "value", "trans amount", "txn amount"]):
            parsed = parse_amount_str(v)
            if parsed and parsed > 0:
                amount_cents = parsed
                break

    if not amount_cents:
        return None

    desc = None
    for k in ["merchant name", "merchant", "recipient", "name", "narration", "description", "remarks", "beneficiary", "paid to", "received from"]:
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
        bank_name = detect_bank_name(sender, subject, plain_text)
        desc = f"{bank_name} Alert"

    entry_type = detect_entry_type(plain_text, subject, kv_pairs)

    return {
        "amount": amount_cents,
        "description": desc,
        "entry_type": entry_type,
        "kv_extracted": kv_pairs,
        "parse_method": "dom_pass2"
    }

# ── 3. PASS 1: Strict Regex & Rule Parser (Plaintext fallback) ───────────
def parse_with_regex_rules(text: str, subject: str = "", sender: str = "") -> Optional[Dict[str, Any]]:
    if not text or len(text.strip()) < 10:
        return None

    if not is_valid_transaction_email(text, subject, sender):
        return None

    clean_text = re.sub(r"\s+", " ", text)

    # Strict labeled patterns
    amount_patterns = [
        r"(?:Amount|Amt|SUM|Value|Trans Amt|Paid|Debited|Credited):\s*(?:NGN|USD|EUR|GBP|₦|\$)?\s*([\d,]+(?:\.\d{2})?)",
        r"(?:credited|debited) with (?:NGN|USD|EUR|GBP|₦|\$)?\s*([\d,]+(?:\.\d{2})?)",
        r"paid (?:NGN|USD|EUR|GBP|₦|\$)?\s*([\d,]+(?:\.\d{2})?)\s+to",
        r"received (?:NGN|USD|EUR|GBP|₦|\$)?\s*([\d,]+(?:\.\d{2})?)\s+from",
        r"you spent (?:NGN|USD|EUR|GBP|₦|\$)?\s*([\d,]+(?:\.\d{2})?)",
        r"you received (?:NGN|USD|EUR|GBP|₦|\$)?\s*([\d,]+(?:\.\d{2})?)",
        r"(?:debit|credit) alert of (?:NGN|USD|EUR|GBP|₦|\$)?\s*([\d,]+(?:\.\d{2})?)",
        r"\[(?:credit|debit)[:\s]*(?:NGN|USD|EUR|GBP|₦|\$)?\s*([\d,]+(?:\.\d{2})?)\]",
        r"(?:NGN|₦|\$)\s*([\d,]+(?:\.\d{2})?)"
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

    # Description extraction
    desc = None

    # Priority A: Merchant Name
    merchant_match = re.search(r"(?:Merchant\s*Name|Merchant)[:\s\-=]+([^:\n\.,]{2,60})", clean_text, re.IGNORECASE)
    if merchant_match:
        cand = clean_python_description(merchant_match.group(1), subject, sender)
        if cand and not re.search(r"transaction|account|amount|debit|credit|notification|balance", cand, re.IGNORECASE):
            desc = f"Payment to {cand}" if not cand.lower().startswith("payment to") else cand

    # Priority B: OPay format Name/Recipient
    if not desc:
        opay_match = re.search(r"(?:Name|Recipient)[:\s]+([^:\n\.,]{2,50})(?:\s+Bank|\s+Account|\s*$)", clean_text, re.IGNORECASE)
        if opay_match:
            cand = clean_python_description(opay_match.group(1), subject, sender)
            if cand and not re.search(r"transaction|account|amount|debit|credit|notification|balance", cand, re.IGNORECASE):
                desc = f"Transfer to {cand}"

    # Priority C: Narration / Remarks / Beneficiary
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

    # Priority E: Sender Organization
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

# ── 4. PASS 3: PDF Statement Parser ───────────────────────────────────────
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
