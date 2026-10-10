import {env} from 'cloudflare:workers';
import {digest,randomToken} from './admin-crypto';
export const adminHeaders={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Frame-Options':'DENY','Content-Security-Policy':"frame-ancestors 'none'"};
export const cookieName='__Host-nagi_admin';
export const sessionAge=12*60*60;
export function sessionCookie(token:string,age=sessionAge){return `${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`}
export function readToken(request:Request){const value=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';return /^[a-f0-9]{64}$/.test(value)?value:null}
export async function isAdmin(request:Request){const token=readToken(request);if(!token)return false;const row=await env.DB.prepare('SELECT s.token_hash FROM admin_sessions s JOIN admin_credentials c ON c.id=1 AND c.revision=s.revision WHERE s.token_hash=? AND s.expires_at>?').bind(await digest(token),Date.now()).first();return !!row}
export async function credential(){
 const read=()=>env.DB.prepare('SELECT * FROM admin_credentials WHERE id=1').first<{username:string,password_hash:string,salt:string,revision:string}>();
 let saved=await read();
 // Owner-configured runtime secret bootstraps only an empty account. A later reset always wins.
 const initial=(env as unknown as {NAGI_INITIAL_ADMIN?:string}).NAGI_INITIAL_ADMIN;
 if(!saved&&initial){
  let input;try{input=JSON.parse(initial)}catch{return null}
  if(typeof input.username!=='string'||!/^[a-z0-9_.-]{3,40}$/.test(input.username)||!['salt','password_hash','revision'].every(k=>typeof input[k]==='string'&&/^[a-f0-9]{64}$/.test(input[k])))return null;
  await env.DB.prepare('INSERT INTO admin_credentials(id,username,password_hash,salt,revision) VALUES(1,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(input.username,input.password_hash,input.salt,input.revision).run();
  saved=await read();
 }
 return saved;
}
export async function newSession(revision:string){const token=randomToken();await env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at<=?').bind(Date.now()).run();await env.DB.prepare('INSERT INTO admin_sessions(token_hash,revision,expires_at) VALUES(?,?,?)').bind(await digest(token),revision,Date.now()+sessionAge*1000).run();return token}
export async function logout(request:Request){const token=readToken(request);if(token)await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(await digest(token)).run()}
export async function allowLogin(request:Request){
 const now=Date.now(),window=Math.floor(now/900000),ip=request.headers.get('cf-connecting-ip')||'unknown';
 const key=await digest(`login:${ip}:${window}`);
 await env.DB.prepare('DELETE FROM admin_login_limits WHERE expires_at<?').bind(now).run();
 const row=await env.DB.prepare('INSERT INTO admin_login_limits(id,attempts,expires_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind(key,(window+1)*900000).first<{attempts:number}>();
 return !!row&&row.attempts<=10;
}
