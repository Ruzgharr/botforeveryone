import test from 'node:test';
import assert from 'node:assert/strict';
import { Embeds } from '../packages/core/src/Embeds.js';
import { PunishService } from '../apps/guard-main/src/services/PunishService.js';
const guild = {name:'Test',ownerId:'owner',iconURL:()=> 'https://cdn.discordapp.com/embed/avatars/0.png'};
test('base supports title/description/guild used by commands',()=>{
 const data=Embeds.base('Title','Description',guild).toJSON();
 assert.equal(data.title,'Title'); assert.equal(data.description,'Description'); assert.equal(data.footer.text,'Test');
});
test('existing guild-only embed builders still work',()=>{
 assert.equal(Embeds.base(guild).toJSON().footer.text,'Test');
 assert.equal(Embeds.success('OK','Done',guild).toJSON().description,'Done');
 assert.doesNotThrow(()=>Embeds.base());
});
test('trusted bots are safe executors but a human cannot inherit bot trust',()=>{
 const config={guard:{safeBots:['trusted']}};
 const member={id:'trusted',user:{id:'trusted',bot:true},guild,roles:{cache:new Map()}};
 assert.equal(PunishService.isSafe(member,config),true);
 assert.equal(PunishService.isSafe({...member,user:{id:'trusted',bot:false}},config),false);
 assert.equal(PunishService.isSafe({...member,id:'other',user:{id:'other',bot:true}},config),false);
});

test('grafik accepts prefix commands and handles zero message totals',async()=>{
 const {Stat}=await import('@bot/database');
 const {default:command}=await import('../apps/stats/src/commands/grafik.js');
 const original=Stat.find; const replies=[];
 Stat.find=async()=>[{channelMessages:new Map([['123',0]])}];
 try {
  await command.execute({message:{guild:{...guild,id:'g'},reply:p=>{replies.push(p);return Promise.resolve(p)}},args:['15']});
  assert.equal(command.name,'grafik');
  assert.equal(replies.length,1);
  assert.match(replies[0].embeds[0].toJSON().description,/0/);
 }finally{Stat.find=original;}
});
