import json
import os
from typing import Any, Dict, List, Optional
import psycopg
from psycopg.rows import dict_row

from .crypto import decrypt, encrypt

DEFAULT_DB_URL = "postgresql://postgres@127.0.0.1:5432/smart_money"

def get_db_url() -> str:
    return os.getenv("DATABASE_URL", DEFAULT_DB_URL)

def get_user_gmail_integration(user_id: str) -> Optional[Dict[str, Any]]:
    db_url = get_db_url()
    with psycopg.connect(db_url, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT access_token, refresh_token, token_expiry, metadata
                FROM user_integrations
                WHERE user_id = %s AND provider = 'gmail'
                LIMIT 1;
                """,
                (user_id,)
            )
            row = cur.fetchone()
            if not row:
                return None
            
            acc_token = decrypt(row["access_token"]) if row.get("access_token") else None
            ref_token = decrypt(row["refresh_token"]) if row.get("refresh_token") else None
            
            return {
                "access_token": acc_token,
                "refresh_token": ref_token,
                "token_expiry": row.get("token_expiry"),
                "metadata": row.get("metadata") or {}
            }

def update_user_tokens(user_id: str, access_token: str, refresh_token: Optional[str] = None, token_expiry: Optional[str] = None):
    db_url = get_db_url()
    enc_access = encrypt(access_token) if access_token else None
    enc_refresh = encrypt(refresh_token) if refresh_token else None
    
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            if enc_refresh:
                cur.execute(
                    """
                    UPDATE user_integrations
                    SET access_token = %s, refresh_token = %s, token_expiry = COALESCE(%s, token_expiry)
                    WHERE user_id = %s AND provider = 'gmail';
                    """,
                    (enc_access, enc_refresh, token_expiry, user_id)
                )
            else:
                cur.execute(
                    """
                    UPDATE user_integrations
                    SET access_token = %s, token_expiry = COALESCE(%s, token_expiry)
                    WHERE user_id = %s AND provider = 'gmail';
                    """,
                    (enc_access, token_expiry, user_id)
                )
            conn.commit()

def update_sync_progress(user_id: str, progress: float, message: str, is_syncing: bool = True):
    db_url = get_db_url()
    with psycopg.connect(db_url, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT metadata FROM user_integrations WHERE user_id = %s AND provider = 'gmail' LIMIT 1;",
                (user_id,)
            )
            row = cur.fetchone()
            existing_meta = (row.get("metadata") if row else {}) or {}
            
            updated_meta = {
                **existing_meta,
                "is_syncing": is_syncing,
                "sync_progress": round(progress, 1),
                "sync_message": message,
                "sync_updated_at": psycopg.sql.SQL("NOW()"),
                "last_synced_at": psycopg.sql.SQL("NOW()") if not is_syncing else existing_meta.get("last_synced_at")
            }
            
            cur.execute(
                """
                UPDATE user_integrations
                SET metadata = %s
                WHERE user_id = %s AND provider = 'gmail';
                """,
                (json.dumps(updated_meta, default=str), user_id)
            )
            conn.commit()

def save_databank_entries(user_id: str, entries: List[Dict[str, Any]]) -> int:
    if not entries:
        return 0
    
    db_url = get_db_url()
    inserted_count = 0
    
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            for entry in entries:
                try:
                    with conn.transaction():
                        msg_id = entry.get("gmail_message_id")
                        if isinstance(msg_id, str):
                            msg_id = msg_id.strip() or None

                        meta = entry.get("metadata") or {}
                        if msg_id:
                            meta["gmail_message_id"] = msg_id
                        
                        # Check for existing entry by gmail_message_id column or metadata
                        if msg_id:
                            cur.execute(
                                """
                                SELECT id, description FROM databank_entries 
                                WHERE user_id = %s AND (gmail_message_id = %s OR metadata->>'gmail_message_id' = %s)
                                LIMIT 1;
                                """,
                                (user_id, msg_id, msg_id)
                            )
                            existing = cur.fetchone()
                            if existing:
                                # Update existing entry with clean description, category, entry_date, amount, metadata, and ensure gmail_message_id column is set
                                cur.execute(
                                    """
                                    UPDATE databank_entries
                                    SET entry_type = %s,
                                        amount = %s,
                                        description = %s,
                                        category = %s,
                                        entry_date = %s,
                                        metadata = %s,
                                        gmail_message_id = %s
                                    WHERE id = %s;
                                    """,
                                    (
                                        entry.get("entry_type", "expense"),
                                        entry.get("amount", 0),
                                        entry.get("description", "Bank Transaction"),
                                        entry.get("category", "Uncategorized"),
                                        entry.get("entry_date"),
                                        json.dumps(meta, default=str),
                                        msg_id,
                                        existing["id"] if isinstance(existing, dict) else existing[0]
                                    )
                                )
                                continue

                        cur.execute(
                            """
                            INSERT INTO databank_entries (
                                user_id, source, entry_type, amount, description, category, entry_date, metadata, gmail_message_id
                            ) VALUES (
                                %s, %s, %s, %s, %s, %s, %s, %s, %s
                            ) RETURNING id;
                            """,
                            (
                                user_id,
                                entry.get("source") if entry.get("source") in ["upload", "gmail", "manual", "openbanking"] else "gmail",
                                entry.get("entry_type", "expense"),
                                entry.get("amount", 0),  # stored in cents
                                entry.get("description", "Bank Transaction"),
                                entry.get("category", "Uncategorized"),
                                entry.get("entry_date"),
                                json.dumps(meta, default=str),
                                msg_id
                            )
                        )
                        inserted_count += 1
                except Exception as row_err:
                    print(f"[DB] Error saving row entry: {row_err}")
                    continue
            conn.commit()
            
    return inserted_count
