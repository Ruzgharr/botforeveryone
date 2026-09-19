import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { writeFile } from 'node:fs/promises';
const results = [];
for (const key of ['TOKEN_MODERATION','TOKEN_REGISTER','TOKEN_STATS','TOKEN_GUARD_MAIN','TOKENS_DISTRIBUTOR','TOKENS_VOICE_WELCOME','TOKEN_ECONOMY','TOKEN_UTILITY']) {
  const minimal = key === 'TOKENS_VOICE_WELCOME';
  const intents = minimal ? [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] : [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, ...(key === 'TOKENS_DISTRIBUTOR' ? [] : [GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent,GatewayIntentBits.GuildVoiceStates])];
  const client = new Client({intents});
  client.on('error', () => {});
  let timer;
  try {
    const ready = new Promise((resolve, reject) => {
      client.once('clientReady', resolve);
      timer = setTimeout(() => reject(new Error('Gateway readiness timeout')), 20000);
    });
    await Promise.all([client.login(process.env[key]), ready]);
    const result = {service:key,ready:client.isReady(),name:client.user.username,guilds:client.guilds.cache.map(g=>({id:g.id,name:g.name}))};
    results.push(result); console.log(JSON.stringify(result));
  } catch(error) {
    const result = {service:key,ready:false,error:error.message};
    results.push(result); console.log(JSON.stringify(result));
  } finally { clearTimeout(timer); await client.destroy(); }
}
await writeFile('.system_generated/gateway-results.json', JSON.stringify(results,null,2));
process.exit(results.every(r=>r.ready) ? 0 : 1);
