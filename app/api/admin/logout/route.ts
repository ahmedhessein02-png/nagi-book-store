import {sameOrigin} from '../../../../lib/order-utils';import {logout,sessionCookie,adminHeaders} from '../../../../lib/admin-auth';
export async function POST(request:Request){if(!sameOrigin(request))return Response.json({error:'Invalid request.'},{status:403});await logout(request);return Response.json({ok:true},{headers:{...adminHeaders,'Set-Cookie':sessionCookie('',0)}})}
