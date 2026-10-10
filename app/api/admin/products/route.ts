import {env} from 'cloudflare:workers';import {isAdmin,adminHeaders} from '../../../../lib/admin-auth';import {sameOrigin} from '../../../../lib/order-utils';import {getCatalogue} from '../../../../lib/products';import {validateProduct,boundedBody,findDuplicateProduct} from '../../../../lib/product-utils';
export async function GET(request:Request){if(!await isAdmin(request))return Response.json({error:'Admin login required.'},{status:403,headers:adminHeaders});return Response.json({books:await getCatalogue(true)},{headers:adminHeaders})}
async function save(request:Request,editing:boolean){
 if(!sameOrigin(request)||!await isAdmin(request))return Response.json({error:'Admin login required.'},{status:403,headers:adminHeaders});
 try{const input=JSON.parse(new TextDecoder().decode(await boundedBody(request,40000)));const all=await getCatalogue(true);const existing=editing?all.find(b=>b.id===input.id):undefined;
 if(editing&&!existing)return Response.json({error:'Book not found.'},{status:404,headers:adminHeaders});
 const book=validateProduct(input,existing?.id||'book-'+crypto.randomUUID(),existing);
 const identityUnchanged=existing&&existing.published!==false&&existing.title===book.title&&existing.author===book.author;
 const duplicate=book.published&&!identityUnchanged?findDuplicateProduct(book,all):undefined;
 if(duplicate)return Response.json({error:`This book already exists as “${duplicate.title}” (product ${duplicate.id}). Edit the existing listing, or specify a different ISBN, format or year for a distinct edition.`},{status:409,headers:adminHeaders});
 if(book.image.startsWith('api/book-images/')&&!await env.BUCKET.head(book.image.slice('api/book-images/'.length)))throw Error('Cover upload was not found. Please upload it again.');
 await env.DB.prepare('INSERT INTO managed_books(id,data,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at').bind(book.id,JSON.stringify(book),new Date().toISOString()).run();
 return Response.json({book},{status:editing?200:201,headers:adminHeaders});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Book could not be saved.'},{status:400,headers:adminHeaders})}
}
export const POST=(r:Request)=>save(r,false);export const PATCH=(r:Request)=>save(r,true);
