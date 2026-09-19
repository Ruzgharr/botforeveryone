import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
let checked=0, commands=0, failures=0;
async function scan(dir) {
 for(const entry of await readdir(dir,{withFileTypes:true})) {
  const file=path.join(dir,entry.name);
  if(entry.isDirectory()){await scan(file);continue;}
  if(!file.endsWith('.js'))continue;
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});checked++;
  if(result.status!==0){failures++;console.log(file,result.stderr);}
  if(file.includes(`${path.sep}commands${path.sep}`)){
   try {const {default:command}=await import(pathToFileURL(path.resolve(file)));if(!command?.name||typeof command.execute!=='function')throw new Error('Invalid command export');commands++;}catch(e){failures++;console.log(file,e.message);}
  }
 }
}
await scan('apps');await scan('packages');console.log(JSON.stringify({checked,commands,failures}));process.exit(failures?1:0);
