export function validateProduct(input:any,id:string,existing?:any){
 if(!input||typeof input!=='object')throw Error('Invalid book.');
 const text=(key:string,max=250,required=false)=>{const value=input[key]??'';if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw Error(`Please check ${key}.`);return value.trim()};
 const title=text('title',250,true),author=text('author',200,true),genre=text('genre',150,true),description=text('description',10000),publisher=text('publisher'),language=text('language',80),isbn=text('isbn',40),format=text('format',80),year=text('year',20),pages=text('pages',20);
 if(!Number.isInteger(input.price)||input.price<1||input.price>10000000)throw Error('Enter a whole IQD price between 1 and 10,000,000.');
 const discountType=input.discountType??'none',discountValue=discountType==='none'?0:input.discountValue;
 if(!['none','percentage','fixed'].includes(discountType))throw Error('Choose a valid discount type.');
 if(discountType!=='none'&&(!Number.isInteger(discountValue)||discountValue<1||(discountType==='percentage'?discountValue>99:discountValue>=input.price)))throw Error('Use 1–99 percent, or an IQD reduction smaller than the regular price.');
 if(discountType==='percentage'&&Math.round(input.price*(100-discountValue)/100)<1)throw Error('The sale price must be at least 1 IQD.');
 const image=text('image',200);if(!/^(assets\/[\w.-]+\.(webp|jpg|jpeg|png)|api\/book-images\/[a-f0-9-]{36})$/.test(image))throw Error('Upload a JPG, PNG or WebP book cover before saving.');
 if(image.startsWith('assets/')&&image!==existing?.image)throw Error('Please upload a book cover.');
 if(pages&&!/^\d{1,6}$/.test(pages))throw Error('Page count must be a whole number.');
 if(!Array.isArray(input.extraDetails)||input.extraDetails.length>40||input.extraDetails.some((x:unknown)=>typeof x!=='string'||x.length>500||!x.includes(':')))throw Error('Extra details must use Label: Value, one per line.');
 const details=[['Author',author],['Publisher',publisher],['Language',language],['ISBN',isbn],['Format',format],['Year',year],['Pages',pages]].filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).concat(input.extraDetails.map((x:string)=>x.trim()).filter(Boolean));
 return {id,title,author,genre,editionLabel:existing?.editionLabel||'',price:input.price,discountType,discountValue,description,publisher,language,isbn,format,year,pages,image,imageFull:image===existing?.image?existing?.imageFull||'':'',details,bestSeller:input.bestSeller===true,featured:input.featured===true,published:input.published!==false};
}
export function mergeProducts(base:any[],updates:any[],includeHidden=false){const map=new Map(base.map(b=>[b.id,{...b,published:b.published!==false}]));for(const b of updates)map.set(b.id,b);return [...map.values()].filter(b=>includeHidden||b.published!==false).map(b=>includeHidden?b:pricedProduct(b))}
export function imageMime(bytes:Uint8Array){if(bytes.length>=12&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n))return 'image/png';if(bytes.length>=12&&new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP')return 'image/webp';return null}
export async function boundedBody(request:Request,max:number){if(Number(request.headers.get('content-length'))>max)throw Error('File or request is too large.');const reader=request.body?.getReader();if(!reader)throw Error('Empty request.');const chunks:Uint8Array[]=[];let size=0;while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('File or request is too large.')}chunks.push(value)}const out=new Uint8Array(size);let offset=0;for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.length}return out}

export function pricedProduct(book:any){const regular=book.price;let price=regular;if(book.discountType==='percentage'&&Number.isInteger(book.discountValue)&&book.discountValue>0&&book.discountValue<100)price=Math.round(regular*(100-book.discountValue)/100);if(book.discountType==='fixed'&&Number.isInteger(book.discountValue)&&book.discountValue>0&&book.discountValue<regular)price=regular-book.discountValue;if(price<1||price>=regular)return {...book,originalPrice:regular,discountAmount:0};return {...book,price,originalPrice:regular,discountAmount:regular-price}}

export function findDuplicateProduct(book:any, catalogue:any[]){
 const normalize=(value:string)=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9+]+/g,' ').trim();
 const authorKey=(value:string)=>normalize(value).split(/\s+/).sort().join(' ');
 return catalogue.find(other=>other.id!==book.id&&other.published!==false&&normalize(other.title)===normalize(book.title)&&authorKey(other.author)===authorKey(book.author)&&!['isbn','format','year'].some(key=>book[key]&&other[key]&&normalize(book[key])!==normalize(other[key])));
}
