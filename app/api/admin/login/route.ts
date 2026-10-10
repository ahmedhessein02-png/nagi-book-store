import {sameOrigin} from '../../../../lib/order-utils';
import {adminHeaders,allowLogin,credential,newSession,sessionCookie} from '../../../../lib/admin-auth';
import {passwordHash,equalHash} from '../../../../lib/admin-crypto';
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:'Invalid request.'},{status:403,headers:adminHeaders});
 if(!await allowLogin(request))return Response.json({error:'Too many attempts. Please try again in 15 minutes.'},{status:429,headers:{...adminHeaders,'Retry-After':'900'}});
 let body;try{const raw=await request.text();if(raw.length>1500)throw Error();body=JSON.parse(raw)}catch{return Response.json({error:'Invalid request.'},{status:400,headers:adminHeaders})}
 if(typeof body.username!=='string'||typeof body.password!=='string'||body.username.length>40||body.password.length>128)return Response.json({error:'Incorrect username or password.'},{status:401,headers:adminHeaders});
 const saved=await credential();const hash=await passwordHash(body.password,saved?.salt||'nagi-unconfigured-dummy-salt');
 if(!saved||!equalHash(hash,saved.password_hash)||body.username.toLowerCase()!==saved.username)return Response.json({error:'Incorrect username or password.'},{status:401,headers:adminHeaders});
 const token=await newSession(saved.revision);return Response.json({ok:true},{headers:{...adminHeaders,'Set-Cookie':sessionCookie(token)}});
}
