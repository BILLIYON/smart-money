import io
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from bs4 import BeautifulSoup
import pdfplumber

def parse_amount_str(raw_val: str) -> Optional[int]:
    """
    Parses currency string like 'NGN 15,500.50', '₦1,200', '1500.00' into integer cents (e.g. 1550050).
    """
    if not raw_val:
        return None
    # Remove currency symbols and non-numeric chars except digits and dot
    clean = re.sub(r"[^\d.]", "", raw_val)
    if not clean:
        return None
    try:
        val = float(clean)
        return int(round(val * 100))
    except ValueError:
        return None

def detect_entry_type(text: str, subject: str = "") -> str:
    combined = f"{subject} {text}".lower()
    if any(k in combined for k in ["credit", "received", "payment received", "top-up", "inflow", "deposit"]):
        if not any(k in combined for k in ["debit alert", "debited", "spent", "outflow", "withdrawal"]):
            return "income"
    if any(k in combined for k in ["debit", "sent", "paid", "spent", "purchase", "withdrawal", "outflow", "airtime"]):
        return "expense"
    if "credit" in combined:
        return "income"
    return "expense"

def detect_bank_name(sender: str, subject: str, text: str) -> str:
    combined = f"{sender} {subject} {text}".lower()
    if "opay" in combined:
        return "OPay"
    if "kuda" in combined:
        return "Kuda Bank"
    if "palmpay" in combined:
        return "PalmPay"
    if "moniepoint" in combined:
        return "Moniepoint"
    if "gtbank" in combined or "gtb" in combined:
        return "GTBank"
    if "zenith" in combined:
        return "Zenith Bank"
    if "access" in combined:
        return "Access Bank"
    if "uba" in combined or "united bank for africa" in combined:
        return "UBA"
    if "firstbank" in combined or "first bank" in combined:
        return "FirstBank"
    if "stanbic" in combined:
        return "Stanbic IBTC"
    if "fcmb" in combined:
        return "FCMB"
    if "sterling" in combined:
        return "Sterling Bank"
    if "wema" in combined or "alat" in combined:
        return "Wema / ALAT"
    if "flutterwave" in combined:
        return "Flutterwave"
    if "paystack" in combined:
        return "Paystack"
    return "Bank Alert"

# ── PASS 1: Regex & Key-Value Rule Parser ────────────────────────────────
def parse_with_regex_rules(text: str, subject: str) -> Optional[Dict[str, Any]]:
    clean_text = re.sub(r"\s+", " ", text)
    
    # Common Patterns for Amount
    amount_patterns = [
        r"(?:Amount|Amt|SUM|Value):\s*(?:NGN|USD|EUR|GBP|₦|\$)?\s*([\d,]+(?:\.\d{2})?)",
        r"(?:NGN|USD|EUR|GBP|₦|\$)\s*([\d,]+(?:\.\d{2})?)",
        r"credited with (?:NGN|USD|EUR|GBP|₦|\$)?\s*([\d,]+(?:\.\d{2})?)",
        r"debited with (?:NGN|USD|EUR|GBP|₦|\$)?\s*([\d,]+(?:\.\d{2})?)"
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
        
    # Extract Description / Beneficiary / Remarks
    desc = ""
    desc_match = re.search(
        r"(?:Description|Narration|Remarks|Details|Beneficiary|To|From|Paid to):\s*([^.\n\r]{3,80})",
        clean_text, 
        re.IGNORECASE
    )
    if desc_match:
        desc = desc_match.group(1).strip()
    else:
        desc = subject if subject else "Bank Transaction Alert"
        
    entry_type = detect_entry_type(clean_text, subject)
    
    return {
        "amount": amount_cents,
        "description": desc,
        "entry_type": entry_type,
        "parse_method": "regex_pass1"
    }

# ── PASS 2: BeautifulSoup DOM Table Parser ──────────────────────────────
def parse_html_dom(html_content: str, subject: str) -> Optional[Dict[str, Any]]:
    if not html_content or len(html_content.strip()) < 50:
        return None
        
    soup = BeautifulSoup(html_content, "lxml")
    
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
        # Strategy B: Search inside styled <div>/<span> pills or bold tags
        for b_tag in soup.find_all(["b", "strong", "span"]):
            txt = b_tag.get_text(strip=True)
            if re.match(r"^(?:NGN|USD|EUR|GBP|₦|\$)\s*[\d,]+(?:\.\d{2})?$", txt, re.IGNORECASE):
                amount_cents = parse_amount_str(txt)
                if amount_cents:
                    break
                    
    if not amount_cents:
        return None
        
    # Find best description
    desc = ""
    for k in ["narration", "description", "remarks", "beneficiary", "sender", "details", "to", "from"]:
        if k in kv_pairs:
            desc = kv_pairs[k]
            break
            
    if not desc:
        desc = subject or "HTML Bank Alert"
        
    entry_type = detect_entry_type(soup.get_text(), subject)
    
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
                    
                    # Assume row 0 is headers
                    headers = [str(h).lower() if h else "" for h in table[0]]
                    
                    # Look for column indices for date, description, amount, type
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
