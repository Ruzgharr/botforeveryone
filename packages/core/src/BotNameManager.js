import { BotCredential, decryptToken } from "@bot/database";
import { environment } from "@bot/config";

export class BotNameManager {
  static getServiceToken(serviceKey) {
    const key = String(serviceKey).toUpperCase();
    const envKeyMap = {
      MODERATION: environment.tokens.moderation,
      REGISTER: environment.tokens.register,
      STATS: environment.tokens.stats,
      GUARD_MAIN: environment.tokens.guardMain,
      GUARD_DISTRIBUTOR: environment.tokens.guardDistributor,
      VOICE_WELCOME: environment.tokens.voiceWelcome,
      ECONOMY: environment.tokens.economy,
      UTILITY: environment.tokens.utility
    };
    return envKeyMap[key] || "";
  }

  static async updateBotName({ serviceKey, newName, guildId = null }) {
    if (!serviceKey || !newName) {
      return { success: false, error: "serviceKey ve newName zorunludur" };
    }

    const trimmedName = String(newName).trim();
    if (trimmedName.length < 2 || trimmedName.length > 32) {
      return { success: false, error: "Bot ismi 2 ile 32 karakter arasında olmalıdır" };
    }

    const upperKey = String(serviceKey).toUpperCase();
    let cred = await BotCredential.findOne({ serviceKey: upperKey });
    let token = (cred?.token ? decryptToken(cred.token) : "") || this.getServiceToken(upperKey);

    let globalUpdated = false;
    let nicknameUpdated = false;
    let globalError = null;

    if (token) {
      try {
        const patchUserRes = await fetch("https://discord.com/api/v10/users/@me", {
          method: "PATCH",
          headers: {
            Authorization: `Bot ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ username: trimmedName })
        });

        if (patchUserRes.ok) {
          globalUpdated = true;
        } else {
          const errData = await patchUserRes.json().catch(() => ({}));
          globalError = errData.message || `Discord API Yanıtı: ${patchUserRes.status}`;
        }
      } catch (err) {
        globalError = err.message;
      }

      try {
        let targetGuilds = [];
        if (guildId) {
          targetGuilds.push(guildId);
        } else {
          const guildsRes = await fetch("https://discord.com/api/v10/users/@me/guilds", {
            headers: { Authorization: `Bot ${token}` }
          });
          if (guildsRes.ok) {
            const list = await guildsRes.json();
            targetGuilds = list.map((g) => g.id);
          }
        }

        for (const gId of targetGuilds) {
          const nickRes = await fetch(`https://discord.com/api/v10/guilds/${gId}/members/@me`, {
            method: "PATCH",
            headers: {
              Authorization: `Bot ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ nick: trimmedName })
          });
          if (nickRes.ok) {
            nicknameUpdated = true;
          }
        }
      } catch {}
    }

    if (cred) {
      cred.name = trimmedName;
      await cred.save();
    } else {
      await BotCredential.create({
        serviceKey: upperKey,
        name: trimmedName,
        token: token || "",
        enabled: true
      });
    }

    let summaryMessage = `Bot ismi '${trimmedName}' olarak ayarlandı.`;
    if (globalUpdated) {
      summaryMessage += " Discord genel bot kullanıcı adı başarıyla güncellendi.";
    } else if (globalError) {
      summaryMessage += ` Discord genel kullanıcı adı uyarısı: ${globalError}.`;
    }
    if (nicknameUpdated) {
      summaryMessage += " Sunucu içi görünen takma ad güncellendi.";
    }

    return {
      success: true,
      name: trimmedName,
      serviceKey: upperKey,
      globalUpdated,
      nicknameUpdated,
      globalError,
      message: summaryMessage
    };
  }
}
