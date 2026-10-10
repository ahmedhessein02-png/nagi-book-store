import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {mergeProducts,findDuplicateProduct} from '../lib/product-utils.ts';
import {validateOrder,orderWhatsAppUrl} from '../lib/order-utils.ts';
const source=JSON.parse(readFileSync('public/catalogue.json','utf8'));
const aliases=JSON.parse(readFileSync('public/catalogue-aliases.json','utf8'));
const live=mergeProducts(source,[]), all=mergeProducts(source,[],true), ids=new Set(live.map(b=>b.id));
assert.equal(all.length,source.length);assert.equal(new Set(source.map(b=>b.id)).size,source.length);
assert.ok(live.length<source.length);assert.ok(live.length>5000);
for(const b of live){assert.notEqual(b.published,false);assert.ok(b.title.trim());assert.ok(Number.isInteger(b.price)&&b.price>0&&b.price<=50000);assert.ok(existsSync('public/'+b.image),b.id+' missing cover');assert.ok(!b.imageFull||b.imageFull==='/'+b.image,b.id+' external cover');assert.ok(!/^(Title listed as end|Title unavailable on source website|Unknown|endddd|\d{10,13})$/i.test(b.title));}
for(const [old,canonical] of Object.entries(aliases)){assert.ok(!aliases[canonical],old+' alias chain');assert.ok(source.some(b=>b.id===canonical));assert.ok(!ids.has(old),old+' duplicate is public');}
assert.equal(live.filter(b=>b.bestSeller).length,16);
for(const [id,price] of [['310',9000],['9369',14000],['14891',14000],['7706',12000],['nagi-madonna-fur-coat',9000]])assert.equal(live.find(b=>b.id===id)?.price,price);
assert.equal(live.find(b=>b.id==='14891').author,'John Steinbeck');
const same={id:'one',title:'A Book',author:'Author, First',price:10000,published:true};
assert.equal(findDuplicateProduct({...same,id:'two',title:' A BOOK ',author:'First Author'},[same]).id,'one');
assert.equal(findDuplicateProduct({...same,id:'two',author:'Someone Else'},[same]),undefined);
assert.equal(findDuplicateProduct({...same,id:'two',title:'A Book 2'},[same]),undefined);
assert.equal(findDuplicateProduct({...same,id:'two',title:'A Book+'},[same]),undefined);
assert.equal(findDuplicateProduct({...same,id:'two',isbn:'222'},[{...same,isbn:'111'}]),undefined);
assert.equal(findDuplicateProduct({...same,id:'two'},[{...same,published:false}]),undefined);
for(const region of ['kurdistan','outside_kurdistan'])for(const paymentMethod of ['cash_on_delivery','fib']){
 const order=validateOrder({id:crypto.randomUUID(),name:'Audit Customer',mobile:'07500000000',city:region==='kurdistan'?'Erbil':'Baghdad',address:'Audit street, building 1',deliveryRegion:region,paymentMethod,items:[{id:'310',quantity:2,price:1}]},live);
 assert.equal(order.total,18000+(region==='kurdistan'?5000:7000));const msg=decodeURIComponent(orderWhatsAppUrl(order));
 for(const value of ['Audit Customer','07500000000',order.city,order.address,'Dead Poets Society',order.total.toLocaleString('en-US'),paymentMethod==='fib'?'FIB transfer':'Cash on Delivery'])assert.ok(msg.includes(value),value);
}
for(const filename of readdirSync('storefront').filter(f=>f.endsWith('.html'))){const html=readFileSync('storefront/'+filename,'utf8');for(const [,id] of html.matchAll(/data-detail="([^"]+)"/g))assert.ok(ids.has(id)||ids.has(aliases[id]),filename+' missing book '+id);for(const [,url] of html.matchAll(/(?:src|href)="(\/[^"?#]+\.(?:jpg|png|jpeg|webp|svg|css|js))[^\"]*"/g))assert.ok(existsSync('public'+url),filename+' missing asset '+url);}
console.log(`Catalogue checks passed: ${source.length} records, ${live.length} published, ${Object.keys(aliases).length} duplicate aliases; all live images local; 16 Best Sellers and supplied prices; all delivery/payment combinations; static assets and book links.`);
