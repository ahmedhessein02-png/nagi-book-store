import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';
const dir=mkdtempSync(join(tmpdir(),'nagi-auth-')),db=new DatabaseSync(':memory:');
for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('drizzle/'+file,'utf8'));

function statement(sql,params=[]){return {bind(...args){return statement(sql,args)},async first(){return db.prepare(sql).get(...params)||null},async run(){return db.prepare(sql).run(...params)}}}
globalThis.__env={DB:{prepare:statement,async batch(stmts){db.exec('BEGIN');try{const r=await Promise.all(stmts.map(s=>s.run()));db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}}};
function compile(source,target){let s=readFileSync(source,'utf8').replace(/import \{env\} from 'cloudflare:workers';/,"const env=globalThis.__env;").replace(/import \{isOwner\} from '[^']+';/,"const isOwner=async()=>globalThis.__owner;").replace(/from '\.\/admin-crypto'/g,"from './crypto.mjs'").replace(/from '\.\.\/\.\.\/\.\.\/\.\.\/lib\/admin-crypto'/g,"from './crypto.mjs'").replace(/from '\.\.\/\.\.\/\.\.\/\.\.\/lib\/admin-auth'/g,"from './auth.mjs'").replace(/from '\.\.\/\.\.\/\.\.\/\.\.\/lib\/order-utils'/g,"from './utils.mjs'");writeFileSync(join(dir,target),ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText)}
try{
 compile('lib/admin-crypto.ts','crypto.mjs');compile('lib/admin-auth.ts','auth.mjs');compile('lib/order-utils.ts','utils.mjs');for(const route of ['login','setup','logout'])compile(`app/api/admin/${route}/route.ts`,route+'.mjs');
 const auth=await import(join(dir,'auth.mjs')),login=await import(join(dir,'login.mjs')),setup=await import(join(dir,'setup.mjs')),logout=await import(join(dir,'logout.mjs'));
 const credentials={username:'nagi.admin',password:'A long unique admin passphrase!'};
 const crypt=await import(join(dir,'crypto.mjs'));const salt=crypt.randomToken();
 globalThis.__env.NAGI_INITIAL_ADMIN=JSON.stringify({username:credentials.username,salt,password_hash:await crypt.passwordHash(credentials.password,salt),revision:crypt.randomToken()});
 assert.equal((await auth.credential()).username,credentials.username);
 const initialRevision=(await auth.credential()).revision;

 const request=(path,body,origin='https://store.test',cookie='')=>new Request('https://store.test'+path,{method:'POST',headers:{origin,'Content-Type':'application/json','cf-connecting-ip':'192.0.2.1',cookie},body:JSON.stringify(body)});
 assert.equal((await setup.POST(request('/api/admin/setup',credentials))).status,503);
 globalThis.__env.NAGI_SETUP_TOKEN=crypt.randomToken();
 assert.equal((await setup.POST(request('/api/admin/setup',credentials))).status,403);
 const setupCredentials={...credentials,setupToken:globalThis.__env.NAGI_SETUP_TOKEN};
 assert.equal((await setup.POST(request('/api/admin/setup',setupCredentials,'https://evil.test'))).status,403);
 assert.equal((await setup.POST(request('/api/admin/setup',{...setupCredentials,password:'short'}))).status,400);
 const provision=await setup.POST(request('/api/admin/setup',setupCredentials));assert.equal(provision.status,200);assert.notEqual((await auth.credential()).revision,initialRevision);
 const cookie=provision.headers.get('set-cookie');assert.match(cookie,/HttpOnly; Secure; SameSite=Strict/);assert.ok(!db.prepare('SELECT password_hash FROM admin_credentials').get().password_hash.includes(credentials.password));
 const page=c=>new Request('https://store.test/dashboard',{headers:{cookie:c||''}});
 assert.equal(await auth.isAdmin(page()),false);assert.equal(await auth.isAdmin(page('__Host-nagi_admin='+ 'a'.repeat(64))),false);assert.equal(await auth.isAdmin(page(cookie)),true);
 const invalid=await login.POST(request('/api/admin/login',{...credentials,password:'incorrect'}));assert.equal(invalid.status,401);
 const signed=await login.POST(request('/api/admin/login',credentials));assert.equal(signed.status,200);const signedCookie=signed.headers.get('set-cookie');assert.equal(await auth.isAdmin(page(signedCookie)),true);
 await logout.POST(request('/api/admin/logout',{},'https://store.test',signedCookie));assert.equal(await auth.isAdmin(page(signedCookie)),false);
 db.prepare('UPDATE admin_sessions SET expires_at=0').run();assert.equal(await auth.isAdmin(page(cookie)),false);
 const old=await login.POST(request('/api/admin/login',credentials));await setup.POST(request('/api/admin/setup',{...setupCredentials,password:credentials.password+'changed'}));assert.equal(await auth.isAdmin(page(old.headers.get('set-cookie'))),false);
 let rate;for(let i=0;i<11;i++)rate=await login.POST(request('/api/admin/login',credentials));assert.equal(rate.status,429);
 console.log('Admin integration checks passed: private setup-key enforcement, missing secret rejection, CSRF, password login, secure cookies, invalid/expired sessions, logout, reset revocation, rate limiting.');
}finally{db.close();delete globalThis.__env;delete globalThis.__owner;rmSync(dir,{recursive:true,force:true})}
