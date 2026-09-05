import { AttachmentBuilder } from "discord.js";

export class StatCardGenerator {
  static createCard({ username, level, xp, nextLevelXp, voiceHours, messages, rank = 1 }) {
    const progress = Math.min(100, Math.max(5, Math.round((xp / (nextLevelXp || 100)) * 100)));
    const barWidth = Math.round((progress / 100) * 480);

    const svg = `<svg width="600" height="240" viewBox="0 0 600 240" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="600" height="240" rx="16" fill="#0f172a"/>
  <rect x="1" y="1" width="598" height="238" rx="15" stroke="#334155" stroke-width="2"/>
  <circle cx="60" cy="60" r="32" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
  <text x="60" y="68" font-family="system-ui, sans-serif" font-size="22" font-weight="bold" fill="#38bdf8" text-anchor="middle">#${rank}</text>
  <text x="110" y="52" font-family="system-ui, sans-serif" font-size="22" font-weight="bold" fill="#f8fafc">${escapeXml(username)}</text>
  <text x="110" y="74" font-family="system-ui, sans-serif" font-size="14" fill="#94a3b8">Seviye ${level} • ${xp} / ${nextLevelXp} XP</text>
  <rect x="60" y="105" width="480" height="12" rx="6" fill="#1e293b"/>
  <rect x="60" y="105" width="${barWidth}" height="12" rx="6" fill="#38bdf8"/>
  <rect x="60" y="135" width="225" height="75" rx="12" fill="#1e293b" stroke="#334155"/>
  <text x="80" y="162" font-family="system-ui, sans-serif" font-size="13" fill="#94a3b8">Toplam Ses Aktifliği</text>
  <text x="80" y="193" font-family="system-ui, sans-serif" font-size="20" font-weight="bold" fill="#38bdf8">${voiceHours} Saat</text>
  <rect x="315" y="135" width="225" height="75" rx="12" fill="#1e293b" stroke="#334155"/>
  <text x="335" y="162" font-family="system-ui, sans-serif" font-size="13" fill="#94a3b8">Toplam Mesaj Sayısı</text>
  <text x="335" y="193" font-family="system-ui, sans-serif" font-size="20" font-weight="bold" fill="#38bdf8">${messages} Mesaj</text>
</svg>`;

    const buffer = Buffer.from(svg, "utf-8");
    return new AttachmentBuilder(buffer, { name: "stat-card.svg" });
  }
}

function escapeXml(unsafe) {
  return (unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
