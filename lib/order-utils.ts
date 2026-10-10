export function validateOrder(input:any,catalogue:any[]){
 const required=['name','mobile','city','address'];for(const key of required){if(typeof input?.[key]!=='string'||!input[key].trim()||input[key].trim().length>(key==='address'?500:120))throw Error('Please complete your name, mobile, city and address.');}
 const phone=input.mobile.trim();if(!/^\+?[\d ()-]{7,25}$/.test(phone)||phone.replace(/\D/g,'').length<7)throw Error('Enter a valid mobile number.');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.id||''))throw Error('Invalid order reference. Please try again.');
 if(!Array.isArray(input.items)||input.items.length<1||input.items.length>50)throw Error('Choose between 1 and 50 different books.');
 if(!['kurdistan','outside_kurdistan'].includes(input.deliveryRegion))throw Error('Please select your delivery region.');const deliveryFee=input.deliveryRegion==='kurdistan'?5000:7000;
 if(!['cash_on_delivery','fib'].includes(input.paymentMethod))throw Error('Please choose Cash on Delivery or FIB.');
 const seen=new Set();const items=input.items.map((item:any)=>{const book=catalogue.find(b=>b.id===item.id);if(!book||seen.has(item.id)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>20)throw Error('Invalid book selection or quantity.');seen.add(item.id);return {id:book.id,title:book.title,price:book.price,originalPrice:book.originalPrice||book.price,quantity:item.quantity}});
 return {id:input.id,name:input.name.trim(),mobile:phone,city:input.city.trim(),address:input.address.trim(),items,paymentMethod:input.paymentMethod,deliveryRegion:input.deliveryRegion,deliveryFee,total:deliveryFee+items.reduce((n:number,b:any)=>n+b.price*b.quantity,0)};
}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');return origin===new URL(request.url).origin;}
export const statuses=['new','confirmed','completed','cancelled'];
export function orderWhatsAppUrl(order:any){
 const items=typeof order.items==='string'?JSON.parse(order.items):order.items;
 const subtotal=items.reduce((sum:number,b:any)=>sum+b.price*b.quantity,0);
 const fee=Number(order.deliveryFee||0);
 const savings=items.reduce((sum:number,b:any)=>sum+Math.max(0,(b.originalPrice||b.price)-b.price)*b.quantity,0);
 const region=order.deliveryRegion==='kurdistan'?'Inside Kurdistan':order.deliveryRegion==='outside_kurdistan'?'Outside Kurdistan / Central Iraq':'Not selected (previous order)';
 const payment=order.paymentMethod==='cash_on_delivery'?'Cash on Delivery':order.paymentMethod==='fib'?'FIB transfer':'Not selected (previous order)';
 const money=(n:number)=>n.toLocaleString('en-US')+' IQD';
 const message=['Hello Nagi Book Store, I would like to confirm this order.','',`Order reference: ${order.id}`,`Name: ${order.name}`,`Mobile: ${order.mobile}`,`City: ${order.city}`,`Full address: ${order.address}`,`Delivery region: ${region}`,`Payment method: ${payment}`,'','Books:',...items.map((b:any,index:number)=>`${index+1}. ${b.title} (Product ${b.id}) — ${b.quantity} × ${money(Number(b.price))} = ${money(b.price*b.quantity)}${b.originalPrice>b.price?` (regular price ${money(b.originalPrice)} each)`:""}`),'',...(savings?[`Discount savings: ${money(savings)}`]:[]),`Books subtotal: ${money(subtotal)}`,`Delivery fee: ${money(fee)}`,`Final total: ${money(subtotal+fee)}`,order.paymentMethod==='fib'?'Please confirm availability and send your FIB transfer details. Payment has not been made yet.':'Please confirm book availability and arrange delivery.'].join('\n');
 return 'https://wa.me/9647518946639?text='+encodeURIComponent(message);
}
