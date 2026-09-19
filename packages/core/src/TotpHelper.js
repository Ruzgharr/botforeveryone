import crypto from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export class TotpHelper {
  static base32Encode(buffer) {
    let bits = 0;
    let value = 0;
    let output = "";

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;

      while (bits >= 5) {
        output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }

    return output;
  }

  static base32Decode(input) {
    const cleanInput = input.toUpperCase().replace(/=+$/, "");
    let bits = 0;
    let value = 0;
    const bytes = [];

    for (let i = 0; i < cleanInput.length; i++) {
      const idx = BASE32_ALPHABET.indexOf(cleanInput[i]);
      if (idx === -1) continue;

      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(bytes);
  }

  static generateSecret(byteLength = 20) {
    const randomBuffer = crypto.randomBytes(byteLength);
    return this.base32Encode(randomBuffer);
  }

  static generateTotp(secret, timeStepSeconds = 30, timestamp = Date.now()) {
    const key = this.base32Decode(secret);
    const counter = Math.floor(timestamp / 1000 / timeStepSeconds);

    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));

    const hmac = crypto.createHmac("sha1", key).update(counterBuffer).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;

    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const otp = (binary % 1000000).toString().padStart(6, "0");
    return otp;
  }

  static verifyTotp(param1, param2, window = 1, timeStepSeconds = 30) {
    if (!param1 || !param2) return false;
    let token = "";
    let secret = "";

    const str1 = String(param1).trim();
    const str2 = String(param2).trim();

    if (/^\d{6}$/.test(str1)) {
      token = str1;
      secret = str2;
    } else if (/^\d{6}$/.test(str2)) {
      token = str2;
      secret = str1;
    } else {
      return false;
    }

    const currentTimestamp = Date.now();
    for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
      const checkTimestamp = currentTimestamp + errorWindow * timeStepSeconds * 1000;
      const validCode = this.generateTotp(secret, timeStepSeconds, checkTimestamp);
      if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(validCode))) {
        return true;
      }
    }

    return false;
  }

  static getOtpAuthUrl(param1, param2, param3 = "BotForEveryone") {
    let secret = "";
    let accountName = "Admin";
    let issuer = param3 || "BotForEveryone";

    const str1 = String(param1 || "").trim();
    const str2 = String(param2 || "").trim();

    if (/^[A-Z2-7]{10,}$/i.test(str1)) {
      secret = str1;
      accountName = str2 || "Admin";
    } else {
      accountName = str1 || "Admin";
      secret = str2;
    }

    const encodedIssuer = encodeURIComponent(issuer);
    const encodedAccount = encodeURIComponent(accountName);
    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  }
}
