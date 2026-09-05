import { environment } from "@bot/config";
import { connectDatabase } from "@bot/database";
import { VoiceWelcomeManager } from "./VoiceWelcomeManager.js";

const welcomeManager = new VoiceWelcomeManager();

export async function startVoiceWelcome() {
  await connectDatabase(environment.mongoUri);
  await welcomeManager.start(environment.tokens.voiceWelcome);
}

export default welcomeManager;

if (process.argv[1]?.endsWith("apps/voice-welcome/src/index.js") || process.argv[1]?.endsWith("apps\\voice-welcome\\src\\index.js")) {
  startVoiceWelcome();
}
