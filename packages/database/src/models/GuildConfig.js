import mongoose from "mongoose";

const GuildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  prefix: { type: String, default: "." },
  tag: { type: String, default: "" },
  secondaryTag: { type: String, default: "" },
  roles: {
    man: { type: [String], default: [] },
    woman: { type: [String], default: [] },
    member: { type: [String], default: [] },
    unregistered: { type: [String], default: [] },
    suspicious: { type: [String], default: [] },
    tagRole: { type: String, default: "" },
    booster: { type: String, default: "" },
    jail: { type: String, default: "" },
    chatMute: { type: String, default: "" },
    voiceMute: { type: String, default: "" },
    warnRoles: { type: [String], default: [] },
    staffRoles: { type: [String], default: [] },
    registerStaff: { type: [String], default: [] },
    moderationStaff: { type: [String], default: [] },
    vip: { type: String, default: "" }
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
    provider: { type: String, enum: ["MONGODB", "POSTGRESQL", "MYSQL", "MARIADB", "SQLITE"], default: "MONGODB" },
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
  economyMarket: {
    goldPrice: { type: Number, default: 2500 },
    btcPrice: { type: Number, default: 65000 },
    lastUpdate: { type: Date, default: Date.now }
  },
  messages: {
    jailPunish: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "{user} kullanıcısı {staff} tarafından karantinaya (jail) gönderildi. Sebep: {reason} | Ceza Puanı: +{points}" }
    },
    jailLift: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "{user} kullanıcısının karantina cezası {staff} tarafından kaldırıldı." }
    },
    mutePunish: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "{user} kullanıcısı {staff} tarafından metin kanallarında susturuldu. Sebep: {reason}" }
    },
    muteLift: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "{user} kullanıcısının metin susturması {staff} tarafından kaldırıldı." }
    },
    vmutePunish: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "{user} kullanıcısı {staff} tarafından ses kanallarında susturuldu. Sebep: {reason}" }
    },
    vmuteLift: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "{user} kullanıcısının ses susturması {staff} tarafından kaldırıldı." }
    },
    banPunish: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "{user} kullanıcısı {staff} tarafından sunucudan yasaklandı. Sebep: {reason}" }
    },
    banLift: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "{user} kullanıcısının sunucu yasağı {staff} tarafından kaldırıldı." }
    },
    sicilClean: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "{user} adına kayıtlı herhangi bir ceza bulunmuyor. Toplam Ceza Puanı: 0" }
    },
    sicilRecord: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "{user} kullanıcısının sicil kaydı:\nToplam Ceza Puanı: {points}\n\n{records}" }
    },
    penaltyPoints: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "{user} adlı kullanıcının aktif ceza puanı: {points} / {limit}" }
    },
    snipeEmpty: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "Bu kanalda son silinen herhangi bir mesaj bulunmuyor." }
    },
    snipeMessage: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "Yazar: <@{authorId}>\nİçerik: {content}\nZaman: {time}" }
    },
    registerWelcome: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "Aramıza hoş geldin {user}! Kayıt olmak için ses teyit odalarına bağlanabilirsiniz." }
    },
    registerSuccess: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "{user} kullanıcısı {staff} tarafından {gender} olarak başarıyla kayıt edildi." }
    },
    suspiciousAlert: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "{user} hesabınız 7 günden yeni olduğu için güvenlik nedeniyle şüpheli karantinasına alındı." }
    },
    serverStats: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "Toplam Üye: {total}\nTaglı Üye: {tagged}\nSesteki Üye: {voice}\nTakviye Sayısı: {boosts}" }
    },
    nameChanged: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "{user} kullanıcısının ismi {name} olarak güncellendi ve sicile işlendi." }
    },
    nameHistory: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "{user} kullanıcısının geçmiş isimleri (Toplam {count}):\n\n{records}" }
    },
    coinBalance: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "{user} Bakiye Durumu:\nCüzdan: {wallet} Coin\nBanka: {bank} Coin" }
    },
    dailyReward: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "{user} günlük ödülünüz olan {amount} Coin hesabınıza aktarıldı!" }
    },
    coinTransferSuccess: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "{user} başarıyla {target} kullanıcısına {amount} Coin gönderdi." }
    },
    blackjackTable: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "Bahis: {bet} Coin\nSizin Kartlarınız: [ {cards} ] (Toplam: {total})\nKrupiye: [ {dealer} - ? ]" }
    },
    blackjackWin: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "Tebrikler! Krupiyeyi yenerek {amount} Coin kazandınız. Yeni Bakiye: {balance}" }
    },
    blackjackLose: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "Krupiye kazandı. {amount} Coin kaybettiniz. Yeni Bakiye: {balance}" }
    },
    blackjackPush: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "Berabere! Bahis miktarınız olan {amount} Coin iade edildi. Yeni Bakiye: {balance}" }
    },
    slotWin: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "[ {reel1} | {reel2} | {reel3} ]\nTebrikler! {multiplier}x katlayarak {amount} Coin kazandınız. Yeni Bakiye: {balance}" }
    },
    slotLose: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "[ {reel1} | {reel2} | {reel3} ]\nBu turda kazanamadınız. {amount} Coin kaybettiniz. Yeni Bakiye: {balance}" }
    },
    ruletWin: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "Top {color} ({number}) üzerine düştü!\nTebrikler! {amount} Coin kazandınız. Yeni Bakiye: {balance}" }
    },
    ruletLose: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "Top {color} ({number}) üzerine düştü!\nKaybettiniz: {amount} Coin. Yeni Bakiye: {balance}" }
    },
    customRoomCreated: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "{user} özel ses odanız oluşturuldu: {channel}" }
    },
    roomLocked: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "Oda başarıyla kilitlendi. Yabancı üyeler artık odaya katılamaz." }
    },
    roomUnlocked: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "Oda kilidi açıldı. Artık tüm üyeler katılabilir." }
    },
    ticketCreated: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "{user} destek talebiniz açıldı: {channel}" }
    },
    ticketClosed: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "Destek talebi sonlandırıldı. Kanal 5 saniye içinde silinecektir..." }
    },
    userStats: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "{user} Aktivite İstatistikleri:\nSes Aktifliği (Toplam / Hafta / Gün): {totalVoice} / {weeklyVoice} / {dailyVoice}\nMesaj Aktifliği (Toplam / Hafta / Gün): {totalMsgs} / {weeklyMsgs} / {dailyMsgs}" }
    },
    topStats: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "{guild} En Aktifler Sıralaması:\n\n{ranking}" }
    },
    staffTask: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "{user} Haftalık Görev Durumu:\nSes: {voiceHours} Saat\nMesaj: {msgs} Mesaj\nKayıt: {regs} Kayıt\nToplam Puan: {points}" }
    },
    attendanceReport: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "Toplantı Raporu - Kanal: {channel}\nKatılan Yetkili: {attendedCount} | Katılmayan: {missingCount}\nKatılanlar: {attendedList}" }
    },
    guardAlert: {
      format: { type: String, enum: ["EMBED", "COMPONENTS_V2", "PLAIN"], default: "EMBED" },
      content: { type: String, default: "Güvenlik Bildirimi: {user} yetkisiz işlem gerçekleştirdi: {reason}" }
    }
  }
}, { timestamps: true });

export const GuildConfig = mongoose.model("GuildConfig", GuildConfigSchema);
