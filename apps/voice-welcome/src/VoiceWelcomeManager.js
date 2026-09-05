import { Client, GatewayIntentBits } from "discord.js";
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
      }
    }

    await this.syncVoiceBots();
    setInterval(() => this.syncVoiceBots(), 30000);
  }

  async syncVoiceBots() {
    const activeBots = await VoiceBot.find({ status: { $in: ["ACTIVE", "CONNECTED"] } });

    for (const botDoc of activeBots) {
      if (!this.clients.has(botDoc.token)) {
        await this.spawnBot(botDoc);
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

        await VoiceBot.updateOne({ _id: botDoc._id }, { $set: { status: "CONNECTED" } });

        const guilds = client.guilds.cache;
        for (const guild of guilds.values()) {
          const config = await GuildConfig.findOne({ guildId: guild.id });
          const welcomeChannels = config?.channels?.welcomeVoice || [];
          const allBots = await VoiceBot.find({ status: { $in: ["ACTIVE", "CONNECTED"] } });
          const botIdx = allBots.findIndex((b) => b._id.toString() === botDoc._id.toString());
          const targetChannelId = botDoc.channelId || (welcomeChannels.length > 0 ? welcomeChannels[(botIdx >= 0 ? botIdx : 0) % welcomeChannels.length] : null);

          if (targetChannelId) {
            const channel = guild.channels.cache.get(targetChannelId);
            if (channel && channel.isVoiceBased()) {
              this.joinChannel(guild, channel.id);
            }
          }
        }
      });

      client.on("voiceStateUpdate", async (oldState, newState) => {
        const config = await GuildConfig.findOne({ guildId: newState.guild.id });
        const welcomeChannels = config?.channels?.welcomeVoice || [];
        const allBots = await VoiceBot.find({ status: { $in: ["ACTIVE", "CONNECTED"] } });
        const botIdx = allBots.findIndex((b) => b._id.toString() === botDoc._id.toString());
        const targetChannelId = botDoc.channelId || (welcomeChannels.length > 0 ? welcomeChannels[(botIdx >= 0 ? botIdx : 0) % welcomeChannels.length] : null);

        if (newState.id === client.user.id && !newState.channelId) {
          if (targetChannelId) {
            setTimeout(() => {
              this.joinChannel(newState.guild, targetChannelId);
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
    if (guild.shard) {
      guild.shard.send({
        op: 4,
        d: {
          guild_id: guild.id,
          channel_id: channelId,
          self_mute: false,
          self_deaf: true
        }
      });
    }
  }

  async handleUserJoin(client, member, botDoc, config) {
    const rawMsg = botDoc.welcomeMessage || "Sunucumuza hoş geldiniz.";
    const welcomeText = rawMsg.replace("{user}", member.displayName || member.user.username);
    this.logger.info(`Ses karşılama: ${member.displayName} odaya katıldı. Mesaj: "${welcomeText}"`);

    try {
      const voiceModule = await import("@discordjs/voice").catch(() => null);
      if (voiceModule) {
        const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = voiceModule;
        const connection = joinVoiceChannel({
          channelId: member.voice.channelId,
          guildId: member.guild.id,
          adapterCreator: member.guild.voiceAdapterCreator
        });

        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=tr&client=tw-ob&q=${encodeURIComponent(welcomeText)}`;
        const player = createAudioPlayer();
        const resource = createAudioResource(ttsUrl);

        player.play(resource);
        connection.subscribe(player);

        player.on(AudioPlayerStatus.Idle, () => {
          player.stop();
        });
      }
    } catch (err) {
      this.logger.warn("TTS ses akışı başlatılamadı:", err.message || err);
    }
  }
}
