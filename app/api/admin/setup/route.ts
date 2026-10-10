import {env} from 'cloudflare:workers';import {sameOrigin} from '../../../../lib/order-utils';import {adminHeaders,newSession,sessionCookie,allowLogin} from '../../../../lib/admin-auth';import {passwordHash,randomToken,validCredentials,digest,equalHash} from '../../../../lib/admin-crypto';
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:'Open setup from the store website.'},{status:403,headers:adminHeaders});
 if(!await allowLogin(request))return Response.json({error:'Too many attempts. Try again in 15 minutes.'},{status:429,headers:adminHeaders});
 let body;try{const raw=await request.text();if(raw.length>1500)throw Error();body=JSON.parse(raw)}catch{return Response.json({error:'Invalid request.'},{status:400,headers:adminHeaders})}
 const setupKey=(env as unknown as {NAGI_SETUP_TOKEN?:string}).NAGI_SETUP_TOKEN;
 if(!setupKey||setupKey.length<32)return Response.json({error:'Owner setup is not configured. Add NAGI_SETUP_TOKEN as a secret in Cloudflare first.'},{status:503,headers:adminHeaders});
 if(typeof body.setupToken!=='string'||body.setupToken.length>256||!equalHash(await digest(body.setupToken),await digest(setupKey)))return Response.json({error:'The owner setup key is incorrect.'},{status:403,headers:adminHeaders});
 if(!validCredentials(body.username,body.password))return Response.json({error:'Use a username of 3–40 letters, numbers, dots, underscores or hyphens, and a password of 16–128 characters.'},{status:400,headers:adminHeaders});
 const salt=randomToken(),revision=randomToken(),hash=await passwordHash(body.password,salt);
 await env.DB.batch([env.DB.prepare('INSERT INTO admin_credentials(id,username,password_hash,salt,revision) VALUES(1,?,?,?,?) ON CONFLICT(id) DO UPDATE SET username=excluded.username,password_hash=excluded.password_hash,salt=excluded.salt,revision=excluded.revision').bind(body.username.toLowerCase(),hash,salt,revision),env.DB.prepare('DELETE FROM admin_sessions')]);
 const token=await newSession(revision);return Response.json({ok:true},{headers:{...adminHeaders,'Set-Cookie':sessionCookie(token)}});
}
