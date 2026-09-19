import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";

const SYSTEM_FONTS = [
  "C:/Windows/Fonts/segoeui.ttf",
  "C:/Windows/Fonts/segoeuib.ttf",
  "C:/Windows/Fonts/seguiemj.ttf",
  "C:/Windows/Fonts/arial.ttf",
  "C:/Windows/Fonts/arialbd.ttf"
];

for (const fontPath of SYSTEM_FONTS) {
  if (fs.existsSync(fontPath)) {
    try {
      GlobalFonts.registerFromPath(fontPath);
    } catch {}
  }
}

const FONT = "'Segoe UI', 'Segoe UI Emoji', Arial, sans-serif";

export const THEME_SETS = {
  japan: {
    id: "japan",
    name: "Geleneksel Japonya Koleksiyonu",
    badge: "🌸 Nihonjin",
    themes: ["sakura", "torii-gate", "winter-shrine"],
    rewardBonus: 2000
  },
  cyber: {
    id: "cyber",
    name: "Siber Neon & Arcade Koleksiyonu",
    badge: "⚡ Netrunner",
    themes: ["cyberpunk", "neon-arcade", "galaxy-violet"],
    rewardBonus: 2500
  },
  nature: {
    id: "nature",
    name: "Huzur & Büyülü Doğa Koleksiyonu",
    badge: "🌿 Forest Spirit",
    themes: ["ghibli-forest", "lofi-rain", "ocean-breeze"],
    rewardBonus: 2000
  },
  night: {
    id: "night",
    name: "Mistik Gece & Kanlı Ay Koleksiyonu",
    badge: "🩸 Night Stalker",
    themes: ["midnight-moon", "blood-moon", "starry-sky"],
    rewardBonus: 2500
  },
  sky: {
    id: "sky",
    name: "Gökyüzü & Mevsimler Koleksiyonu",
    badge: "🌤️ Sky Voyager",
    themes: ["sunset", "dawn-afternoon", "cloud-dream", "autumn-leaves"],
    rewardBonus: 3000
  }
};

export const CARD_THEMES = {
  sakura: {
    id: "sakura",
    name: "Sakura 🌸",
    desc: "Kiraz Cicekleri ve Japon Tapinagi",
    primary: "#FF80AB",
    secondary: "#F472B6",
    accent: "#00D26A",
    border: "rgba(255, 128, 171, 0.4)",
    boxBg: "rgba(20, 15, 28, 0.78)",
    bgGrad: ["#230d1e", "#130814"],
    bgFile: "sakura.jpg",
    badge: "🌸 SAKURA",
    price: 0,
    set: "japan"
  },
  sunset: {
    id: "sunset",
    name: "Sunset 🌇",
    desc: "Anime Aksamustu ve Sehir Manzarasi",
    primary: "#F59E0B",
    secondary: "#FB923C",
    accent: "#8B5CF6",
    border: "rgba(245, 158, 11, 0.4)",
    boxBg: "rgba(24, 14, 30, 0.78)",
    bgGrad: ["#2e122b", "#14081c"],
    bgFile: "sunset.jpg",
    badge: "🌇 SUNSET",
    price: 3500,
    set: "sky"
  },
  "dawn-afternoon": {
    id: "dawn-afternoon",
    name: "Dawn Afternoon ☀️",
    desc: "Huzurlu Safak ve Ruzgarli Cayir",
    primary: "#38BDF8",
    secondary: "#FBBF24",
    accent: "#10B981",
    border: "rgba(56, 189, 248, 0.4)",
    boxBg: "rgba(12, 22, 38, 0.78)",
    bgGrad: ["#0f223d", "#0c1524"],
    bgFile: "dawn-afternoon.jpg",
    badge: "☀️ DAWN",
    price: 3500,
    set: "sky"
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "Cyberpunk 🌆",
    desc: "Tokyo Neon ve Gece Sehri",
    primary: "#06B6D4",
    secondary: "#EC4899",
    accent: "#FACC15",
    border: "rgba(6, 182, 212, 0.4)",
    boxBg: "rgba(10, 15, 28, 0.8)",
    bgGrad: ["#08162b", "#150826"],
    bgFile: "cyberpunk.jpg",
    badge: "🌆 CYBERPUNK",
    price: 4500,
    set: "cyber"
  },
  "starry-sky": {
    id: "starry-sky",
    name: "Starry Sky 🌌",
    desc: "Yildizli Gece ve Komet Isigi",
    primary: "#818CF8",
    secondary: "#C084FC",
    accent: "#38BDF8",
    border: "rgba(129, 140, 248, 0.4)",
    boxBg: "rgba(12, 14, 28, 0.8)",
    bgGrad: ["#0c1229", "#080b18"],
    bgFile: "starry-sky.jpg",
    badge: "🌌 STARRY",
    price: 4500,
    set: "night"
  },
  "ghibli-forest": {
    id: "ghibli-forest",
    name: "Ghibli Forest 🍃",
    desc: "Buyulu Yesil Orman ve Ruhlar",
    primary: "#10B981",
    secondary: "#34D399",
    accent: "#FBBF24",
    border: "rgba(16, 185, 129, 0.4)",
    boxBg: "rgba(10, 24, 18, 0.8)",
    bgGrad: ["#0a2118", "#06130d"],
    bgFile: "ghibli-forest.jpg",
    badge: "🍃 GHIBLI",
    price: 4500,
    set: "nature"
  },
  "midnight-moon": {
    id: "midnight-moon",
    name: "Midnight Moon 🌕",
    desc: "Gumus Dolunay ve Koyu Gokyuzu",
    primary: "#E2E8F0",
    secondary: "#94A3B8",
    accent: "#38BDF8",
    border: "rgba(226, 232, 240, 0.35)",
    boxBg: "rgba(15, 18, 26, 0.82)",
    bgGrad: ["#0e111a", "#07090e"],
    bgFile: "midnight-moon.jpg",
    badge: "🌕 MIDNIGHT",
    price: 4500,
    set: "night"
  },
  "lofi-rain": {
    id: "lofi-rain",
    name: "Lofi Rain 🌧️",
    desc: "Yagmurlu Anime Penceresi ve Sokak",
    primary: "#A78BFA",
    secondary: "#60A5FA",
    accent: "#F472B6",
    border: "rgba(167, 139, 250, 0.4)",
    boxBg: "rgba(18, 16, 30, 0.8)",
    bgGrad: ["#16132b", "#0d0b1a"],
    bgFile: "lofi-rain.jpg",
    badge: "🌧️ LOFI",
    price: 3500,
    set: "nature"
  },
  "ocean-breeze": {
    id: "ocean-breeze",
    name: "Ocean Breeze 🌊",
    desc: "Turkuaz Deniz ve Sahil Ruzgari",
    primary: "#14B8A6",
    secondary: "#06B6D4",
    accent: "#F59E0B",
    border: "rgba(20, 184, 166, 0.4)",
    boxBg: "rgba(10, 24, 28, 0.8)",
    bgGrad: ["#092429", "#061417"],
    bgFile: "ocean-breeze.jpg",
    badge: "🌊 OCEAN",
    price: 4000,
    set: "nature"
  },
  "blood-moon": {
    id: "blood-moon",
    name: "Blood Moon 🩸",
    desc: "Kizil Samuray ve Kanli Ay",
    primary: "#EF4444",
    secondary: "#DC2626",
    accent: "#F59E0B",
    border: "rgba(239, 68, 68, 0.4)",
    boxBg: "rgba(28, 10, 12, 0.8)",
    bgGrad: ["#2e0c10", "#140406"],
    bgFile: "blood-moon.jpg",
    badge: "🩸 BLOOD MOON",
    price: 5000,
    set: "night"
  },
  "autumn-leaves": {
    id: "autumn-leaves",
    name: "Autumn Leaves 🍁",
    desc: "Kizil Akcaagac ve Sonbahar",
    primary: "#EA580C",
    secondary: "#F97316",
    accent: "#EAB308",
    border: "rgba(234, 88, 12, 0.4)",
    boxBg: "rgba(28, 16, 12, 0.8)",
    bgGrad: ["#2d140b", "#140905"],
    bgFile: "autumn-leaves.jpg",
    badge: "🍁 AUTUMN",
    price: 4000,
    set: "sky"
  },
  "winter-shrine": {
    id: "winter-shrine",
    name: "Winter Shrine ❄️",
    desc: "Karli Kis Tapinagi ve Kristaller",
    primary: "#7DD3FC",
    secondary: "#BAE6FD",
    accent: "#A78BFA",
    border: "rgba(125, 211, 252, 0.4)",
    boxBg: "rgba(12, 20, 32, 0.8)",
    bgGrad: ["#0e2136", "#08121f"],
    bgFile: "winter-shrine.jpg",
    badge: "❄️ WINTER",
    price: 4500,
    set: "japan"
  },
  "neon-arcade": {
    id: "neon-arcade",
    name: "Neon Arcade 🕹️",
    desc: "80ler Retro Synthwave",
    primary: "#F43F5E",
    secondary: "#8B5CF6",
    accent: "#06B6D4",
    border: "rgba(244, 63, 94, 0.4)",
    boxBg: "rgba(24, 10, 26, 0.8)",
    bgGrad: ["#2b082e", "#120314"],
    bgFile: "neon-arcade.jpg",
    badge: "🕹️ ARCADE",
    price: 4000,
    set: "cyber"
  },
  "torii-gate": {
    id: "torii-gate",
    name: "Torii Gate ⛩️",
    desc: "Kutsal Torii Kapisi ve Sisli Dag",
    primary: "#E11D48",
    secondary: "#F43F5E",
    accent: "#F59E0B",
    border: "rgba(225, 29, 72, 0.4)",
    boxBg: "rgba(26, 12, 18, 0.8)",
    bgGrad: ["#290b16", "#12050a"],
    bgFile: "torii-gate.jpg",
    badge: "⛩️ TORII",
    price: 4500,
    set: "japan"
  },
  "cloud-dream": {
    id: "cloud-dream",
    name: "Cloud Dream ☁️",
    desc: "Pastel Ruya ve Pembe Bulutlar",
    primary: "#F472B6",
    secondary: "#38BDF8",
    accent: "#FBBF24",
    border: "rgba(244, 114, 182, 0.4)",
    boxBg: "rgba(24, 16, 30, 0.8)",
    bgGrad: ["#24122d", "#0f0817"],
    bgFile: "cloud-dream.jpg",
    badge: "☁️ DREAM",
    price: 4000,
    set: "sky"
  },
  "galaxy-violet": {
    id: "galaxy-violet",
    name: "Galaxy Violet 🔮",
    desc: "Mor Galaksi ve Kozmik Toz",
    primary: "#A855F7",
    secondary: "#C084FC",
    accent: "#EC4899",
    border: "rgba(168, 85, 247, 0.4)",
    boxBg: "rgba(20, 10, 32, 0.8)",
    bgGrad: ["#210936", "#0b0314"],
    bgFile: "galaxy-violet.jpg",
    badge: "🔮 GALAXY",
    price: 4500,
    set: "cyber"
  }
};

