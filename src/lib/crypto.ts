// Uses Node.js built-in crypto — no extra dependency needed
import crypto from "crypto";

const ALGO = "aes-256-gcm";
// Add to .env.local: ENCRYPTION_KEY=<run: openssl rand -hex 32>
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
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
  const iv        = Buffer.from(ivB64,  "base64");
  const tag       = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(encB64, "base64");
  const decipher  = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
