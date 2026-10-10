import dashboard from '../../storefront/dashboard.html?raw';import {isAdmin,adminHeaders} from '../../lib/admin-auth';
export async function GET(request:Request){if(!await isAdmin(request))return Response.redirect(new URL('/admin/login',request.url),302);return new Response(dashboard,{headers:{...adminHeaders,'Content-Type':'text/html; charset=utf-8'}})}
