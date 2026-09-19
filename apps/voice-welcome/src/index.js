import { environment, getActiveDatabaseUri } from "@bot/config";
import { connectDatabase } from "@bot/database";
import { VoiceWelcomeManager } from "./VoiceWelcomeManager.js";

const welcomeManager = new VoiceWelcomeManager();

export async function startVoiceWelcome() {
  const dbUri = getActiveDatabaseUri();
  await connectDatabase(dbUri, { provider: environment.databaseProvider });
  await welcomeManager.start(environment.tokens.voiceWelcome);
}

export default welcomeManager;

if (process.argv[1]?.endsWith("apps/voice-welcome/src/index.js") || process.argv[1]?.endsWith("apps\\voice-welcome\\src\\index.js")) {
  startVoiceWelcome();
}
