const crypto = require("crypto");

const ALGO = "aes-256-gcm";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const KEY = Buffer.from(ENCRYPTION_KEY, "hex");

function encrypt(plaintext) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((b) => b.toString("base64")).join(":");
}

function decrypt(stored) {
  const [ivB64, tagB64, encB64] = stored.split(":");
  const iv        = Buffer.from(ivB64,  "base64");
  const tag       = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(encB64, "base64");
  const decipher  = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

console.log("Testing crypto fallback...");
const text = "hello-world-test";
const encrypted = encrypt(text);
console.log("Encrypted:", encrypted);
const decrypted = decrypt(encrypted);
console.log("Decrypted:", decrypted);
if (decrypted === text) {
  console.log("SUCCESS!");
} else {
  console.error("FAILED!");
  process.exit(1);
}
