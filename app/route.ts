import home from '../storefront/index.html?raw';
export async function GET(){return new Response(home,{headers:{'Content-Type':'text/html; charset=utf-8'}})}
