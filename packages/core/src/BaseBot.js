import { Client, GatewayIntentBits, Partials, Collection, ActivityType } from "discord.js";
import { connectDatabase, GuildConfig, BotCredential, ChatMessage } from "@bot/database";
import { environment, defaultGuildConfig, getActiveDatabaseUri } from "@bot/config";
import { Logger } from "./Logger.js";
import { MessageFormatter } from "./MessageFormatter.js";

export class BaseBot extends Client {
  constructor(options = {}) {
    const intents = options.intents || [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildBans,
      GatewayIntentBits.GuildEmojisAndStickers
    ];

    super({
      intents,
      partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User, Partials.GuildMember]
    });

    this.serviceName = options.serviceName || "BOT";
    this.token = options.token || "";
    this.logger = new Logger(this.serviceName);
    this.commands = new Collection();
    this.aliases = new Collection();
    this.slashCommands = new Collection();
    this.interactions = new Collection();
    this.configs = new Map();

    this.setupInternalHandlers();
  }

  setupInternalHandlers() {
    this.on("ready", async () => {
      this.logger.success(`${this.user.tag} aktif ve göreve hazır.`);
    });

    if (this.serviceName === "MODERATION") {
      this.setupMessageTracking();
    }

    this.on("messageCreate", async (message) => {
      if (message.author.bot || !message.guild) return;

      const config = await this.getGuildConfig(message.guild.id);
      const prefix = config.prefix || ".";

      if (!message.content.startsWith(prefix)) return;

      const args = message.content.slice(prefix.length).trim().split(/ +/g);
      const commandTrigger = args.shift()?.toLowerCase();
      if (!commandTrigger) return;

      let matchedCommand = null;
      let isCommandDisabled = false;
      let isSlashOnly = false;

      for (const cmd of this.commands.values()) {
        const cmdCfg = config.commands?.get ? config.commands.get(cmd.name) : config.commands?.[cmd.name];
        const customName = cmdCfg?.customName || cmd.name;
        const isEnabled = cmdCfg?.enabled ?? true;
        const mode = cmdCfg?.mode || "BOTH";

        const customAliases = Array.isArray(cmdCfg?.customAliases)
          ? cmdCfg.customAliases.map((a) => String(a).toLowerCase().trim())
          : (typeof cmdCfg?.customAliases === "string"
              ? cmdCfg.customAliases.split(",").map((a) => a.toLowerCase().trim()).filter(Boolean)
              : []);
        const builtInAliases = cmd.aliases ? cmd.aliases.map((a) => String(a).toLowerCase()) : [];

        if (
          cmd.name.toLowerCase() === commandTrigger ||
          customName.toLowerCase() === commandTrigger ||
          builtInAliases.includes(commandTrigger) ||
          customAliases.includes(commandTrigger)
        ) {
          if (!isEnabled || mode === "DISABLED") {
            isCommandDisabled = true;
            matchedCommand = cmd;
            break;
          }
          if (mode === "SLASH") {
            isSlashOnly = true;
            matchedCommand = cmd;
            break;
          }
          matchedCommand = cmd;
          break;
        }
      }

      if (!matchedCommand) return;

      if (isCommandDisabled) {
        return message.reply("Bu özellik kapatılmış.").catch(() => null);
      }

      if (isSlashOnly) {
        return message.reply("Bu komut yalnızca slash (/) olarak kullanılabilir.").catch(() => null);
      }

      const cmdCfg = config.commands?.get ? config.commands.get(matchedCommand.name) : config.commands?.[matchedCommand.name];
      const allowedRoles = Array.isArray(cmdCfg?.allowedRoles) ? cmdCfg.allowedRoles : [];
      const minRole = cmdCfg?.minStaffRole;
      const isPrivileged = this.isBotOwner(message.author.id, config) || message.guild.ownerId === message.author.id || message.member.permissions.has("Administrator");
      if (allowedRoles.length > 0 && !isPrivileged) {
        const hasAllowedRole = allowedRoles.some((rId) => message.member.roles.cache.has(rId));
        if (!hasAllowedRole) {
          return message.reply(MessageFormatter.warn("Yetki Yetersiz", "Bu komutu kullanabilmek için gerekli yetkiniz bulunmuyor."));
        }
      } else if (minRole && !message.member.roles.cache.has(minRole) && !isPrivileged) {
        return message.reply(MessageFormatter.warn("Yetki Yetersiz", "Bu komutu kullanabilmek için gerekli yetkiniz bulunmuyor."));
      }

      const origReply = message.reply.bind(message);
      message.reply = async (options) => {
        if (options && typeof options === "object" && options.constructor?.name === "MessagePayload") {
          return origReply(options);
        }
        let payload = typeof options === "string" ? { content: options } : { ...options };
        if (!payload.embeds?.length && !payload.files?.length && !(payload.flags & 32768)) {
          if (payload.content) {
            payload = MessageFormatter.v2(payload.content, payload.components, payload.ephemeral);
          }
        }
        const sent = await origReply(payload);
        if (sent && typeof sent.edit === "function") {
          const origEdit = sent.edit.bind(sent);
          sent.edit = (editOptions) => {
            if (editOptions && typeof editOptions === "object" && editOptions.constructor?.name === "MessagePayload") {
              return origEdit(editOptions);
            }
            let editPayload = typeof editOptions === "string" ? { content: editOptions } : { ...editOptions };
            if (!editPayload.embeds?.length && !editPayload.files?.length && !(editPayload.flags & 32768)) {
              if (editPayload.content) {
                editPayload = MessageFormatter.v2(editPayload.content, editPayload.components, editPayload.ephemeral);
              }
            }
            return origEdit(editPayload);
          };
        }
        return sent;
      };

      try {
        await matchedCommand.execute({
          client: this,
          message,
          args,
          config
        });
      } catch (error) {
        this.logger.error(`Komut çalıştırma hatası: ${matchedCommand.name}`, error);
        message.reply(MessageFormatter.error("Hata Oluştu", "Komut çalıştırılırken bir sorun meydana geldi.")).catch(() => null);
      }
    });

    this.on("interactionCreate", async (interaction) => {
      if (typeof interaction.reply === "function") {
        const origIntReply = interaction.reply.bind(interaction);
        interaction.reply = (options) => {
          let payload = typeof options === "string" ? { content: options } : { ...options };
          if (!payload.embeds?.length && !payload.files?.length && !(payload.flags & 32768)) {
            if (payload.content) {
              payload = MessageFormatter.v2(payload.content, payload.components, payload.ephemeral);
            }
          }
          return origIntReply(payload);
        };
      }

      if (typeof interaction.followUp === "function") {
        const origIntFollowUp = interaction.followUp.bind(interaction);
        interaction.followUp = (options) => {
          let payload = typeof options === "string" ? { content: options } : { ...options };
          if (!payload.embeds?.length && !payload.files?.length && !(payload.flags & 32768)) {
            if (payload.content) {
              payload = MessageFormatter.v2(payload.content, payload.components, payload.ephemeral);
            }
          }
          return origIntFollowUp(payload);
        };
      }

      if (typeof interaction.update === "function") {
        const origIntUpdate = interaction.update.bind(interaction);
        interaction.update = (options) => {
          let payload = typeof options === "string" ? { content: options } : { ...options };
          if (!payload.embeds?.length && !payload.files?.length && !(payload.flags & 32768)) {
            if (payload.content) {
              payload = MessageFormatter.v2(payload.content, payload.components);
            }
          }
          return origIntUpdate(payload);
        };
      }

      if (interaction.isChatInputCommand()) {
        const cmd = this.slashCommands.get(interaction.commandName);
        if (!cmd) return;

        const config = await this.getGuildConfig(interaction.guildId);
        const cmdCfg = config.commands?.get ? config.commands.get(cmd.name || interaction.commandName) : config.commands?.[cmd.name || interaction.commandName];
        const isEnabled = cmdCfg?.enabled ?? true;
        const mode = cmdCfg?.mode || "BOTH";

        if (!isEnabled || mode === "DISABLED") {
          return interaction.reply({ content: "Bu özellik kapatılmış.", ephemeral: true }).catch(() => null);
        }

        if (mode === "PREFIX") {
          return interaction.reply({ content: "Bu komut yalnızca prefix ile kullanılabilir.", ephemeral: true }).catch(() => null);
        }

        const allowedRoles = Array.isArray(cmdCfg?.allowedRoles) ? cmdCfg.allowedRoles : [];
        const isPrivileged = this.isBotOwner(interaction.user.id, config) || interaction.guild?.ownerId === interaction.user.id || interaction.memberPermissions?.has("Administrator");
        if (allowedRoles.length > 0 && !isPrivileged) {
          const hasAllowedRole = allowedRoles.some((rId) => interaction.member?.roles?.cache?.has(rId));
          if (!hasAllowedRole) {
            return interaction.reply(MessageFormatter.warn("Yetki Yetersiz", "Bu komutu kullanabilmek için gerekli yetkiniz bulunmuyor.", [], true));
          }
        }

        try {
          await cmd.execute({ client: this, interaction, config });
        } catch (error) {
          this.logger.error(`Slash komut hatası: ${interaction.commandName}`, error);
          if (interaction.deferred || interaction.replied) {
            interaction.followUp(MessageFormatter.error("Hata Oluştu", "Komut çalıştırılırken bir sorun meydana geldi.", [], true)).catch(() => null);
          } else {
            interaction.reply(MessageFormatter.error("Hata Oluştu", "Komut çalıştırılırken bir sorun meydana geldi.", [], true)).catch(() => null);
          }
        }
      } else if (interaction.isButton() || (interaction.isAnySelectMenu && interaction.isAnySelectMenu()) || interaction.isStringSelectMenu() || (interaction.isUserSelectMenu && interaction.isUserSelectMenu()) || interaction.isModalSubmit()) {
        const customId = interaction.customId;
        for (const [prefix, handler] of this.interactions.entries()) {
          if (customId.startsWith(prefix)) {
            const config = await this.getGuildConfig(interaction.guildId);
            try {
              await handler({ client: this, interaction, config });
            } catch (error) {
              this.logger.error(`Etkileşim hatası: ${customId}`, error);
              if (!interaction.replied && !interaction.deferred) {
                interaction.reply(MessageFormatter.error("Hata Oluştu", "İşlem gerçekleştirilirken bir sorun meydana geldi.", [], true)).catch(() => null);
              }
            }
            break;
          }
        }
      }
    });
  }

  async getGuildConfig(guildId) {
    if (!guildId) return { ...defaultGuildConfig };
    const now = Date.now();
    const cached = this.configs.get(guildId);
    if (cached && (now - cached._cachedAt < 15000)) {
      return cached.doc;
    }

    let configDoc = await GuildConfig.findOne({ guildId });
    if (!configDoc) {
      configDoc = await GuildConfig.create({
        ...defaultGuildConfig,
        guildId
      });
    }

    this.configs.set(guildId, { doc: configDoc, _cachedAt: now });
    return configDoc;
  }

  async updateGuildConfig(guildId, updateData) {
    const updated = await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: updateData },
      { new: true, upsert: true }
    );
    this.configs.set(guildId, { doc: updated, _cachedAt: Date.now() });
    return updated;
  }

  registerCommand(cmd) {
    if (!cmd.name) return;
    this.commands.set(cmd.name, cmd);
    if (cmd.aliases && Array.isArray(cmd.aliases)) {
      for (const alias of cmd.aliases) {
        this.aliases.set(alias, cmd.name);
      }
    }
  }

  registerSlashCommand(cmd) {
    if (!cmd.data?.name) return;
    this.slashCommands.set(cmd.data.name, cmd);
  }

  registerInteraction(prefix, handler) {
    this.interactions.set(prefix, handler);
  }

  isBotOwner(userId, config) {
    if (!userId) return false;
    const owners = Array.isArray(config?.botOwners) ? config.botOwners : [];
    return owners.includes(String(userId));
  }

  hasStaffPermission(member, config, roleType = "staffRoles") {
    if (!member) return false;
    if (this.isBotOwner(member.id, config)) return true;
    if (member.guild && member.guild.ownerId === member.id) return true;
    if (member.permissions.has("Administrator")) return true;

    const allowedRoles = config.roles?.[roleType] || [];
    if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) return false;

    return allowedRoles.some((roleId) => member.roles.cache.has(roleId));
  }

  setupMessageTracking() {
    this.on("messageCreate", async (message) => {
      if (!message.guild || message.author?.bot) return;
      try {
        await ChatMessage.findOneAndUpdate(
          { messageId: message.id },
          {
            $set: {
              channelId: message.channel.id,
              guildId: message.guild.id,
              author: message.author.tag || message.author.username || "Bilinmiyor",
              authorId: message.author.id,
              authorAvatar: typeof message.author.displayAvatarURL === "function" ? message.author.displayAvatarURL() : "",
              content: message.content || "",
              timestamp: message.createdAt || new Date(),
              isDeleted: false,
              isEdited: false
            }
          },
          { upsert: true }
        );
      } catch {}
    });

    this.on("messageUpdate", async (oldMessage, newMessage) => {
      if (!newMessage.guild || newMessage.author?.bot) return;
      if (oldMessage?.content === newMessage.content) return;
      try {
        const updateData = {
          channelId: newMessage.channel.id,
          guildId: newMessage.guild.id,
          author: newMessage.author?.tag || newMessage.author?.username || "Bilinmiyor",
          authorId: newMessage.author?.id || "",
          authorAvatar: typeof newMessage.author?.displayAvatarURL === "function" ? newMessage.author.displayAvatarURL() : "",
          content: newMessage.content || "",
          isEdited: true,
          editedAt: new Date()
        };
        if (oldMessage?.content) {
          updateData.previousContent = oldMessage.content;
        }
        await ChatMessage.findOneAndUpdate(
          { messageId: newMessage.id },
          {
            $set: updateData,
            $push: {
              editHistory: {
                content: oldMessage?.content || "",
                editedAt: new Date()
              }
            }
          },
          { upsert: true }
        );
      } catch {}
    });

    this.on("messageDelete", async (message) => {
      if (!message.guild) return;
      try {
        const updateData = {
          channelId: message.channel?.id || message.channelId,
          isDeleted: true,
          deletedAt: new Date()
        };
        if (message.content) updateData.content = message.content;
        if (message.author) {
          updateData.author = message.author.tag || message.author.username;
          updateData.authorId = message.author.id;
          updateData.authorAvatar = typeof message.author.displayAvatarURL === "function" ? message.author.displayAvatarURL() : "";
        }
        await ChatMessage.findOneAndUpdate(
          { messageId: message.id },
          { $set: updateData },
          { upsert: true }
        );
      } catch {}
    });
  }

  async start(customToken = null) {
    try {
      const dbUri = getActiveDatabaseUri();
      await connectDatabase(dbUri, { provider: environment.databaseProvider });

      const cred = await BotCredential.findOne({ serviceKey: this.serviceName });
      const envTokenMap = {
        MODERATION: environment.tokens.moderation,
        REGISTER: environment.tokens.register,
        STATS: environment.tokens.stats,
        "GUARD-MAIN": environment.tokens.guardMain,
        GUARD_MAIN: environment.tokens.guardMain,
        GUARD_DISTRIBUTOR: Array.isArray(environment.tokens.distributor) ? environment.tokens.distributor[0] : environment.tokens.guardDistributor,
        VOICE_WELCOME: Array.isArray(environment.tokens.voiceWelcome) ? environment.tokens.voiceWelcome[0] : "",
        ECONOMY: environment.tokens.economy,
        UTILITY: environment.tokens.utility
      };
      let tokenToUse = customToken || (cred && cred.token ? cred.token : this.token) || envTokenMap[this.serviceName] || "";

      if (!tokenToUse) {
        this.logger.warn("Token tanımlanmadığı için bot başlatılamadı.");
        return false;
      }

      const activityTypeMap = {
        PLAYING: ActivityType.Playing,
        STREAMING: ActivityType.Streaming,
        LISTENING: ActivityType.Listening,
        WATCHING: ActivityType.Watching,
        CUSTOM: ActivityType.Custom,
        COMPETING: ActivityType.Competing
      };
      const mappedType = activityTypeMap[cred?.activityType] ?? ActivityType.Playing;

      if (this.isReady()) {
        if (cred?.activityText && this.user) {
          this.user.setPresence({
            activities: [{ name: cred.activityText, type: mappedType }],
            status: (cred.status || "online").toLowerCase()
          });
        }
        return true;
      }

      await this.login(tokenToUse);

      if (cred?.activityText && this.user) {
        this.user.setPresence({
          activities: [{ name: cred.activityText, type: mappedType }],
          status: (cred.status || "online").toLowerCase()
        });
      }
      return true;
    } catch (error) {
      this.logger.error("Giriş yapılırken hata meydana geldi:", error.message || error);
      return false;
    }
  }
}
