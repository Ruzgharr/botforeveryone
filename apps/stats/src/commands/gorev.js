import { StaffTask } from "@bot/database";
import { MessageFormatter } from "@bot/core";

function makeProgressBar(current, target, size = 10) {
  const percent = Math.min(Math.max(current / (target || 1), 0), 1);
  const filled = Math.round(size * percent);
  const empty = size - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}] %${Math.round(percent * 100)}`;
}

export default {
  name: "görev",
  aliases: ["gorev", "gorevlerim", "task"],
  async execute({ client, message, args, config }) {
    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : message.author);

    const now = new Date();
    const weekNumber = Math.ceil(now.getDate() / 7);
    const year = now.getFullYear();

    const task = await StaffTask.findOne({ guildId: message.guild.id, userId: targetUser.id, weekNumber, year });

    const currentVoiceHours = Math.floor((task?.currentVoiceMs || 0) / (1000 * 60 * 60));
    const targetVoiceHours = Math.floor((task?.targetVoiceMs || 36000000) / (1000 * 60 * 60));

    const currentMsgs = task?.currentMessages || 0;
    const targetMsgs = task?.targetMessages || 500;

    const currentRegs = task?.currentRegisters || 0;
    const targetRegs = task?.targetRegisters || 5;

    const voiceBar = makeProgressBar(currentVoiceHours, targetVoiceHours);
    const msgBar = makeProgressBar(currentMsgs, targetMsgs);
    const regBar = makeProgressBar(currentRegs, targetRegs);

    const payload = MessageFormatter.render("staffTask", {
      user: targetUser,
      voiceHours: `${currentVoiceHours}/${targetVoiceHours} Saat (${voiceBar})`,
      msgs: `${currentMsgs}/${targetMsgs} Mesaj (${msgBar})`,
      regs: `${currentRegs}/${targetRegs} Kayıt (${regBar})`,
      points: task?.points || 0,
      title: `${targetUser.tag} - Haftalık Görev Durumu`
    }, config, message.guild);

    message.reply(payload);
  }
};
