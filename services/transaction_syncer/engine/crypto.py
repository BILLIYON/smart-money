import base64
import hashlib
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

DEFAULT_KEY_RAW = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

def get_encryption_key(raw_key: str = None) -> bytes:
    key_str = raw_key or os.getenv("ENCRYPTION_KEY", DEFAULT_KEY_RAW)
    return hashlib.sha256(key_str.encode("utf-8")).digest()

def decrypt(stored: str, raw_key: str = None) -> str:
    if not stored:
        return ""
    parts = stored.split(":")
    if len(parts) != 3:
        # Unencrypted plaintext or fallback
        return stored
    
    iv_b64, tag_b64, enc_b64 = parts
    try:
        iv = base64.b64decode(iv_b64)
        tag = base64.b64decode(tag_b64)
        ciphertext = base64.b64decode(enc_b64)

        # In Python cryptography AESGCM, payload is ciphertext + tag
        data_to_decrypt = ciphertext + tag
        
        key = get_encryption_key(raw_key)
        try:
            aesgcm = AESGCM(key)
            return aesgcm.decrypt(iv, data_to_decrypt, None).decode("utf-8")
        except Exception:
            try:
                fallback_key = get_encryption_key(DEFAULT_KEY_RAW)
                aesgcm_fb = AESGCM(fallback_key)
                return aesgcm_fb.decrypt(iv, data_to_decrypt, None).decode("utf-8")
            except Exception:
                return stored
    except Exception:
        return stored

def encrypt(plaintext: str, raw_key: str = None) -> str:
    key = get_encryption_key(raw_key)
    aesgcm = AESGCM(key)
    iv = os.urandom(16)
    encrypted_payload = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)
    ciphertext = encrypted_payload[:-16]
    tag = encrypted_payload[-16:]
    
    iv_b64 = base64.b64encode(iv).decode("utf-8")
    tag_b64 = base64.b64encode(tag).decode("utf-8")
    enc_b64 = base64.b64encode(ciphertext).decode("utf-8")
    return f"{iv_b64}:{tag_b64}:{enc_b64}"
