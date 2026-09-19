import { Client, GatewayIntentBits } from "discord.js";
import { joinVoiceChannel } from "@discordjs/voice";
import { VoiceBot, GuildConfig } from "@bot/database";
import { Logger } from "@bot/core";

export class VoiceWelcomeManager {
  constructor() {
    this.clients = new Map();
    this.logger = new Logger("VOICE-WELCOME");
  }

  async start(initialTokens = []) {
    for (const token of initialTokens) {
      const exists = await VoiceBot.findOne({ token });
      if (!exists) {
        await VoiceBot.create({
          token,
          name: "Ses Karşılama",
          status: "ACTIVE"
        });
      } else if (exists.status !== "CONNECTED" && exists.status !== "ACTIVE") {
        await VoiceBot.updateOne({ _id: exists._id }, { $set: { status: "ACTIVE" } });
      }
    }

    await this.syncVoiceBots();
    this.syncTimer ||= setInterval(() => this.syncVoiceBots().catch((error) => this.logger.error("Ses senkronizasyon hatası:", error.message)), 30000);
  }

  async stop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    for (const client of this.clients.values()) {
      try {
        await client.destroy();
      } catch {}
    }
    this.clients.clear();
  }

  async syncVoiceBots() {
    const activeBots = await VoiceBot.find({ status: { $in: ["ACTIVE", "CONNECTED"] } });

    for (const botDoc of activeBots) {
      if (!this.clients.has(botDoc.token)) {
        await this.spawnBot(botDoc);
      } else {
        const client = this.clients.get(botDoc.token);
        if (client?.isReady?.()) {
          await this.ensureBotInChannel(client, botDoc);
        }
      }
    }

    for (const [token, client] of this.clients.entries()) {
      const stillActive = activeBots.some((b) => b.token === token);
      if (!stillActive) {
        client.destroy();
        this.clients.delete(token);
        this.logger.info("Ses karşılama botu sistemden çıkarıldı.");
      }
    }
  }

  async ensureBotInChannel(client, botDoc) {
    try {
      const guilds = client.guilds.cache;
      for (const guild of guilds.values()) {
        const config = await GuildConfig.findOne({ guildId: guild.id });
        const welcomeChannels = config?.channels?.welcomeVoice || [];
        const allBots = await VoiceBot.find({ status: { $in: ["ACTIVE", "CONNECTED"] } });
        const botIdx = allBots.findIndex((b) => b._id.toString() === botDoc._id.toString());
        const targetChannelId = botDoc.channelId || (welcomeChannels.length > 0 ? welcomeChannels[(botIdx >= 0 ? botIdx : 0) % welcomeChannels.length] : null);

        if (targetChannelId) {
          const currentVoiceChannelId = guild.members.me?.voice?.channelId;
          if (currentVoiceChannelId === targetChannelId) {
            continue;
          }
          const channel = guild.channels.cache.get(targetChannelId) || await guild.channels.fetch(targetChannelId).catch(() => null);
          if (channel && channel.isVoiceBased()) {
            this.joinChannel(guild, channel.id);
            this.logger.success(`Ses botu (${client.user.tag}) #${channel.name} ses odasına başarıyla bağlandı.`);
          }
        }
      }
    } catch (err) {
      this.logger.error("Ses kanalına bağlanırken hata oluştu:", err.message);
    }
  }

  async spawnBot(botDoc) {
    try {
      const client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildVoiceStates
        ]
      });

      client.on("ready", async () => {
        this.logger.success(`Ses Karşılama Botu (${client.user.tag}) başarıyla bağlandı.`);

        client.user.setPresence({
          activities: [{ name: "Ses Karşılama | 7/24 Aktif", type: 0 }],
          status: "online"
        });

        await VoiceBot.updateOne({ _id: botDoc._id }, { $set: { status: "CONNECTED", name: client.user.username } });
        await this.ensureBotInChannel(client, botDoc);
      });

      client.on("voiceStateUpdate", async (oldState, newState) => {
        const config = await GuildConfig.findOne({ guildId: newState.guild.id });
        const welcomeChannels = config?.channels?.welcomeVoice || [];
        const allBots = await VoiceBot.find({ status: { $in: ["ACTIVE", "CONNECTED"] } });
        const botIdx = allBots.findIndex((b) => b._id.toString() === botDoc._id.toString());
        const targetChannelId = botDoc.channelId || (welcomeChannels.length > 0 ? welcomeChannels[(botIdx >= 0 ? botIdx : 0) % welcomeChannels.length] : null);

        if (newState.id === client.user.id && !newState.channelId) {
          if (targetChannelId && botDoc.autoReconnect !== false) {
            setTimeout(() => {
              this.ensureBotInChannel(client, botDoc);
            }, 3000);
          }
          return;
        }

        if (!oldState.channelId && newState.channelId && !newState.member?.user?.bot) {
          if (newState.channelId === targetChannelId) {
            this.handleUserJoin(client, newState.member, botDoc, config);
          }
        }
      });

      await client.login(botDoc.token);
      this.clients.set(botDoc.token, client);
    } catch (error) {
      this.logger.error("Ses karşılama botu başlatılamadı:", error.message || error);
      await VoiceBot.updateOne({ _id: botDoc._id }, { $set: { status: "ERROR" } });
    }
  }

  joinChannel(guild, channelId) {
    return joinVoiceChannel({
      guildId: guild.id,
      channelId,
      adapterCreator: guild.voiceAdapterCreator,
      selfMute: false,
      selfDeaf: true
    });
  }

  async handleUserJoin(client, member, botDoc, config) {
    const rawMsg = botDoc.welcomeMessage || "Sunucumuza hoş geldiniz.";
    const welcomeText = rawMsg.replace("{user}", member.displayName || member.user.username);
    const speaker = botDoc.voiceSpeaker || "tr-TR-AhmetNeural";
    const delaySec = typeof botDoc.welcomeDelay === "number" ? botDoc.welcomeDelay : 2.5;
    const delayMs = Math.max(300, Math.min(20000, Math.round(delaySec * 1000)));

    this.logger.info(`Ses karşılama: ${member.displayName} odaya katıldı. ${delaySec} sn bekleme başlatıldı (${speaker}).`);

    await new Promise((resolve) => setTimeout(resolve, delayMs));

    if (member.voice?.channelId !== member.guild?.members?.me?.voice?.channelId) {
      this.logger.info(`Ses karşılama iptal: ${member.displayName} bekleme süresinde odadan ayrıldı.`);
      return;
    }

    try {
      const voiceModule = await import("@discordjs/voice").catch(() => null);
      if (!voiceModule) return;
      const { createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } = voiceModule;
      const connection = getVoiceConnection(member.guild.id) || this.joinChannel(member.guild, member.voice.channelId);

      let resource = null;

      if (speaker !== "google-tr") {
        try {
          const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
          const tts = new MsEdgeTTS();
          await tts.setMetadata(speaker, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_OPUS);
          const streamData = tts.toStream(welcomeText);
          resource = createAudioResource(streamData.audioStream || streamData);
        } catch (edgeErr) {
          this.logger.warn("MsEdgeTTS akışı alınamadı, Google TTS deneniyor:", edgeErr.message);
        }
      }

      if (!resource) {
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=tr&client=tw-ob&q=${encodeURIComponent(welcomeText)}`;
        resource = createAudioResource(ttsUrl);
      }

      const player = createAudioPlayer();
      player.on("error", (error) => this.logger.warn("Ses oynatma hatası:", error.message));
      player.play(resource);
      connection.subscribe(player);

      player.on(AudioPlayerStatus.Idle, () => {
        player.stop();
      });
    } catch (err) {
      this.logger.warn("TTS ses akışı başlatılamadı:", err.message || err);
    }
  }
}
