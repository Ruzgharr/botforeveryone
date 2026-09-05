export class SmartFilter {
  static normalizeText(text) {
    if (!text || typeof text !== "string") return "";

    let cleaned = text
      .toLowerCase()
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/[0o]/g, "o")
      .replace(/[1li|!]/g, "i")
      .replace(/[@a]/g, "a")
      .replace(/[3e]/g, "e")
      .replace(/[$s]/g, "s")
      .replace(/[5s]/g, "s")
      .replace(/[^a-z0-9ğüşıöç]/g, "");

    return cleaned.replace(/(.)\1{2,}/g, "$1");
  }

  static containsInvite(text) {
    if (!text) return false;
    const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/i;
    return inviteRegex.test(text);
  }

  static containsLink(text) {
    if (!text) return false;
    const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/i;
    return linkRegex.test(text);
  }

  static levenshtein(a, b) {
    const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));

    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[a.length][b.length];
  }

  static containsBlacklistedWord(text, blacklist = []) {
    if (!text || !Array.isArray(blacklist) || blacklist.length === 0) return false;

    const normalized = this.normalizeText(text);
    const words = text.toLowerCase().split(/\s+/);

    for (const rawBad of blacklist) {
      const badWord = rawBad.toLowerCase().trim();
      if (!badWord) continue;

      if (words.includes(badWord)) return true;

      const normBad = this.normalizeText(badWord);
      if (normalized.includes(normBad)) return true;

      for (const word of words) {
        if (Math.abs(word.length - badWord.length) <= 1 && word.length > 3) {
          const dist = this.levenshtein(word, badWord);
          if (dist <= 1) return true;
        }
      }
    }

    return false;
  }

  static isSpam(userTimestamps = [], newTimestamp = Date.now(), maxAllowed = 5, windowMs = 5000) {
    const recent = userTimestamps.filter((t) => newTimestamp - t < windowMs);
    recent.push(newTimestamp);
    return {
      isSpam: recent.length > maxAllowed,
      updatedTimestamps: recent
    };
  }
}
