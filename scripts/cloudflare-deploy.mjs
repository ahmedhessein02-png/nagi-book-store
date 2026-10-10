import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const configPath='dist/server/wrangler.json',config=JSON.parse(readFileSync(configPath,'utf8'));
if(config.name!=='nagi-book-store'||config.d1_databases?.[0]?.database_id==='00000000-0000-4000-8000-000000000000')throw Error('Run npm run build:cloudflare before deployment.');
for(const args of [['d1','migrations','apply','DB','--remote','--config',configPath],['deploy','--config',configPath]]){
 const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{stdio:'inherit'});
 if(result.status!==0)process.exit(result.status||1);
}
