import { ChatMessage } from "@bot/database";
import { ModerationUI } from "../services/ModerationUI.js";

export default {
  name: "snipe",
  aliases: ["sonsilinek", "silinen", "editsnipe", "duzenlenen"],
  async execute({ client, message, args = [], config }) {
    const isEditMode = args[0]?.toLowerCase() === "edit" || args[0]?.toLowerCase() === "düzenlenen" || args[0]?.toLowerCase() === "duzenlenen" || message.content.includes("editsnipe");
    const type = isEditMode ? "edit" : "delete";

    const filter = type === "edit"
      ? { channelId: message.channel.id, isEdited: true }
      : { channelId: message.channel.id, isDeleted: true };

    let records = await ChatMessage.find(filter)
      .sort(type === "edit" ? { editedAt: -1, timestamp: -1 } : { deletedAt: -1, timestamp: -1 })
      .limit(10)
      .catch(() => []);

    if ((!records || records.length === 0) && type === "delete") {
      const memorySniped = client.snipes?.get(message.channel.id);
      if (memorySniped) {
        records = [memorySniped];
      }
    }

    const payload = ModerationUI.buildSnipePayload({
      type,
      records,
      index: 0,
      channelId: message.channel.id
    });

    return message.reply(payload);
  }
};
