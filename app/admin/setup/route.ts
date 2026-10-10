import {adminPage} from '../../../lib/admin-page';import {adminHeaders} from '../../../lib/admin-auth';
export async function GET(){return new Response(adminPage(true),{headers:{...adminHeaders,'Content-Type':'text/html; charset=utf-8'}})}
