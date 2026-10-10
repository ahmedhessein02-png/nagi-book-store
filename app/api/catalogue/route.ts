import {getCatalogue} from '../../../lib/products';
export async function GET(){try{return Response.json(await getCatalogue(),{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'The collection is temporarily unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}})}}
