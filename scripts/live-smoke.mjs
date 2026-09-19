import 'dotenv/config';
import { once } from 'node:events';
import { writeFile } from 'node:fs/promises';
import { Collection, ChannelType } from 'discord.js';
import { connectDatabase, disconnectDatabase, GuildConfig, VoiceBot } from '@bot/database';
import { defaultGuildConfig, environment } from '@bot/config';
const guildId=process.env.DEFAULT_GUILD_ID;
if (!guildId) throw new Error('DEFAULT_GUILD_ID is required');
await connectDatabase(environment.mongoUri);
const botIds=Object.entries(process.env).filter(([k])=>/^TOKENS?_/.test(k)).map(([,t])=>Buffer.from(t.split('.')[0],'base64').toString());
let config=await GuildConfig.findOne({guildId});
if (!config) config=await GuildConfig.create({...defaultGuildConfig,guildId,guard:{...defaultGuildConfig.guard,safeBots:botIds}});
const results=[]; const clients=[];
const timeout=setTimeout(()=>{console.error('Live smoke timeout');process.exit(1)},180000);
async function run(name,fn) {try {const details=await fn();results.push({name,pass:true,...details});console.log('PASS',name,JSON.stringify(details||{}));}catch(e){results.push({name,pass:false,error:e.message});console.error('FAIL',name,e.message);}}
let channelId;
for (const [service,command] of [['moderation','cezapuan'],['register','say'],['stats','seviye'],['guard-main','korumabilgi'],['economy','coin'],['utility','ping']]) {
 await run(service,async()=>{
  const {default:client}=await import(`../apps/${service}/src/index.js`); clients.push(client);
  const ready=once(client,'clientReady',{signal:AbortSignal.timeout(20000)});
  const [started]=await Promise.all([client.start(),ready]);
  if(!started||!client.isReady())throw new Error('Bot did not become ready');
  const guild=await client.guilds.fetch(guildId);
  await guild.members.fetch(); await guild.channels.fetch();
  if(!channelId){const channel=guild.channels.cache.find(c=>c.name==='bfe-test'&&c.type===ChannelType.GuildText)||await guild.channels.create({name:'bfe-test',type:ChannelType.GuildText,topic:'Bot For Everyone: bot integration tests'});channelId=channel.id;}
  const channel=await client.channels.fetch(channelId); const member=await guild.fetchOwner();
  const pending=[];
  const message={guild,channel,member,author:member.user,mentions:{users:new Collection(),members:new Collection(),roles:new Collection(),channels:new Collection()},reply(payload){const p=channel.send({...payload,allowedMentions:{parse:[]}});pending.push(p);return p;}};
  await client.commands.get(command).execute({client,message,args:[],config});
  const sent=await Promise.all(pending); if(sent.length===0)throw new Error('Command produced no reply');
  for(const m of sent)await channel.messages.fetch(m.id);
  return {bot:client.user.username,command,replies:sent.length};
 });
}
await run('guard-distributor',async()=>{
 const {default:pool}=await import('../apps/guard-distributor/src/index.js'); await pool.start();
 clients.push(...pool.clients); if(!pool.clients.length)throw new Error('No distributor clients ready');
 const guild=await pool.queueTask(()=>pool.getNextClient().guilds.fetch(guildId));
 const {BackupService}=await import('../apps/guard-main/src/services/BackupService.js');
 await guild.channels.fetch();await guild.roles.fetch();const backup=await BackupService.createGuildBackup(guild,'MANUAL');
 return {bot:pool.clients[0].user.username,backup:backup.id,queue:true};
});
await run('voice-welcome',async()=>{
 const {default:manager}=await import('../apps/voice-welcome/src/index.js');
 const utility=clients.find(c=>c.serviceName==='UTILITY');if(!utility)throw new Error('Utility unavailable for voice setup');
 const guild=await utility.guilds.fetch(guildId);await guild.channels.fetch();
 const channel=guild.channels.cache.find(c=>c.name==='bfe-ses-test'&&c.type===ChannelType.GuildVoice)||await guild.channels.create({name:'bfe-ses-test',type:ChannelType.GuildVoice});
 const doc=await VoiceBot.findOneAndUpdate({token:environment.tokens.voiceWelcome[0]},{$set:{guildId,channelId:channel.id,status:'ACTIVE',name:'BFE6',welcomeMessage:'Bot testi başarılı. Hoş geldiniz.'}},{new:true,upsert:true});
 await manager.spawnBot(doc);const client=manager.clients.get(doc.token);if(!client)throw new Error('Voice login failed');clients.push(client);
 if(!client.isReady())await once(client,'clientReady',{signal:AbortSignal.timeout(20000)});
 const botGuild=await client.guilds.fetch(guildId);
 const connection=manager.joinChannel(botGuild,channel.id);
 if(!connection)throw new Error('Voice transport is missing; raw Gateway join is insufficient for audio');
 const {entersState,VoiceConnectionStatus}=await import('@discordjs/voice');
 await entersState(connection,VoiceConnectionStatus.Ready,20000);
 connection.destroy();return {bot:client.user.username,voiceTransport:'Ready'};
});
await writeFile('.system_generated/live-results.json',JSON.stringify({at:new Date(),guildId,channelId,results},null,2));
for(const client of clients)await client.destroy();await disconnectDatabase();clearTimeout(timeout);
process.exit(results.every(r=>r.pass)?0:1);
