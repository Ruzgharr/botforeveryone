import { Client, GatewayIntentBits, Partials, Collection } from "discord.js";
import { connectDatabase, GuildConfig, BotCredential } from "@bot/database";
import { environment, defaultGuildConfig } from "@bot/config";
import { Logger } from "./Logger.js";

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

    this.on("messageCreate", async (message) => {
      if (message.author.bot || !message.guild) return;

      const config = await this.getGuildConfig(message.guild.id);
      const prefix = config.prefix || ".";

      if (!message.content.startsWith(prefix)) return;

      const args = message.content.slice(prefix.length).trim().split(/ +/g);
      const commandTrigger = args.shift()?.toLowerCase();
      if (!commandTrigger) return;

      let matchedCommand = null;

      for (const cmd of this.commands.values()) {
        const customName = config.commands?.get?.(cmd.name)?.customName || cmd.name;
        const isEnabled = config.commands?.get?.(cmd.name)?.enabled ?? true;

        if (!isEnabled) continue;

        if (customName.toLowerCase() === commandTrigger || cmd.aliases?.includes(commandTrigger)) {
          matchedCommand = cmd;
          break;
        }
      }

      if (!matchedCommand) return;

      const minRole = config.commands?.get?.(matchedCommand.name)?.minStaffRole;
      if (minRole && !message.member.roles.cache.has(minRole) && !message.member.permissions.has("Administrator")) {
        return message.reply({ content: "Bu komutu kullanabilmek için gerekli yetkiniz bulunmuyor." });
      }

      try {
        await matchedCommand.execute({
          client: this,
          message,
          args,
          config
        });
      } catch (error) {
        this.logger.error(`Komut çalıştırma hatası: ${matchedCommand.name}`, error);
        message.reply({ content: "Komut çalıştırılırken bir sorun oluştu." }).catch(() => null);
      }
    });

    this.on("interactionCreate", async (interaction) => {
      if (interaction.isChatInputCommand()) {
        const cmd = this.slashCommands.get(interaction.commandName);
        if (!cmd) return;

        const config = await this.getGuildConfig(interaction.guildId);
        try {
          await cmd.execute({ client: this, interaction, config });
        } catch (error) {
          this.logger.error(`Slash komut hatası: ${interaction.commandName}`, error);
          if (interaction.deferred || interaction.replied) {
            interaction.followUp({ content: "Komut çalıştırılırken bir hata oluştu.", ephemeral: true }).catch(() => null);
          } else {
            interaction.reply({ content: "Komut çalıştırılırken bir hata oluştu.", ephemeral: true }).catch(() => null);
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
                interaction.reply({ content: "İşlem gerçekleştirilirken bir hata oluştu.", ephemeral: true }).catch(() => null);
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

  hasStaffPermission(member, config, roleType = "staffRoles") {
    if (!member) return false;
    if (member.permissions.has("Administrator")) return true;

    const allowedRoles = config.roles?.[roleType] || [];
    if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) return false;

    return allowedRoles.some((roleId) => member.roles.cache.has(roleId));
  }

  async start(customToken = null) {
    try {
      await connectDatabase(environment.mongoUri);

      let tokenToUse = customToken || this.token;
      let cred = null;

      cred = await BotCredential.findOne({ serviceKey: this.serviceName });
      if (!tokenToUse && cred && cred.token) {
        tokenToUse = cred.token;
      }

      if (!tokenToUse) {
        this.logger.warn("Token tanımlanmadığı için bot başlatılamadı.");
        return false;
      }

      if (this.isReady()) {
        if (cred?.activityText && this.user) {
          this.user.setPresence({
            activities: [{ name: cred.activityText }],
            status: (cred.status || "online").toLowerCase()
          });
        }
        return true;
      }

      await this.login(tokenToUse);

      if (cred?.activityText && this.user) {
        this.user.setPresence({
          activities: [{ name: cred.activityText }],
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
