import html from '../../storefront/best-sellers.html?raw';
export async function GET(){return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}})}
