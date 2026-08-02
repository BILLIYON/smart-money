// Uses Node.js built-in crypto — no extra dependency needed
import crypto from "crypto";

const ALGO = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const rawKey = process.env.ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  // SHA-256 hash guarantees an exact 32-byte (256-bit) buffer regardless of rawKey length or format
  return crypto.createHash("sha256").update(rawKey).digest();
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // Store iv:tag:ciphertext as base64
  return [iv, tag, encrypted].map((b) => b.toString("base64")).join(":");
}

export function decrypt(stored: string): string {
  const [ivB64, tagB64, encB64] = stored.split(":");
  if (!ivB64 || !tagB64 || !encB64) {
    throw new Error("DECRYPTION_FAILED: Invalid stored format");
  }
  const iv        = Buffer.from(ivB64,  "base64");
  const tag       = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(encB64, "base64");

  try {
    const key = getEncryptionKey();
    const decipher  = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final("utf8");
  } catch (err) {
    try {
      // Fallback to default dev key if primary decryption fails
      const fallbackRaw = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
      const fallbackKey = crypto.createHash("sha256").update(fallbackRaw).digest();
      const decipher  = crypto.createDecipheriv(ALGO, fallbackKey, iv);
      decipher.setAuthTag(tag);
      return decipher.update(encrypted) + decipher.final("utf8");
    } catch (fallbackErr) {
      throw new Error("DECRYPTION_FAILED: Decryption key mismatch");
    }
  }
}