export function getTheme(themeKey) {
  const normalized = String(themeKey || "").toLowerCase().trim();
  return CARD_THEMES[normalized] || CARD_THEMES.sakura;
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function drawProgressBar(ctx, x, y, width, height, percent, startColor, endColor, bgColor = "#1e2029") {
  drawRoundedRect(ctx, x, y, width, height, height / 2);
  ctx.fillStyle = bgColor;
  ctx.fill();

  const safePercent = Math.max(0, Math.min(100, percent));
  if (safePercent > 0) {
    const fillWidth = Math.max(height, (width * safePercent) / 100);
    drawRoundedRect(ctx, x, y, fillWidth, height, height / 2);
    const grad = ctx.createLinearGradient(x, y, x + fillWidth, y);
    grad.addColorStop(0, startColor);
    grad.addColorStop(1, endColor);
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

function drawAvatarPlaceholder(ctx, x, y, size, text, bgColor = "#5865F2") {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = bgColor;
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.round(size * 0.45)}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const initial = (text || "?").charAt(0).toUpperCase();
  ctx.fillText(initial, x + size / 2, y + size / 2);
  ctx.restore();
}

async function drawAvatar(ctx, x, y, size, user, primaryColor = "#5865F2") {
  let loaded = false;
  if (user) {
    try {
      let avatarUrl = null;
      if (typeof user.displayAvatarURL === "function") {
        avatarUrl = user.displayAvatarURL({ extension: "png", size: 128, forceStatic: true });
      } else if (user.avatarURL) {
        avatarUrl = user.avatarURL;
      } else if (user.avatar && user.id) {
        avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
      }
      if (avatarUrl) {
        const res = await fetch(avatarUrl, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          const img = await loadImage(buf);
          ctx.save();
          ctx.beginPath();
          ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, x, y, size, size);
          ctx.restore();

          ctx.beginPath();
          ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
          ctx.strokeStyle = primaryColor;
          ctx.lineWidth = 2.5;
          ctx.stroke();
          loaded = true;
        }
      }
    } catch {}
  }
  if (!loaded) {
    drawAvatarPlaceholder(ctx, x, y, size, user?.username || user?.tag || "?", primaryColor);
  }
}

async function drawCardBackground(ctx, width, height, theme) {
  let bgLoaded = false;
  if (theme.bgFile) {
    try {
      const p = path.resolve("packages/core/assets/themes", theme.bgFile);
      if (fs.existsSync(p)) {
        const bgImg = await loadImage(p);
        ctx.drawImage(bgImg, 0, 0, width, height);
        ctx.fillStyle = "rgba(12, 10, 20, 0.72)";
        ctx.fillRect(0, 0, width, height);
        bgLoaded = true;
      }
    } catch {}
  }
  if (!bgLoaded) {
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, theme.bgGrad[0]);
    bgGrad.addColorStop(1, theme.bgGrad[1]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  }
}

export class VisualCard {
  static async renderTopCoinCard({ guild, enrichedUsers = [], theme = "sakura" }) {
    const t = getTheme(theme);
    const width = 820;
    const height = 480;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    await drawCardBackground(ctx, width, height, t);

    drawRoundedRect(ctx, 16, 16, width - 32, height - 32, 16);
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = t.primary;
    ctx.font = `bold 22px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText(`🏆 ${guild?.name || "Sunucu"} : En Zenginler Sıralaması`, 40, 56);

    ctx.fillStyle = "#8b92a8";
    ctx.font = `13px ${FONT}`;
    ctx.fillText("Finansal Liderlik Tablosu • Gerçek Zamanlı Varlık Dökümü", 40, 78);

    const topUsers = enrichedUsers.slice(0, 5);
    const maxCoin = Math.max(1, ...(topUsers.map((u) => u.total || 0)));

    const rankColors = [t.primary, "#9CA3AF", t.secondary, "#6B7280", "#4B5563"];
    const rankBadges = ["🥇 1.", "🥈 2.", "🥉 3.", "4.", "5."];

    for (let i = 0; i < topUsers.length; i++) {
      const u = topUsers[i];
      const y = 104 + i * 68;

      drawRoundedRect(ctx, 36, y, width - 72, 56, 10);
      ctx.fillStyle = t.boxBg;
      ctx.fill();
      ctx.strokeStyle = i === 0 ? t.border : "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = rankColors[i] || "#4B5563";
      ctx.font = `bold 15px ${FONT}`;
      ctx.fillText(rankBadges[i], 52, y + 34);

      await drawAvatar(ctx, 100, y + 10, 36, { id: u.userId, username: u.tag }, rankColors[i]);

      ctx.fillStyle = "#ffffff";
      ctx.font = `bold 15px ${FONT}`;
      const displayName = u.tag || `Üye (${u.userId})`;
      ctx.fillText(displayName.length > 20 ? displayName.slice(0, 18) + "..." : displayName, 150, y + 26);

      const coinStr = `${(u.total || 0).toLocaleString("tr-TR")} Coin`;
      ctx.fillStyle = t.primary;
      ctx.font = `bold 14px ${FONT}`;
      ctx.textAlign = "right";
      ctx.fillText(coinStr, width - 56, y + 26);
      ctx.textAlign = "left";

      const percent = Math.round(((u.total || 0) / maxCoin) * 100);
      drawProgressBar(ctx, 150, y + 36, width - 220, 8, percent, t.primary, t.secondary);
    }

    ctx.fillStyle = "#8b92a8";
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("💎 Public Bot Finans Sistemi • Guncel veriler veritabanindan cekilmistir", width / 2, height - 24);

    return canvas.toBuffer("image/png");
  }

  static async renderUserStatCard({ user, periodText = "Genel", voiceHours = 0, messageCount = 0, level = 1, rank = 1, theme = "sakura", title = "", badges = [] }) {
    const t = getTheme(theme);
    const width = 800;
    const height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    await drawCardBackground(ctx, width, height, t);

    drawRoundedRect(ctx, 16, 16, width - 32, height - 32, 16);
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    await drawAvatar(ctx, 44, 44, 84, user, t.primary);

    const titleStr = title ? `${title} ` : "";
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText(`${titleStr}${user?.username || "Kullanıcı"}`, 148, 72);

    ctx.fillStyle = t.secondary;
    ctx.font = `14px ${FONT}`;
    ctx.fillText(`ID: ${user?.id || "-"}`, 148, 98);

    drawRoundedRect(ctx, width - 180, 44, 136, 34, 8);
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fill();
    ctx.strokeStyle = t.primary;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = t.primary;
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(t.badge, width - 112, 66);
    ctx.textAlign = "left";

    const boxWidth = (width - 104) / 2;

    drawRoundedRect(ctx, 44, 150, boxWidth, 120, 12);
    ctx.fillStyle = t.boxBg;
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 210, 106, 0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#00D26A";
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText("🎙️ Ses Aktifliği", 64, 182);

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 28px ${FONT}`;
    ctx.fillText(`${voiceHours} Saat`, 64, 222);

    drawProgressBar(ctx, 64, 240, boxWidth - 40, 10, Math.min(100, voiceHours * 5), "#00D26A", "#10B981");

    drawRoundedRect(ctx, 44 + boxWidth + 16, 150, boxWidth, 120, 12);
    ctx.fillStyle = t.boxBg;
    ctx.fill();
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = t.primary;
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText("💬 Mesaj Aktifliği", 44 + boxWidth + 36, 182);

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 28px ${FONT}`;
    ctx.fillText(`${messageCount.toLocaleString("tr-TR")} Mesaj`, 44 + boxWidth + 36, 222);

    drawProgressBar(ctx, 44 + boxWidth + 36, 240, boxWidth - 40, 10, Math.min(100, messageCount / 5), t.primary, t.secondary);

    drawRoundedRect(ctx, 44, 290, width - 88, 54, 10);
    ctx.fillStyle = t.boxBg;
    ctx.fill();

    ctx.fillStyle = "#F59E0B";
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillText(`⭐ Seviye: ${level}`, 64, 323);

    ctx.fillStyle = "#E5E7EB";
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillText(`🏆 Sıralama: #${rank}`, 240, 323);

    if (Array.isArray(badges) && badges.length > 0) {
      ctx.fillStyle = t.primary;
      ctx.font = `bold 13px ${FONT}`;
      ctx.textAlign = "right";
      ctx.fillText(badges.slice(0, 4).join(" "), width - 64, 323);
      ctx.textAlign = "left";
    } else {
      ctx.fillStyle = "#9CA3AF";
      ctx.font = `12px ${FONT}`;
      ctx.textAlign = "right";
      ctx.fillText("Public Bot İstatistik Sistemi", width - 64, 323);
      ctx.textAlign = "left";
    }

    return canvas.toBuffer("image/png");
  }

  static async renderTopStatCard({ guild, ranking = [], type = "voice", theme = "sakura" }) {
    const t = getTheme(theme);
    const width = 820;
    const height = 480;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    await drawCardBackground(ctx, width, height, t);

    drawRoundedRect(ctx, 16, 16, width - 32, height - 32, 16);
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = t.primary;
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText(`📈 ${guild?.name || "Sunucu"} : En Aktifler Liderlik Tablosu`, 40, 56);

    ctx.fillStyle = "#8b92a8";
    ctx.font = `13px ${FONT}`;
    ctx.fillText(type === "voice" ? "🎙️ En Çok Seste Kalan Üyeler" : "💬 En Çok Mesaj Gönderen Üyeler", 40, 78);

    const topRanked = ranking.slice(0, 5);
    const maxValue = Math.max(1, ...(topRanked.map((r) => r.value || 0)));
    const rankColors = [t.primary, "#9CA3AF", t.secondary, "#6B7280", "#4B5563"];
    const rankBadges = ["🥇 1.", "🥈 2.", "🥉 3.", "4.", "5."];

    for (let i = 0; i < topRanked.length; i++) {
      const r = topRanked[i];
      const y = 104 + i * 68;

      drawRoundedRect(ctx, 36, y, width - 72, 56, 10);
      ctx.fillStyle = t.boxBg;
      ctx.fill();
      ctx.strokeStyle = i === 0 ? t.border : "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = rankColors[i] || "#4B5563";
      ctx.font = `bold 15px ${FONT}`;
      ctx.fillText(rankBadges[i], 52, y + 34);

      await drawAvatar(ctx, 100, y + 10, 36, { id: r.userId, username: r.tag }, rankColors[i]);

      ctx.fillStyle = "#ffffff";
      ctx.font = `bold 15px ${FONT}`;
      const displayName = r.tag || `Üye (${r.userId})`;
      ctx.fillText(displayName.length > 20 ? displayName.slice(0, 18) + "..." : displayName, 150, y + 26);

      const valStr = r.formattedValue || `${(r.value || 0).toLocaleString("tr-TR")}`;
      ctx.fillStyle = t.primary;
      ctx.font = `bold 14px ${FONT}`;
      ctx.textAlign = "right";
      ctx.fillText(valStr, width - 56, y + 26);
      ctx.textAlign = "left";

      const percent = Math.round(((r.value || 0) / maxValue) * 100);
      drawProgressBar(ctx, 150, y + 36, width - 220, 8, percent, t.primary, t.secondary);
    }

    ctx.fillStyle = "#8b92a8";
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("İstatistik Motoru • Sıralamalar sunucu aktivite verilerine dayanır", width / 2, height - 24);

    return canvas.toBuffer("image/png");
  }

  static async renderCoinWalletCard({ user, wallet = 0, bank = 0, theme = "sakura" }) {
    const t = getTheme(theme);
    const width = 760;
    const height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    await drawCardBackground(ctx, width, height, t);

    drawRoundedRect(ctx, 16, 16, width - 32, height - 32, 20);
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    drawRoundedRect(ctx, 44, 44, 52, 38, 6);
    ctx.fillStyle = "rgba(245, 158, 11, 0.15)";
    ctx.fill();
    ctx.strokeStyle = t.primary;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = t.primary;
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText("BOT FOR EVERYONE • FINANCIAL VIP", 112, 68);

    await drawAvatar(ctx, width - 96, 44, 52, user, t.primary);

    const total = wallet + bank;

    ctx.fillStyle = "#8f96ab";
    ctx.font = `13px ${FONT}`;
    ctx.fillText("TOPLAM NET VARLIK", 44, 134);

    ctx.fillStyle = t.primary;
    ctx.font = `bold 38px ${FONT}`;
    ctx.fillText(`${total.toLocaleString("tr-TR")} COIN`, 44, 178);

    const boxWidth = (width - 104) / 2;

    drawRoundedRect(ctx, 44, 210, boxWidth, 90, 12);
    ctx.fillStyle = t.boxBg;
    ctx.fill();
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#8f96ab";
    ctx.font = `13px ${FONT}`;
    ctx.fillText("👛 CÜZDAN BAKİYESİ", 64, 242);
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillText(`${wallet.toLocaleString("tr-TR")} Coin`, 64, 276);

    drawRoundedRect(ctx, 44 + boxWidth + 16, 210, boxWidth, 90, 12);
    ctx.fillStyle = t.boxBg;
    ctx.fill();
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#8f96ab";
    ctx.font = `13px ${FONT}`;
    ctx.fillText("🏦 BANKA HESABI", 44 + boxWidth + 36, 242);
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillText(`${bank.toLocaleString("tr-TR")} Coin`, 44 + boxWidth + 36, 276);

    ctx.fillStyle = "#9ca3af";
    ctx.font = `bold 14px ${FONT}`;
    ctx.fillText(`KART SAHİBİ: ${(user?.username || "KULLANICI").toUpperCase()}`, 44, 345);

    ctx.fillStyle = "#5d6379";
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText("GÜVENLİ DİJİTAL VARLIK", width - 44, 345);
    ctx.textAlign = "left";

    return canvas.toBuffer("image/png");
  }

  static async renderLevelCard({ user, level = 1, currentXp = 0, requiredXp = 100, rank = 1, theme = "sakura" }) {
    const t = getTheme(theme);
    const width = 800;
    const height = 280;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    await drawCardBackground(ctx, width, height, t);

    drawRoundedRect(ctx, 16, 16, width - 32, height - 32, 16);
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    await drawAvatar(ctx, 44, 44, 96, user, t.primary);

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillText(user?.username || "Kullanıcı", 164, 76);

    ctx.fillStyle = "#8c93a8";
    ctx.font = `14px ${FONT}`;
    ctx.fillText(`Kullanıcı ID: ${user?.id || "-"}`, 164, 102);

    ctx.fillStyle = t.primary;
    ctx.font = `bold 28px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(`SEVİYE ${level}`, width - 44, 76);

    ctx.fillStyle = "#9CA3AF";
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillText(`SIRA #${rank}`, width - 44, 102);
    ctx.textAlign = "left";

    const percent = Math.min(100, Math.max(0, Math.round((currentXp / Math.max(1, requiredXp)) * 100)));

    ctx.fillStyle = "#8c93a8";
    ctx.font = `13px ${FONT}`;
    ctx.fillText("DENEYİM PUANI (XP İLERLEMESİ)", 44, 164);

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 14px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(`${currentXp.toLocaleString("tr-TR")} / ${requiredXp.toLocaleString("tr-TR")} XP (%${percent})`, width - 44, 164);
    ctx.textAlign = "left";

    drawProgressBar(ctx, 44, 178, width - 88, 22, percent, t.primary, t.secondary);

    ctx.fillStyle = "#5d6379";
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("Seviye Sistemi • Mesaj ve ses aktivitelerinizle XP kazanırsınız", width / 2, height - 26);

    return canvas.toBuffer("image/png");
  }

  static async renderSayCard({ guild, totalMembers = 0, voiceCount = 0, humanCount = 0, botCount = 0, boostCount = 0, boostTier = 0, theme = "sakura" }) {
    const t = getTheme(theme);
    const width = 800;
    const height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    await drawCardBackground(ctx, width, height, t);

    drawRoundedRect(ctx, 16, 16, width - 32, height - 32, 16);
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = t.primary;
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText(`🏰 ${guild?.name || "Sunucu"} : Canlı İstatistikler`, 44, 56);

    ctx.fillStyle = "#8b92a8";
    ctx.font = `13px ${FONT}`;
    ctx.fillText("Gerçek Zamanlı Sunucu Sayacı • Discord Gateway Verileri", 44, 78);

    const boxWidth = (width - 104) / 2;
    const boxHeight = 110;

    drawRoundedRect(ctx, 44, 104, boxWidth, boxHeight, 12);
    ctx.fillStyle = t.boxBg;
    ctx.fill();
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = t.primary;
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText("👥 Toplam Üye", 64, 136);
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 32px ${FONT}`;
    ctx.fillText(totalMembers.toLocaleString("tr-TR"), 64, 178);
    ctx.fillStyle = "#8b92a8";
    ctx.font = `12px ${FONT}`;
    ctx.fillText(`İnsan: ${humanCount.toLocaleString("tr-TR")} | Bot: ${botCount.toLocaleString("tr-TR")}`, 64, 198);

    drawRoundedRect(ctx, 44 + boxWidth + 16, 104, boxWidth, boxHeight, 12);
    ctx.fillStyle = t.boxBg;
    ctx.fill();
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#00D26A";
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText("🎙️ Sesteki Üyeler", 44 + boxWidth + 36, 136);
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 32px ${FONT}`;
    ctx.fillText(voiceCount.toLocaleString("tr-TR"), 44 + boxWidth + 36, 178);
    ctx.fillStyle = "#8b92a8";
    ctx.font = `12px ${FONT}`;
    ctx.fillText("Aktif ses kanallarında bulunan üyeler", 44 + boxWidth + 36, 198);

    drawRoundedRect(ctx, 44, 230, boxWidth, boxHeight, 12);
    ctx.fillStyle = t.boxBg;
    ctx.fill();
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = t.secondary;
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText("🚀 Takviye (Boost) Durumu", 64, 262);
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 32px ${FONT}`;
    ctx.fillText(`${boostCount} Boost`, 64, 304);
    ctx.fillStyle = "#8b92a8";
    ctx.font = `12px ${FONT}`;
    ctx.fillText(`Mevcut Seviye: Seviye ${boostTier}`, 64, 324);

    drawRoundedRect(ctx, 44 + boxWidth + 16, 230, boxWidth, boxHeight, 12);
    ctx.fillStyle = t.boxBg;
    ctx.fill();
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#F59E0B";
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText("🛡️ Sunucu Güvenlik Durumu", 44 + boxWidth + 36, 262);
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillText("Korumalar Aktif", 44 + boxWidth + 36, 304);
    ctx.fillStyle = "#8b92a8";
    ctx.font = `12px ${FONT}`;
    ctx.fillText("Tüm guard kalkanları çalışır durumda", 44 + boxWidth + 36, 324);

    ctx.fillStyle = "#5d6379";
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("⚡ Gerçek zamanlı sunucu durum paneli", width / 2, height - 16);

    return canvas.toBuffer("image/png");
  }

  static getTheme(themeKey) {
    return getTheme(themeKey);
  }

  static getThemesList() {
    return Object.values(CARD_THEMES);
  }

  static async renderLevelUpCard({ user, newLevel = 1, rewardRole = null, theme = "sakura" }) {
    const t = getTheme(theme);
    const width = 800;
    const height = 340;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    await drawCardBackground(ctx, width, height, t);

    drawRoundedRect(ctx, 16, 16, width - 32, height - 32, 16);
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    await drawAvatar(ctx, 44, 44, 96, user, t.primary);

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillText(user?.username || "Kullanici", 164, 76);

    ctx.fillStyle = t.secondary;
    ctx.font = `14px ${FONT}`;
    ctx.fillText(`ID: ${user?.id || "-"}`, 164, 102);

    drawRoundedRect(ctx, width - 180, 44, 136, 34, 8);
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fill();
    ctx.strokeStyle = t.primary;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = t.primary;
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(t.badge, width - 112, 66);
    ctx.textAlign = "left";

    drawRoundedRect(ctx, 44, 160, width - 88, 120, 12);
    ctx.fillStyle = t.boxBg;
    ctx.fill();
    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#F59E0B";
    ctx.font = `bold 32px ${FONT}`;
    ctx.fillText(`🎉 TEBRİKLER! SEVİYE ${newLevel}`, 64, 212);

    ctx.fillStyle = "#ffffff";
    ctx.font = `15px ${FONT}`;
    const roleText = rewardRole ? `Yeni Rol Ödülü: @${rewardRole}` : "Aktivitenizle sunucuda yükselmeye devam ediyorsunuz!";
    ctx.fillText(roleText, 64, 246);

    ctx.fillStyle = "#8b92a8";
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText("Public Bot Seviye Sistemi", width - 64, 305);
    ctx.textAlign = "left";

    return canvas.toBuffer("image/png");
  }

  static renderBlackjackTable({ playerHand = [], dealerHand = [], playerTotal = 0, dealerTotal = 0, bet = 0, status = "playing", balance = 0 }) {
    const width = 800;
    const height = 440;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#082b18");
    bgGrad.addColorStop(0.5, "#0b3d22");
    bgGrad.addColorStop(1, "#051f11");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    drawRoundedRect(ctx, 16, 16, width - 32, height - 32, 18);
    ctx.strokeStyle = "#F59E0B66";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#F59E0B";
    ctx.font = `bold 24px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("♠️ PUBLIC BOT CASINO : BLACKJACK 21 ♠️", width / 2, 54);

    drawRoundedRect(ctx, 44, 80, width - 88, 120, 12);
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#9CA3AF";
    ctx.font = `bold 14px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText(`KRUPİYE ELİ (Toplam: ${status === "playing" ? "?" : dealerTotal})`, 64, 108);

    const drawMiniCard = (cx, cardStr, x, y, hidden = false) => {
      drawRoundedRect(cx, x, y, 54, 76, 6);
      cx.fillStyle = hidden ? "#8B0000" : "#ffffff";
      cx.fill();
      cx.strokeStyle = "#222222";
      cx.lineWidth = 1;
      ctx.stroke();
      if (!hidden) {
        cx.fillStyle = ["♥", "♦"].some(s => cardStr.includes(s)) ? "#DC2626" : "#111827";
        cx.font = `bold 20px ${FONT}`;
        cx.textAlign = "center";
        cx.fillText(cardStr, x + 27, y + 46);
      } else {
        cx.fillStyle = "#ffffff";
        cx.font = `bold 16px ${FONT}`;
        cx.textAlign = "center";
        cx.fillText("🂠", x + 27, y + 46);
      }
    };

    dealerHand.forEach((c, idx) => {
      drawMiniCard(ctx, c, 64 + idx * 64, 116, status === "playing" && idx === 1);
    });

    drawRoundedRect(ctx, 44, 220, width - 88, 120, 12);
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#38BDF8";
    ctx.font = `bold 14px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText(`OYUNCU ELİ (Toplam: ${playerTotal})`, 64, 248);

    playerHand.forEach((c, idx) => {
      drawMiniCard(ctx, c, 64 + idx * 64, 256, false);
    });

    drawRoundedRect(ctx, 44, 355, width - 88, 55, 10);
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fill();

    let statusText = "🃏 Sıra sizde: Kart Çek veya Kal";
    let statusColor = "#38BDF8";
    if (status === "won") { statusText = "🎉 KAZANDINIZ!"; statusColor = "#10B981"; }
    else if (status === "lost") { statusText = "💥 KAYBETTİNİZ!"; statusColor = "#EF4444"; }
    else if (status === "bust") { statusText = "💥 BUST! 21 Aşıldı!"; statusColor = "#EF4444"; }
    else if (status === "push") { statusText = "🤝 BERABERE (Push)!"; statusColor = "#F59E0B"; }

    ctx.fillStyle = statusColor;
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText(statusText, 64, 389);

    ctx.fillStyle = "#F59E0B";
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(`Bahis: ${bet.toLocaleString("tr-TR")} Coin | Bakiye: ${balance.toLocaleString("tr-TR")}`, width - 64, 389);
    ctx.textAlign = "left";

    return canvas.toBuffer("image/png");
  }

  static renderSlotMachine({ reel1 = "🍒", reel2 = "🍋", reel3 = "🍇", won = false, multiplier = 0, amount = 0, balance = 0, bet = 0 }) {
    const width = 800;
    const height = 440;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#150826");
    bgGrad.addColorStop(0.5, "#2b0a45");
    bgGrad.addColorStop(1, "#110420");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    drawRoundedRect(ctx, 16, 16, width - 32, height - 32, 20);
    ctx.strokeStyle = "#EC4899";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#EC4899";
    ctx.font = `bold 24px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("🎰 PUBLIC BOT ARCADE : VEGAS SLOTS 🎰", width / 2, 54);

    const reelWidth = 180;
    const reelHeight = 160;
    const startX = (width - (reelWidth * 3 + 32)) / 2;

    const reels = [reel1, reel2, reel3];
    reels.forEach((r, idx) => {
      const rx = startX + idx * (reelWidth + 16);
      drawRoundedRect(ctx, rx, 100, reelWidth, reelHeight, 14);
      ctx.fillStyle = "#0c0617";
      ctx.fill();
      ctx.strokeStyle = won ? "#10B981" : "#38BDF8";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = `64px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText(r, rx + reelWidth / 2, 205);
    });

    drawRoundedRect(ctx, 44, 300, width - 88, 90, 12);
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fill();
    ctx.strokeStyle = won ? "#10B981" : "#4B5563";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = "left";
    if (won) {
      ctx.fillStyle = "#10B981";
      ctx.font = `bold 24px ${FONT}`;
      ctx.fillText(`🎉 TEBRİKLER! ${multiplier}x KAZANDINIZ! (+${amount.toLocaleString("tr-TR")} Coin)`, 64, 342);
    } else {
      ctx.fillStyle = "#EF4444";
      ctx.font = `bold 22px ${FONT}`;
      ctx.fillText(`Şansınızı Tekrar Deneyin! (-${bet.toLocaleString("tr-TR")} Coin)`, 64, 342);
    }

    ctx.fillStyle = "#9CA3AF";
    ctx.font = `14px ${FONT}`;
    ctx.fillText(`Güncel Cüzdan Bakiyesi: ${balance.toLocaleString("tr-TR")} Coin`, 64, 372);

    return canvas.toBuffer("image/png");
  }

  static getThemeSetsList() {
    return Object.values(THEME_SETS);
  }

  static async renderAnimatedUserStatCard({ user, periodText = "Genel", voiceHours = 0, messageCount = 0, level = 1, rank = 1, theme = "sakura", format = "gif", title = "", badges = [] }) {
    const t = getTheme(theme);
    const width = 800;
    const height = 460;
    const totalFrames = 30;
    const fps = 15;

    const tmpDir = path.join(os.tmpdir(), `bfe-anim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    let bgImg = null;
    if (t.bgFile) {
      const p = path.resolve("packages/core/assets/themes", t.bgFile);
      if (fs.existsSync(p)) {
        try {
          bgImg = await loadImage(p);
        } catch {}
      }
    }

    let userAvatarImg = null;
    if (user) {
      try {
        let avatarUrl = null;
        if (typeof user.displayAvatarURL === "function") {
          avatarUrl = user.displayAvatarURL({ extension: "png", size: 128, forceStatic: true });
        } else if (user.avatarURL) {
          avatarUrl = user.avatarURL;
        } else if (user.avatar && user.id) {
          avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
        }
        if (avatarUrl) {
          const res = await fetch(avatarUrl, { signal: AbortSignal.timeout(3000) });
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            userAvatarImg = await loadImage(buf);
          }
        }
      } catch {}
    }

    const particles = [];
    for (let i = 0; i < 24; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 3 + Math.random() * 6,
        speedX: 1 + Math.random() * 2,
        speedY: 1.5 + Math.random() * 2,
        rot: Math.random() * Math.PI * 2
      });
    }

    const avatarX = 40;
    const avatarY = 40;
    const avatarSize = 84;

    for (let f = 0; f < totalFrames; f++) {
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      VisualCard.drawThemeAnimatedBackground(ctx, width, height, t, f, totalFrames, bgImg);
      const pulse = Math.sin((f / totalFrames) * Math.PI * 2) * 0.5 + 0.5;

      drawRoundedRect(ctx, 16, 16, width - 32, height - 32, 16);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 + pulse * 0.25})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + pulse * 4, 0, Math.PI * 2);
      ctx.strokeStyle = t.primary;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      if (userAvatarImg) {
        ctx.drawImage(userAvatarImg, avatarX, avatarY, avatarSize, avatarSize);
      } else {
        ctx.fillStyle = t.primary;
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold 32px ${FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText((user?.username || "?").charAt(0).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2);
      }
      ctx.restore();

      const titleStr = title ? `${title} ` : "";
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold 24px ${FONT}`;
      ctx.textAlign = "left";
      ctx.fillText(`${titleStr}${user?.username || "Kullanici"} ✨`, 144, 72);

      const badgeList = Array.isArray(badges) && badges.length > 0 ? ` [${badges.slice(0, 4).join(" ")}]` : "";
      ctx.fillStyle = t.primary;
      ctx.font = `14px ${FONT}`;
      ctx.fillText(`${t.badge}${badgeList} : HAREKETLİ ANİMASYONLU KART`, 144, 100);

      const boxW = 224;
      const boxH = 92;
      const statsData = [
        { label: "🎙️ Ses Süresi", val: `${voiceHours} Saat`, sub: "Aktif Konuşma", color: t.primary },
        { label: "💬 Mesaj Sayısı", val: `${messageCount.toLocaleString("tr-TR")}`, sub: "Genel Sohbet", color: "#38BDF8" },
        { label: "⭐ Seviye", val: `Seviye ${level}`, sub: `Sıralama #${rank}`, color: "#F59E0B" }
      ];

      statsData.forEach((s, idx) => {
        const bx = 40 + idx * (boxW + 24);
        const by = 150;
        drawRoundedRect(ctx, bx, by, boxW, boxH, 12);
        ctx.fillStyle = t.boxBg;
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = s.color;
        ctx.font = `bold 14px ${FONT}`;
        ctx.fillText(s.label, bx + 16, by + 30);

        ctx.fillStyle = "#ffffff";
        ctx.font = `bold 24px ${FONT}`;
        ctx.fillText(s.val, bx + 16, by + 62);

        ctx.fillStyle = "#8b92a8";
        ctx.font = `11px ${FONT}`;
        ctx.fillText(s.sub, bx + 16, by + 80);
      });

      const barX = 40;
      const barY = 280;
      const barW = width - 80;
      const barH = 20;

      ctx.fillStyle = "#9CA3AF";
      ctx.font = `13px ${FONT}`;
      ctx.fillText(`Aktivite Düzeyi (${periodText} Dönemi)`, barX, barY - 10);

      drawProgressBar(ctx, barX, barY, barW, barH, 75, t.primary, t.secondary);

      const fillW = barW * 0.75;
      const shineX = (f / totalFrames) * barW;
      ctx.save();
      drawRoundedRect(ctx, barX, barY, fillW, barH, 10);
      ctx.clip();
      const shineGrad = ctx.createLinearGradient(barX + shineX - 30, barY, barX + shineX + 30, barY);
      shineGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
      shineGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.6)");
      shineGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = shineGrad;
      ctx.fillRect(barX + shineX - 30, barY, 60, barH);
      ctx.restore();

      ctx.fillStyle = "#8b92a8";
      ctx.font = `12px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("⚡ Public Bot Ecosystem : 15 FPS Looping Canlı Kart Motoru", width / 2, height - 32);

      const frameFile = path.join(tmpDir, `frame_${String(f).padStart(3, "0")}.png`);
      fs.writeFileSync(frameFile, canvas.toBuffer("image/png"));
    }

    const resultBuffer = VisualCard.compileFramesToVideo(tmpDir, fps, format);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return resultBuffer;
  }

  static compileFramesToVideo(tmpDir, fps = 15, format = "gif") {
    const inputPattern = path.join(tmpDir, "frame_%03d.png");
    let resultBuffer;
    if (format === "mp4") {
      const outMp4 = path.join(tmpDir, "output.mp4");
      const cmd = `ffmpeg -y -framerate ${fps} -i "${inputPattern}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${outMp4}"`;
      execSync(cmd, { stdio: "ignore" });
      resultBuffer = fs.readFileSync(outMp4);
    } else {
      const outGif = path.join(tmpDir, "output.gif");
      const cmd = `ffmpeg -y -framerate ${fps} -i "${inputPattern}" -filter_complex "split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" -loop 0 "${outGif}"`;
      execSync(cmd, { stdio: "ignore" });
      resultBuffer = fs.readFileSync(outGif);
    }
    return resultBuffer;
  }

  static drawThemeAnimatedBackground(ctx, width, height, t, f, totalFrames, bgImg) {
    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, width, height);
      ctx.fillStyle = "rgba(14, 10, 22, 0.70)";
      ctx.fillRect(0, 0, width, height);
    } else {
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, t.bgGrad?.[0] || "#120818");
      bgGrad.addColorStop(1, t.bgGrad?.[1] || "#08040d");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
    }

    const themeId = t.id || "sakura";
    const normTime = f / totalFrames;
    const loopSin = Math.sin(normTime * Math.PI * 2);

    ctx.save();

    if (themeId === "sakura") {
      for (let i = 0; i < 28; i++) {
        const seed = i * 47;
        const speedX = 1.2 + (seed % 3) * 0.6;
        const speedY = 1.8 + (seed % 4) * 0.7;
        const curX = ((seed * 19) + (f * speedX * 14)) % (width + 60) - 30;
        const curY = ((seed * 31) + (f * speedY * 16)) % (height + 60) - 30;
        const sway = Math.sin((f + seed) * 0.15) * 16;
        const rot = (seed * 0.2) + f * 0.08;
        const sz = 5 + (seed % 6);

        ctx.save();
        ctx.translate(curX + sway, curY);
        ctx.rotate(rot);
        ctx.fillStyle = i % 2 === 0 ? "rgba(255, 182, 193, 0.75)" : "rgba(255, 128, 171, 0.65)";
        ctx.beginPath();
        ctx.ellipse(0, 0, sz, sz * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (themeId === "torii-gate") {
      const shrineGrad = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, width * 0.45);
      shrineGrad.addColorStop(0, `rgba(225, 29, 72, ${0.18 + 0.08 * loopSin})`);
      shrineGrad.addColorStop(0.7, "rgba(244, 63, 94, 0.06)");
      shrineGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = shrineGrad;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 26; i++) {
        const seed = i * 53;
        const speedX = 1.4 + (seed % 3) * 0.5;
        const speedY = 1.5 + (seed % 3) * 0.6;
        const curX = ((seed * 23) + (f * speedX * 12)) % (width + 60) - 30;
        const curY = ((seed * 29) + (f * speedY * 14)) % (height + 60) - 30;
        const sway = Math.sin((f + seed) * 0.14) * 18;
        const rot = (seed * 0.25) + f * 0.09;
        const sz = 5 + (seed % 5);

        ctx.save();
        ctx.translate(curX + sway, curY);
        ctx.rotate(rot);
        ctx.fillStyle = i % 3 === 0 ? "rgba(244, 63, 94, 0.75)" : "rgba(255, 182, 193, 0.65)";
        ctx.beginPath();
        ctx.ellipse(0, 0, sz, sz * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (themeId === "lofi-rain") {
      for (let i = 0; i < 45; i++) {
        const seed = i * 37;
        const speed = 18 + (seed % 8);
        const rx = (seed * 23) % width;
        const ry = ((seed * 17) + f * speed * 2) % (height + 40) - 20;
        const len = 14 + (seed % 12);
        ctx.strokeStyle = "rgba(125, 211, 252, 0.45)";
        ctx.lineWidth = 1 + (seed % 2) * 0.5;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 3, ry + len);
        ctx.stroke();
      }
      for (let j = 0; j < 5; j++) {
        const jSeed = j * 83;
        const rippleX = (jSeed * 37) % (width - 100) + 50;
        const rippleY = height - 40 - (jSeed % 80);
        const ripplePhase = (f * 0.1 + j * 0.4) % 1;
        const rSize = ripplePhase * 28;
        const rAlpha = Math.max(0, 0.4 * (1 - ripplePhase));
        ctx.strokeStyle = `rgba(186, 230, 253, ${rAlpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(rippleX, rippleY, rSize, rSize * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (themeId === "autumn-leaves") {
      const colors = ["rgba(239, 68, 68, 0.75)", "rgba(249, 115, 22, 0.75)", "rgba(234, 179, 8, 0.75)"];
      for (let i = 0; i < 24; i++) {
        const seed = i * 53;
        const speedX = 1.5 + (seed % 3) * 0.8;
        const speedY = 1.6 + (seed % 3) * 0.7;
        const curX = ((seed * 29) + (f * speedX * 12)) % (width + 60) - 30;
        const curY = ((seed * 41) + (f * speedY * 14)) % (height + 60) - 30;
        const sway = Math.sin((f + seed) * 0.12) * 20;
        const rot = (seed * 0.3) + f * 0.1;
        const sz = 6 + (seed % 5);

        ctx.save();
        ctx.translate(curX + sway, curY);
        ctx.rotate(rot);
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.ellipse(0, 0, sz, sz * 0.55, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (themeId === "winter-shrine") {
      for (let i = 0; i < 42; i++) {
        const seed = i * 43;
        const speedY = 1.2 + (seed % 4) * 0.6;
        const curX = ((seed * 31) + Math.sin(f * 0.1 + seed) * 15) % width;
        const curY = ((seed * 19) + (f * speedY * 10)) % (height + 30) - 15;
        const sz = 2 + (seed % 4);
        const alpha = 0.35 + 0.35 * Math.sin(f * 0.1 + seed);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(curX, curY, sz, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "starry-sky" || themeId === "midnight-moon") {
      for (let i = 0; i < 36; i++) {
        const seed = i * 61;
        const sx = (seed * 37) % width;
        const sy = (seed * 23) % (height - 80);
        const twinkle = 0.25 + 0.55 * Math.abs(Math.sin((f * 0.2) + seed));
        const sz = 1.5 + (seed % 3);
        ctx.fillStyle = `rgba(224, 231, 255, ${twinkle})`;
        ctx.beginPath();
        ctx.arc(sx, sy, sz, 0, Math.PI * 2);
        ctx.fill();
      }
      if (f >= 6 && f <= 24) {
        const streakProgress = (f - 6) / 18;
        const startX = width * 0.7 - streakProgress * 420;
        const startY = 20 + streakProgress * 180;
        const streakGrad = ctx.createLinearGradient(startX + 90, startY - 40, startX, startY);
        streakGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
        streakGrad.addColorStop(1, "rgba(199, 210, 254, 0.85)");
        ctx.strokeStyle = streakGrad;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(startX + 90, startY - 40);
        ctx.lineTo(startX, startY);
        ctx.stroke();
      }
    } else if (themeId === "cyberpunk") {
      const scanY = (f * 18) % height;
      ctx.fillStyle = "rgba(6, 182, 212, 0.08)";
      ctx.fillRect(0, scanY, width, 18);
      for (let y = 0; y < height; y += 6) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
        ctx.fillRect(0, y, width, 2);
      }
      if (f % 5 === 0) {
        const gY = (f * 73) % (height - 40);
        ctx.fillStyle = "rgba(236, 72, 153, 0.18)";
        ctx.fillRect(0, gY, width, 6);
      }
    } else if (themeId === "neon-arcade") {
      const gridYStart = height - 130;
      ctx.strokeStyle = "rgba(236, 72, 153, 0.28)";
      ctx.lineWidth = 1.2;
      for (let x = -100; x <= width + 100; x += 60) {
        ctx.beginPath();
        ctx.moveTo(width / 2, gridYStart - 20);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      const offset = (f * 4) % 24;
      for (let y = gridYStart; y <= height; y += 16) {
        const curY = y + offset;
        if (curY <= height) {
          ctx.beginPath();
          ctx.moveTo(0, curY);
          ctx.lineTo(width, curY);
          ctx.stroke();
        }
      }
    } else if (themeId === "blood-moon") {
      const auraRad = 130 + Math.sin(f * 0.15) * 25;
      const auraGrad = ctx.createRadialGradient(width * 0.8, 80, 10, width * 0.8, 80, auraRad);
      auraGrad.addColorStop(0, "rgba(239, 68, 68, 0.45)");
      auraGrad.addColorStop(1, "rgba(239, 68, 68, 0)");
      ctx.fillStyle = auraGrad;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 18; i++) {
        const seed = i * 41;
        const sx = ((seed * 27) + (f * 4)) % (width + 100) - 50;
        const sy = ((seed * 19) + Math.sin(f * 0.1 + seed) * 10) % height;
        ctx.fillStyle = "rgba(185, 28, 28, 0.22)";
        ctx.beginPath();
        ctx.arc(sx, sy, 18 + (seed % 14), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "ghibli-forest") {
      for (let i = 0; i < 22; i++) {
        const seed = i * 59;
        const speedX = Math.sin(f * 0.1 + seed) * 1.5;
        const speedY = Math.cos(f * 0.08 + seed) * 1.2;
        const fx = ((seed * 37) + speedX * 20) % (width - 60) + 30;
        const fy = ((seed * 23) + speedY * 20) % (height - 60) + 30;
        const glow = 0.3 + 0.45 * Math.sin(f * 0.25 + seed);

        const rad = ctx.createRadialGradient(fx, fy, 1, fx, fy, 12);
        rad.addColorStop(0, `rgba(234, 179, 8, ${glow})`);
        rad.addColorStop(0.4, `rgba(132, 204, 22, ${glow * 0.6})`);
        rad.addColorStop(1, "rgba(132, 204, 22, 0)");
        ctx.fillStyle = rad;
        ctx.beginPath();
        ctx.arc(fx, fy, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "ocean-breeze") {
      for (let i = 0; i < 26; i++) {
        const seed = i * 47;
        const speedY = 1.4 + (seed % 4) * 0.7;
        const bx = ((seed * 29) + Math.sin(f * 0.15 + seed) * 12) % width;
        const by = height - (((seed * 17) + f * speedY * 12) % (height + 30));
        const bSz = 3 + (seed % 6);
        ctx.strokeStyle = "rgba(125, 211, 252, 0.55)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(bx, by, bSz, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (themeId === "sunset") {
      for (let i = 0; i < 24; i++) {
        const seed = i * 51;
        const speedY = 1.1 + (seed % 3) * 0.6;
        const mx = ((seed * 33) + Math.sin(f * 0.1 + seed) * 10) % width;
        const my = height - (((seed * 19) + f * speedY * 10) % (height + 30));
        const sz = 2 + (seed % 4);
        const alpha = 0.3 + 0.4 * Math.sin(f * 0.15 + seed);
        ctx.fillStyle = `rgba(251, 146, 60, ${alpha})`;
        ctx.beginPath();
        ctx.arc(mx, my, sz, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "dawn-afternoon") {
      const rayGrad = ctx.createLinearGradient(0, 0, width, height);
      rayGrad.addColorStop(0, `rgba(251, 191, 36, ${0.15 + 0.08 * loopSin})`);
      rayGrad.addColorStop(1, "rgba(56, 189, 248, 0.04)");
      ctx.fillStyle = rayGrad;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 20; i++) {
        const seed = i * 43;
        const px = ((seed * 27) + f * 4) % width;
        const py = ((seed * 39) + Math.sin(f * 0.12 + seed) * 14) % height;
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.beginPath();
        ctx.arc(px, py, 2 + (seed % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "galaxy-violet") {
      const cx = width / 2;
      const cy = height / 2;
      for (let i = 0; i < 30; i++) {
        const seed = i * 31;
        const angle = (seed * 0.2) + (f * 0.05);
        const dist = 40 + (seed % 280);
        const px = cx + Math.cos(angle) * dist;
        const py = cy + Math.sin(angle) * (dist * 0.55);
        const sz = 2 + (seed % 4);
        ctx.fillStyle = i % 2 === 0 ? "rgba(192, 132, 252, 0.65)" : "rgba(236, 72, 153, 0.55)";
        ctx.beginPath();
        ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "cloud-dream") {
      for (let i = 0; i < 6; i++) {
        const cSeed = i * 71;
        const cx = ((cSeed * 47) + f * 6) % (width + 200) - 100;
        const cy = 40 + (cSeed % (height - 120));
        const cRad = 35 + (cSeed % 25);
        const cGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, cRad);
        cGrad.addColorStop(0, "rgba(244, 114, 182, 0.18)");
        cGrad.addColorStop(0.6, "rgba(56, 189, 248, 0.12)");
        cGrad.addColorStop(1, "rgba(244, 114, 182, 0)");
        ctx.fillStyle = cGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, cRad, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let j = 0; j < 25; j++) {
        const sSeed = j * 37;
        const sx = ((sSeed * 29) + f * 3) % width;
        const sy = ((sSeed * 43) + Math.sin(f * 0.1 + sSeed) * 15) % height;
        const sAlpha = 0.25 + 0.35 * Math.sin(f * 0.2 + sSeed);
        ctx.fillStyle = j % 2 === 0 ? `rgba(251, 191, 36, ${sAlpha})` : `rgba(244, 114, 182, ${sAlpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 2 + (sSeed % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      for (let i = 0; i < 24; i++) {
        const seed = i * 39;
        const px = ((seed * 23) + f * 5) % width;
        const py = ((seed * 17) + Math.sin(f * 0.1 + seed) * 12) % height;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.25 + 0.25 * Math.sin(f + seed)})`;
        ctx.beginPath();
        ctx.arc(px, py, 2.5 + (seed % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  static async renderAnimatedLevelCard({ user, level = 1, currentXp = 0, requiredXp = 100, rank = 1, theme = "sakura", format = "gif" }) {
    const t = getTheme(theme);
    const width = 800;
    const height = 300;
    const totalFrames = 30;
    const fps = 15;

    const tmpDir = path.join(os.tmpdir(), `bfe-level-anim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    let bgImg = null;
    if (t.bgFile) {
      const p = path.resolve("packages/core/assets/themes", t.bgFile);
      if (fs.existsSync(p)) {
        try { bgImg = await loadImage(p); } catch {}
      }
    }

    let userAvatarImg = null;
    if (user) {
      try {
        let avatarUrl = null;
        if (typeof user.displayAvatarURL === "function") {
          avatarUrl = user.displayAvatarURL({ extension: "png", size: 128, forceStatic: true });
        } else if (user.avatarURL) {
          avatarUrl = user.avatarURL;
        } else if (user.avatar && user.id) {
          avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
        }
        if (avatarUrl) {
          const res = await fetch(avatarUrl, { signal: AbortSignal.timeout(3000) });
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            userAvatarImg = await loadImage(buf);
          }
        }
      } catch {}
    }

    const particles = [];
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 2 + Math.random() * 5,
        speedX: 1 + Math.random() * 1.5,
        speedY: 1 + Math.random() * 2
      });
    }

    const percent = Math.min(100, Math.max(0, Math.round((currentXp / Math.max(1, requiredXp)) * 100)));
    const avatarX = 40;
    const avatarY = 40;
    const avatarSize = 88;

    for (let f = 0; f < totalFrames; f++) {
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      VisualCard.drawThemeAnimatedBackground(ctx, width, height, t, f, totalFrames, bgImg);
      const pulse = Math.sin((f / totalFrames) * Math.PI * 2) * 0.5 + 0.5;

      drawRoundedRect(ctx, 16, 16, width - 32, height - 32, 16);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 + pulse * 0.2})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + pulse * 3, 0, Math.PI * 2);
      ctx.strokeStyle = t.primary;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      if (userAvatarImg) {
        ctx.drawImage(userAvatarImg, avatarX, avatarY, avatarSize, avatarSize);
      } else {
        ctx.fillStyle = t.primary;
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold 32px ${FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText((user?.username || "?").charAt(0).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2);
      }
      ctx.restore();

      ctx.fillStyle = "#ffffff";
      ctx.font = `bold 24px ${FONT}`;
      ctx.textAlign = "left";
      ctx.fillText(user?.username || "Kullanıcı", 152, 74);

      ctx.fillStyle = "#8c93a8";
      ctx.font = `14px ${FONT}`;
      ctx.fillText(`Kullanıcı ID: ${user?.id || "-"} : ${t.badge}`, 152, 102);

      ctx.fillStyle = t.primary;
      ctx.font = `bold 28px ${FONT}`;
      ctx.textAlign = "right";
      ctx.fillText(`SEVİYE ${level}`, width - 44, 74);

      ctx.fillStyle = "#F59E0B";
      ctx.font = `bold 16px ${FONT}`;
      ctx.fillText(`SIRA #${rank}`, width - 44, 102);
      ctx.textAlign = "left";

      const barX = 40;
      const barY = 175;
      const barW = width - 80;
      const barH = 24;

      ctx.fillStyle = "#9ca3af";
      ctx.font = `14px ${FONT}`;
      ctx.fillText(`Deneyim (XP): ${currentXp.toLocaleString("tr-TR")} / ${requiredXp.toLocaleString("tr-TR")}`, barX, barY - 12);

      ctx.fillStyle = t.primary;
      ctx.font = `bold 14px ${FONT}`;
      ctx.textAlign = "right";
      ctx.fillText(`%${percent}`, width - 40, barY - 12);
      ctx.textAlign = "left";

      drawProgressBar(ctx, barX, barY, barW, barH, percent, t.primary, t.secondary);

      const fillW = barW * (percent / 100);
      if (fillW > 0) {
        const shineX = (f / totalFrames) * barW;
        ctx.save();
        drawRoundedRect(ctx, barX, barY, fillW, barH, 12);
        ctx.clip();
        const shineGrad = ctx.createLinearGradient(barX + shineX - 30, barY, barX + shineX + 30, barY);
        shineGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
        shineGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.7)");
        shineGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = shineGrad;
        ctx.fillRect(barX + shineX - 30, barY, 60, barH);
        ctx.restore();
      }

      ctx.fillStyle = "#8b92a8";
      ctx.font = `12px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("⚡ Public Bot Ecosystem : 15 FPS Looping Canlı Seviye Kartı", width / 2, height - 24);

      const frameFile = path.join(tmpDir, `frame_${String(f).padStart(3, "0")}.png`);
      fs.writeFileSync(frameFile, canvas.toBuffer("image/png"));
    }

    const resultBuffer = VisualCard.compileFramesToVideo(tmpDir, fps, format);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return resultBuffer;
  }

  static async renderAnimatedCoinCard({ user, wallet = 0, bank = 0, theme = "sakura", format = "gif" }) {
    const t = getTheme(theme);
    const width = 760;
    const height = 400;
    const totalFrames = 30;
    const fps = 15;

    const tmpDir = path.join(os.tmpdir(), `bfe-coin-anim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    let bgImg = null;
    if (t.bgFile) {
      const p = path.resolve("packages/core/assets/themes", t.bgFile);
      if (fs.existsSync(p)) {
        try { bgImg = await loadImage(p); } catch {}
      }
    }

    let userAvatarImg = null;
    if (user) {
      try {
        let avatarUrl = null;
        if (typeof user.displayAvatarURL === "function") {
          avatarUrl = user.displayAvatarURL({ extension: "png", size: 128, forceStatic: true });
        } else if (user.avatarURL) {
          avatarUrl = user.avatarURL;
        } else if (user.avatar && user.id) {
          avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
        }
        if (avatarUrl) {
          const res = await fetch(avatarUrl, { signal: AbortSignal.timeout(3000) });
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            userAvatarImg = await loadImage(buf);
          }
        }
      } catch {}
    }

    const goldCoins = [];
    for (let i = 0; i < 22; i++) {
      goldCoins.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 4 + Math.random() * 7,
        speedY: 1.2 + Math.random() * 2,
        rotSpeed: 0.1 + Math.random() * 0.15
      });
    }

    const total = wallet + bank;

    for (let f = 0; f < totalFrames; f++) {
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      VisualCard.drawThemeAnimatedBackground(ctx, width, height, t, f, totalFrames, bgImg);

      const pulse = Math.sin((f / totalFrames) * Math.PI * 2) * 0.5 + 0.5;

      ctx.save();
      for (const coin of goldCoins) {
        const curY = (coin.y + coin.speedY * f * (height / (totalFrames * coin.speedY))) % height;
        const curRot = f * coin.rotSpeed;
        ctx.fillStyle = `rgba(245, 158, 11, ${0.3 + 0.3 * Math.sin(f + coin.size)})`;
        ctx.beginPath();
        ctx.ellipse(coin.x, curY, coin.size, coin.size * Math.abs(Math.cos(curRot)), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      drawRoundedRect(ctx, 16, 16, width - 32, height - 32, 20);
      ctx.strokeStyle = `rgba(245, 158, 11, ${0.25 + pulse * 0.35})`;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      drawRoundedRect(ctx, 44, 44, 52, 38, 6);
      ctx.fillStyle = "rgba(245, 158, 11, 0.2)";
      ctx.fill();
      ctx.strokeStyle = t.primary;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = t.primary;
      ctx.font = `bold 18px ${FONT}`;
      ctx.fillText("BOT FOR EVERYONE : FINANCIAL VIP", 112, 68);

      const avX = width - 96;
      const avY = 44;
      const avSize = 52;
      ctx.save();
      ctx.beginPath();
      ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2 + pulse * 2, 0, Math.PI * 2);
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
      ctx.clip();
      if (userAvatarImg) {
        ctx.drawImage(userAvatarImg, avX, avY, avSize, avSize);
      } else {
        ctx.fillStyle = t.primary;
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold 20px ${FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText((user?.username || "?").charAt(0).toUpperCase(), avX + avSize / 2, avY + avSize / 2);
      }
      ctx.restore();

      ctx.fillStyle = "#8f96ab";
      ctx.font = `13px ${FONT}`;
      ctx.textAlign = "left";
      ctx.fillText("TOPLAM NET VARLIK", 44, 134);

      ctx.fillStyle = t.primary;
      ctx.font = `bold 38px ${FONT}`;
      ctx.fillText(`${total.toLocaleString("tr-TR")} COIN`, 44, 178);

      const boxWidth = (width - 104) / 2;

      drawRoundedRect(ctx, 44, 210, boxWidth, 90, 12);
      ctx.fillStyle = t.boxBg;
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#8f96ab";
      ctx.font = `13px ${FONT}`;
      ctx.fillText("👛 CÜZDAN BAKİYESİ", 64, 242);
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold 24px ${FONT}`;
      ctx.fillText(`${wallet.toLocaleString("tr-TR")} Coin`, 64, 276);

      drawRoundedRect(ctx, 44 + boxWidth + 16, 210, boxWidth, 90, 12);
      ctx.fillStyle = t.boxBg;
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#8f96ab";
      ctx.font = `13px ${FONT}`;
      ctx.fillText("🏦 BANKA HESABI", 44 + boxWidth + 36, 242);
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold 24px ${FONT}`;
      ctx.fillText(`${bank.toLocaleString("tr-TR")} Coin`, 44 + boxWidth + 36, 276);

      ctx.fillStyle = "#9ca3af";
      ctx.font = `bold 14px ${FONT}`;
      ctx.fillText(`KART SAHİBİ: ${(user?.username || "KULLANICI").toUpperCase()}`, 44, 345);

      ctx.fillStyle = "#F59E0B";
      ctx.font = `12px ${FONT}`;
      ctx.textAlign = "right";
      ctx.fillText("⚡ CANLI DİJİTAL VARLIK KARTI", width - 44, 345);
      ctx.textAlign = "left";

      const frameFile = path.join(tmpDir, `frame_${String(f).padStart(3, "0")}.png`);
      fs.writeFileSync(frameFile, canvas.toBuffer("image/png"));
    }

    const resultBuffer = VisualCard.compileFramesToVideo(tmpDir, fps, format);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return resultBuffer;
  }

  static async renderAnimatedTopStatCard({ guild, ranking = [], type = "voice", theme = "sakura", format = "gif" }) {
    const t = getTheme(theme);
    const width = 800;
    const height = 460;
    const totalFrames = 30;
    const fps = 15;

    const tmpDir = path.join(os.tmpdir(), `bfe-top-anim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    let bgImg = null;
    if (t.bgFile) {
      const p = path.resolve("packages/core/assets/themes", t.bgFile);
      if (fs.existsSync(p)) {
        try { bgImg = await loadImage(p); } catch {}
      }
    }

    const isVoice = type === "voice";
    const titleText = isVoice ? "🎙️ SES AKTİFLİĞİ LİDERLİK TABLOSU" : "💬 MESAJ AKTİFLİĞİ LİDERLİK TABLOSU";

    for (let f = 0; f < totalFrames; f++) {
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      VisualCard.drawThemeAnimatedBackground(ctx, width, height, t, f, totalFrames, bgImg);
      const pulse = Math.sin((f / totalFrames) * Math.PI * 2) * 0.5 + 0.5;

      drawRoundedRect(ctx, 16, 16, width - 32, height - 32, 16);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 + pulse * 0.2})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = `bold 22px ${FONT}`;
      ctx.fillText(guild?.name || "Sunucu İstatistikleri", 44, 56);

      ctx.fillStyle = t.primary;
      ctx.font = `14px ${FONT}`;
      ctx.fillText(`${titleText} : CANLI SIRALAMA`, 44, 82);

      const top5 = ranking.slice(0, 5);
      top5.forEach((item, index) => {
        const rowY = 110 + index * 60;
        const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
        const medal = medals[index] || `#${index + 1}`;

        drawRoundedRect(ctx, 40, rowY, width - 80, 50, 10);
        ctx.fillStyle = index === 0 ? "rgba(245, 158, 11, 0.12)" : t.boxBg;
        ctx.fill();
        ctx.strokeStyle = index === 0 ? `rgba(245, 158, 11, ${0.3 + pulse * 0.3})` : "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = `20px ${FONT}`;
        ctx.fillText(medal, 56, rowY + 32);

        ctx.font = `bold 16px ${FONT}`;
        ctx.fillText(item.tag || item.username || `Kullanıcı ${item.userId}`, 100, rowY + 32);

        ctx.fillStyle = index === 0 ? "#F59E0B" : t.primary;
        ctx.font = `bold 16px ${FONT}`;
        ctx.textAlign = "right";
        ctx.fillText(item.formattedValue || `${item.value}`, width - 64, rowY + 32);
        ctx.textAlign = "left";
      });

      ctx.fillStyle = "#8b92a8";
      ctx.font = `12px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("⚡ Public Bot Ecosystem : 15 FPS Looping Canlı Sıralama Tablosu", width / 2, height - 24);

      const frameFile = path.join(tmpDir, `frame_${String(f).padStart(3, "0")}.png`);
      fs.writeFileSync(frameFile, canvas.toBuffer("image/png"));
    }

    const resultBuffer = VisualCard.compileFramesToVideo(tmpDir, fps, format);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return resultBuffer;
  }

  static async renderAnimatedCard({ type = "stat", data = {}, theme = "sakura", format = "gif" }) {
    const cleanType = String(type).toLowerCase().trim();
    if (cleanType === "level" || cleanType === "seviye" || cleanType === "rank") {
      return VisualCard.renderAnimatedLevelCard({ ...data, theme, format });
    }
    if (cleanType === "coin" || cleanType === "cuzdan" || cleanType === "wallet") {
      return VisualCard.renderAnimatedCoinCard({ ...data, theme, format });
    }
    if (cleanType === "topstat" || cleanType === "top") {
      return VisualCard.renderAnimatedTopStatCard({ ...data, theme, format });
    }
    return VisualCard.renderAnimatedUserStatCard({ ...data, theme, format });
  }
}
