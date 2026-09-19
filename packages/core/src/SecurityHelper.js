import { URL } from "node:url";
import crypto from "node:crypto";

const DISCORD_WEBHOOK_HOSTS = new Set([
  "discord.com",
  "canary.discord.com",
  "ptb.discord.com",
  "discordapp.com"
]);

const BLOCKED_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^localhost$/i,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i
];

export class SecurityHelper {
  static isPrivateOrLocalAddress(host) {
    if (!host || typeof host !== "string") return true;
    const cleanHost = host.trim().toLowerCase();
    for (const pattern of BLOCKED_IP_PATTERNS) {
      if (pattern.test(cleanHost)) return true;
    }
    return false;
  }

  static isValidDiscordWebhookUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== "string") return false;
    try {
      const parsed = new URL(rawUrl.trim());
      if (parsed.protocol !== "https:") return false;
      const hostname = parsed.hostname.toLowerCase();
      if (!DISCORD_WEBHOOK_HOSTS.has(hostname)) return false;
      if (this.isPrivateOrLocalAddress(hostname)) return false;
      if (!parsed.pathname.startsWith("/api/webhooks/")) return false;
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length < 4) return false;
      return true;
    } catch {
      return false;
    }
  }

  static sanitizeString(input, maxLength = 255) {
    if (typeof input !== "string") return "";
    return input.trim().slice(0, maxLength);
  }

  static redactSensitiveData(rawText) {
    if (rawText === null || rawText === undefined) return "";
    let str = typeof rawText === "string" ? rawText : String(rawText);

    str = str.replace(/enc:v1:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+/gi, "***ENCRYPTED_TOKEN***");
    str = str.replace(/(?:Bot\s+)?([a-zA-Z0-9_-]{12,36}\.[a-zA-Z0-9_-]{4,12}\.[a-zA-Z0-9_-]{20,})/g, "***DISCORD_TOKEN***");
    str = str.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@)/gi, "$1***REDACTED_PASSWORD***$3");
    str = str.replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi, "$1***REDACTED_PASSWORD***$3");

    const dashSecret = process.env.DASHBOARD_SECRET;
    if (dashSecret && dashSecret.length >= 8 && str.includes(dashSecret)) {
      str = str.split(dashSecret).join("***DASHBOARD_SECRET***");
    }

    const encKey = process.env.ENCRYPTION_KEY;
    if (encKey && encKey.length >= 8 && str.includes(encKey)) {
      str = str.split(encKey).join("***ENCRYPTION_KEY***");
    }

    return str;
  }

  static validatePasswordComplexity(password) {
    if (!password || typeof password !== "string") {
      return { valid: false, error: "Parola metin formatında olmalıdır." };
    }
    if (password.length < 8) {
      return { valid: false, error: "Parola en az 8 karakter uzunluğunda olmalıdır." };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, error: "Parola en az bir büyük harf (A-Z) içermelidir." };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, error: "Parola en az bir küçük harf (a-z) içermelidir." };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, error: "Parola en az bir rakam (0-9) içermelidir." };
    }

    const commonPasswords = new Set([
      "password123",
      "admin1234",
      "12345678",
      "qwerty123",
      "botforeveryone",
      "administrator",
      "password"
    ]);

    if (commonPasswords.has(password.toLowerCase())) {
      return { valid: false, error: "Çok yaygın ve tahmin edilebilir bir parola seçtiniz. Lütfen daha güçlü bir parola belirleyin." };
    }

    return { valid: true };
  }

  static deriveKey(secretKey) {
    const secret = secretKey || process.env.ENCRYPTION_KEY || process.env.DASHBOARD_SECRET || "bfe_default_fallback_encryption_key";
    return crypto.createHash("sha256").update(String(secret)).digest();
  }

  static encryptAesGcm(plainData, secretKey = null) {
    const rawBuffer = Buffer.isBuffer(plainData) ? plainData : Buffer.from(String(plainData), "utf8");
    const key = this.deriveKey(secretKey);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(rawBuffer), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]);
  }

  static decryptAesGcm(encryptedBuffer, secretKey = null) {
    if (!Buffer.isBuffer(encryptedBuffer) || encryptedBuffer.length < 28) {
      throw new Error("Geçersiz şifrelenmiş veri boyutu.");
    }
    const iv = encryptedBuffer.subarray(0, 12);
    const tag = encryptedBuffer.subarray(12, 28);
    const ciphertext = encryptedBuffer.subarray(28);
    const key = this.deriveKey(secretKey);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
}
