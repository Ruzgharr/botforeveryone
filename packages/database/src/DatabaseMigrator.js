const MODEL_NAMES = [
  "GuildConfig",
  "Penalty",
  "UserAccount",
  "Stat",
  "StaffTask",
  "Economy",
  "Backup",
  "VoiceBot",
  "Ticket",
  "BotCredential",
  "StaffKpi",
  "MarketItem",
  "ShopItem",
  "ForceBan",
  "InviteRecord",
  "ChatMessage"
];

export class DatabaseMigrator {
  static async migrate(sourceGetter, targetGetter) {
    const report = {
      startedAt: new Date().toISOString(),
      counts: {},
      totalRecords: 0,
      errors: []
    };

    for (const modelName of MODEL_NAMES) {
      try {
        const sourceModel = sourceGetter(modelName);
        const targetModel = targetGetter(modelName);

        if (!sourceModel || !targetModel) continue;

        let records = [];
        if (typeof sourceModel.find === "function") {
          const query = sourceModel.find({});
          records = typeof query.lean === "function" ? await query.lean() : await query;
        }

        if (!Array.isArray(records) || records.length === 0) {
          report.counts[modelName] = 0;
          continue;
        }

        let migratedCount = 0;
        for (const rawDoc of records) {
          try {
            const cleanDoc = JSON.parse(JSON.stringify(rawDoc));
            if (cleanDoc._id) {
              cleanDoc._id = String(cleanDoc._id);
            }
            await targetModel.create(cleanDoc);
            migratedCount++;
          } catch (itemErr) {
            report.errors.push({ model: modelName, error: itemErr.message });
          }
        }

        report.counts[modelName] = migratedCount;
        report.totalRecords += migratedCount;
      } catch (modelErr) {
        report.errors.push({ model: modelName, error: modelErr.message });
      }
    }

    report.finishedAt = new Date().toISOString();
    return report;
  }
}
