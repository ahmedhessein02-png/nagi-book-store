import {adminPage} from '../../../lib/admin-page';import {isAdmin,adminHeaders} from '../../../lib/admin-auth';
export async function GET(request:Request){if(await isAdmin(request))return Response.redirect(new URL('/dashboard',request.url),302);return new Response(adminPage(),{headers:{...adminHeaders,'Content-Type':'text/html; charset=utf-8'}})}
