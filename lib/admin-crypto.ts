const encoder=new TextEncoder();
export const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
export function randomToken(){return hex(crypto.getRandomValues(new Uint8Array(32)))}
export async function digest(value:string){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))))}
export async function passwordHash(password:string,salt:string){
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 // Workers Web Crypto caps each PBKDF2 derivation at 100,000 iterations.
 return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encoder.encode(salt),iterations:100000},key,256)));
}
export function equalHash(a:string,b:string){if(a.length!==64||b.length!==64)return false;let diff=0;for(let i=0;i<64;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
export function validCredentials(username:unknown,password:unknown){return typeof username==='string'&&/^[a-zA-Z0-9_.-]{3,40}$/.test(username)&&typeof password==='string'&&password.length>=16&&password.length<=128}
