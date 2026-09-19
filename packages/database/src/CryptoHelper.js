import crypto from "node:crypto";

const ENCRYPTION_PREFIX = "enc:v1:";

function deriveKey(secretKey) {
  const secret = secretKey || process.env.ENCRYPTION_KEY || process.env.DASHBOARD_SECRET || "bfe_default_fallback_encryption_key";
  return crypto.createHash("sha256").update(String(secret)).digest();
}

export function encryptToken(plainText, secretKey = null) {
  if (!plainText || typeof plainText !== "string") {
    return plainText;
  }
  if (plainText.startsWith(ENCRYPTION_PREFIX)) {
    return plainText;
  }
  const key = deriveKey(secretKey);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTION_PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptToken(cipherText, secretKey = null) {
  if (!cipherText || typeof cipherText !== "string") {
    return cipherText;
  }
  if (!cipherText.startsWith(ENCRYPTION_PREFIX)) {
    return cipherText;
  }
  const raw = cipherText.slice(ENCRYPTION_PREFIX.length);
  const parts = raw.split(":");
  if (parts.length !== 3) {
    return cipherText;
  }
  try {
    const [ivHex, tagHex, encryptedHex] = parts;
    const key = deriveKey(secretKey);
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return cipherText;
  }
}

export function isEncrypted(text) {
  return typeof text === "string" && text.startsWith(ENCRYPTION_PREFIX);
}
