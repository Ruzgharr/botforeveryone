import mongoose from "mongoose";
import { defaultGuildConfig } from "@bot/config";

const messageFields = {};
for (const [key, val] of Object.entries(defaultGuildConfig.messages || {})) {
  messageFields[key] = {
    format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "COMPONENTS_V2" },
    content: { type: String, default: val.content }
  };
}

const GuildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  prefix: { type: String, default: "." },
  tag: { type: String, default: "" },
  secondaryTag: { type: String, default: "" },
  botOwners: { type: [String], default: [] },
  roles: {
    man: { type: [String], default: [] },
    woman: { type: [String], default: [] },
    member: { type: [String], default: [] },
    unregistered: { type: [String], default: [] },
    suspicious: { type: [String], default: [] },
    tagRole: { type: [String], default: [] },
    booster: { type: [String], default: [] },
    jail: { type: [String], default: [] },
    chatMute: { type: [String], default: [] },
    voiceMute: { type: [String], default: [] },
    warnRoles: { type: [String], default: [] },
    staffRoles: { type: [String], default: [] },
    registerStaff: { type: [String], default: [] },
    moderationStaff: { type: [String], default: [] },
    vip: { type: [String], default: [] }
  },
  channels: {
    generalChat: { type: String, default: "" },
    registerChat: { type: String, default: "" },
    welcomeVoice: { type: [String], default: [] },
    inviteLog: { type: String, default: "" },
    penaltyLog: { type: String, default: "" },
    registerLog: { type: String, default: "" },
    voiceLog: { type: String, default: "" },
    messageLog: { type: String, default: "" },
    guardLog: { type: String, default: "" },
    ticketCategory: { type: String, default: "" },
    customVoiceCategory: { type: String, default: "" },
    customVoiceChannel: { type: String, default: "" },
    mediaChannels: { type: [String], default: [] },
    weeklyRewardLog: { type: String, default: "" }
  },
  autoResponders: { type: [Object], default: [] },
  weeklyRewards: { type: [Object], default: [] },
  limits: {
    pointLimit: { type: Number, default: 100 },
    banLimit: { type: Number, default: 3 },
    kickLimit: { type: Number, default: 3 },
    jailLimit: { type: Number, default: 5 },
    roleDeleteLimit: { type: Number, default: 1 },
    roleCreateLimit: { type: Number, default: 2 },
    channelDeleteLimit: { type: Number, default: 1 },
    channelCreateLimit: { type: Number, default: 2 }
  },
  guard: {
    active: { type: Boolean, default: true },
    safeUsers: { type: [String], default: [] },
    safeRoles: { type: [String], default: [] },
    safeBots: { type: [String], default: [] },
    blockWebhooks: { type: Boolean, default: true },
    blockBots: { type: Boolean, default: true }
  },
  commands: { type: Map, of: Object, default: {} },
  databaseProvider: {
    provider: { type: String, enum: ["MONGODB", "POSTGRESQL", "MYSQL", "MARIADB", "SQLITE"], default: "POSTGRESQL" },
    connectionUri: { type: String, default: "" }
  },
  penaltyThresholds: {
    mute: { type: Number, default: 40 },
    jail: { type: Number, default: 80 },
    ban: { type: Number, default: 150 }
  },
  leveling: {
    enabled: { type: Boolean, default: true },
    messageXp: { type: Number, default: 15 },
    voiceXpPerMinute: { type: Number, default: 20 },
    roleRewards: { type: [Object], default: [] }
  },
  guardPanic: {
    enabled: { type: Boolean, default: true },
    threshold: { type: Number, default: 5 },
    timeWindowMs: { type: Number, default: 5000 },
    isPanic: { type: Boolean, default: false }
  },
  permissionAudit: {
    enabled: { type: Boolean, default: true },
    dangerousPermissions: { type: [String], default: ["Administrator", "ManageGuild", "ManageRoles", "ManageChannels", "BanMembers", "KickMembers"] }
  },
  filters: {
    customWords: { type: [String], default: [] },
    linkFilter: { type: Boolean, default: true },
    capsFilter: { type: Boolean, default: true },
    spamFilter: { type: Boolean, default: true }
  },
  economyConfig: {
    currencyName: { type: String, default: "Coin" },
    currencySymbol: { type: String, default: "🪙" },
    startingBalance: { type: Number, default: 100 },
    dailyMin: { type: Number, default: 250 },
    dailyMax: { type: Number, default: 750 },
    workCooldownMinutes: { type: Number, default: 15 },
    workMin: { type: Number, default: 100 },
    workMax: { type: Number, default: 350 },
    robSuccessRate: { type: Number, default: 45 },
    robCooldownMinutes: { type: Number, default: 30 },
    robMinWallet: { type: Number, default: 200 },
    transferTaxPercent: { type: Number, default: 5 },
    depositInterestRate: { type: Number, default: 12 },
    channels: { type: [String], default: [] }
  },
  economyMarket: {
    goldPrice: { type: Number, default: 2500 },
    btcPrice: { type: Number, default: 65000 },
    silverPrice: { type: Number, default: 85 },
    discountPercent: { type: Number, default: 0 },
    minGoldPrice: { type: Number, default: 1000 },
    maxGoldPrice: { type: Number, default: 10000 },
    minBtcPrice: { type: Number, default: 20000 },
    maxBtcPrice: { type: Number, default: 250000 },
    autoFluctuation: { type: Boolean, default: true },
    lastUpdate: { type: Date, default: Date.now }
  },
  itemPrices: { type: Map, of: Number, default: {} },
  disabledItems: { type: [String], default: [] },
  clanSystem: {
    enabled: { type: Boolean, default: true },
    createCost: { type: Number, default: 10000 },
    maxMembersBase: { type: Number, default: 15 },
    requireApproval: { type: Boolean, default: false },
    minNameLength: { type: Number, default: 3 },
    maxNameLength: { type: Number, default: 24 },
    minTagLength: { type: Number, default: 2 },
    maxTagLength: { type: Number, default: 6 },
    channels: { type: [String], default: [] }
  },
  battlePassSystem: {
    enabled: { type: Boolean, default: true },
    season: { type: Number, default: 1 }
  },
  badgeSystem: {
    enabled: { type: Boolean, default: true },
    customBadges: { type: [Object], default: [] }
  },
  petSystem: {
    enabled: { type: Boolean, default: true },
    basePrice: { type: Number, default: 5000 },
    feedCost: { type: Number, default: 200 }
  },
  casinoSettings: {
    enabled: { type: Boolean, default: true },
    minBet: { type: Number, default: 10 },
    maxBet: { type: Number, default: 50000 },
    kazikazanCost: { type: Number, default: 50 },
    lotteryTicketCost: { type: Number, default: 100 },
    casinoTaxPercent: { type: Number, default: 3 },
    channels: { type: [String], default: [] },
    games: {
      blackjack: { type: Boolean, default: true },
      rulet: { type: Boolean, default: true },
      slot: { type: Boolean, default: true },
      yazitura: { type: Boolean, default: true },
      kazikazan: { type: Boolean, default: true },
      piyango: { type: Boolean, default: true }
    },
    multipliers: {
      blackjackNatural: { type: Number, default: 2.5 },
      rouletteGreen: { type: Number, default: 14 },
      slotJackpot: { type: Number, default: 10 },
      slotDiamond: { type: Number, default: 5 },
      slotFruit: { type: Number, default: 3 },
      kazikazanJackpot: { type: Number, default: 50 }
    },
    duel: {
      enabled: { type: Boolean, default: true },
      minBet: { type: Number, default: 50 },
      maxBet: { type: Number, default: 100000 },
      timeoutSeconds: { type: Number, default: 60 },
      taxPercent: { type: Number, default: 2 },
      channels: { type: [String], default: [] }
    }
  },
  messages: messageFields
}, { timestamps: true });

export const GuildConfig = mongoose.model("GuildConfig", GuildConfigSchema);
