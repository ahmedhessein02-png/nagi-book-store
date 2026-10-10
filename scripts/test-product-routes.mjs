import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';import ts from 'typescript';
const dir=mkdtempSync(join(tmpdir(),'nagi-products-')),db=new DatabaseSync(':memory:'),files=new Map();
for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('drizzle/'+f,'utf8'));
const base=JSON.parse(readFileSync('public/catalogue.json','utf8'));
function statement(sql,params=[]){return {bind(...p){return statement(sql,p)},async all(){return {results:db.prepare(sql).all(...params)}},async run(){return db.prepare(sql).run(...params)}}}
globalThis.__env={DB:{prepare:statement},BUCKET:{async head(k){return files.has(k)?{}:null},async put(k,bytes,opts){files.set(k,{bytes,opts})}}};
globalThis.__base=base;globalThis.__admin=false;
function compile(path,name){let s=readFileSync(path,'utf8').replace(/import \{env\} from 'cloudflare:workers';/g,'const env=globalThis.__env;').replace(/import catalogue from '[^']+';/,"const catalogue=globalThis.__base;").replace(/import \{isAdmin,adminHeaders\} from '[^']+';/,"const isAdmin=async()=>globalThis.__admin;const adminHeaders={'Cache-Control':'no-store'};").replace(/from '[^']*product-utils'/g,"from './utils.mjs'").replace(/from '[^']*order-utils'/g,"from './order-utils.mjs'").replace(/from '[^']*\/products'/g,"from './products.mjs'");writeFileSync(join(dir,name),ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText)}
try{
 compile('lib/product-utils.ts','utils.mjs');compile('lib/order-utils.ts','order-utils.mjs');compile('lib/products.ts','products.mjs');compile('app/api/admin/products/route.ts','route.mjs');compile('app/api/admin/book-images/route.ts','upload.mjs');
 const route=await import(join(dir,'route.mjs')),uploads=await import(join(dir,'upload.mjs')),catalogue=await import(join(dir,'products.mjs')),orders=await import(join(dir,'order-utils.mjs'));
 const req=(body,method='POST',origin='https://store.test')=>new Request('https://store.test/api/admin/products',{method,headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await route.GET(new Request('https://store.test/api/admin/products'))).status,403);
 assert.equal((await route.POST(req({}))).status,403);globalThis.__admin=true;
 assert.equal((await route.POST(req({},'POST','https://elsewhere.test'))).status,403);
 const image=new Uint8Array(readFileSync('public/assets/100-facts-human-body.jpg'));
 const uploaded=await uploads.POST(new Request('https://store.test/api/admin/book-images',{method:'POST',headers:{origin:'https://store.test','Content-Type':'image/jpeg'},body:image}));assert.equal(uploaded.status,201);const {image:cover}=await uploaded.json();assert.ok(files.size===1);
 const payload={title:'Catalogue audit test',author:'Test Author',genre:'Audit Fiction',price:15000,image:cover,extraDetails:[],discountType:'percentage',discountValue:20,published:true};
 let response=await route.POST(req(payload));assert.equal(response.status,201);const book=(await response.json()).book;
 let list=await catalogue.getCatalogue();assert.equal(list.find(b=>b.id===book.id).price,12000);
 assert.equal((await route.POST(req({...payload,title:'CATALOGUE AUDIT TEST'}))).status,409);
 assert.equal((await route.PATCH(req({...payload,id:book.id,discountValue:10},'PATCH'))).status,200);
 list=await catalogue.getCatalogue();assert.equal(list.find(b=>b.id===book.id).price,13500);
 const order=orders.validateOrder({id:crypto.randomUUID(),name:'Audit',mobile:'07500000000',city:'Erbil',address:'Test address',deliveryRegion:'kurdistan',paymentMethod:'fib',items:[{id:book.id,quantity:2}]},list);assert.equal(order.total,32000);
 assert.equal((await route.PATCH(req({...payload,id:book.id,discountType:'fixed',discountValue:2500},'PATCH'))).status,200);
 list=await catalogue.getCatalogue();assert.equal(list.find(b=>b.id===book.id).price,12500);
 assert.equal((await route.PATCH(req({...payload,id:book.id,discountType:'none',discountValue:0},'PATCH'))).status,200);
 list=await catalogue.getCatalogue();assert.equal(list.find(b=>b.id===book.id).price,15000);
 assert.equal((await route.PATCH(req({...payload,id:book.id,discountType:'percentage',discountValue:100},'PATCH'))).status,400);
 assert.equal((await catalogue.getCatalogue()).find(b=>b.id===book.id).price,15000);
 assert.equal((await route.PATCH(req({...payload,id:book.id,published:false},'PATCH'))).status,200);
 assert.equal((await catalogue.getCatalogue()).some(b=>b.id===book.id),false);assert.equal((await catalogue.getCatalogue(true)).some(b=>b.id===book.id),true);
 assert.equal((await route.POST(req({...payload,title:'Missing upload',image:'api/book-images/12345678-1234-4123-8123-123456789abc'}))).status,400);
 assert.ok(!JSON.stringify(await catalogue.getCatalogue()).includes('Title listed as end'));
 console.log('Product route integration passed: access checks, upload, create, duplicate rejection, edit, discounts, checkout, hide, persistence, missing upload rejection. No live test products created.');
}finally{db.close();delete globalThis.__env;delete globalThis.__admin;delete globalThis.__base;rmSync(dir,{recursive:true,force:true})}
