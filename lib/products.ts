import catalogue from '../public/catalogue.json';import {env} from 'cloudflare:workers';import {mergeProducts} from './product-utils';
export async function getCatalogue(includeHidden=false){const rows=await env.DB.prepare('SELECT data FROM managed_books').all<{data:string}>();return mergeProducts(catalogue,rows.results.map(row=>JSON.parse(row.data)),includeHidden)}
