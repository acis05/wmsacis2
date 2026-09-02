import {NextRequest,NextResponse} from 'next/server';
import {parseSession,sessionCookieName,trialAllowed,hasPermission} from './lib/session';

const RULES:[string,string][]=[
 ['/products','products.view'],['/stock','stock.view'],['/inbound','inventory.inbound'],['/outbound','inventory.outbound'],['/warehouse-transfer','inventory.transfer'],['/rack-transfer','inventory.transfer'],['/scan','scan.use'],['/stock-opname','inventory.stocktake'],['/packing-list','packing.view'],['/warehouses','warehouses.manage'],['/history','history.view'],['/reports','reports.view'],['/aolinx','aolinx.view'],['/access','access.manage'],
 ['/api/products','products.view'],['/api/stock','stock.view'],['/api/operations','dashboard.view'],['/api/stocktake','inventory.stocktake'],['/api/packing-lists','packing.view'],['/api/warehouses','warehouses.manage'],['/api/locations','warehouses.manage'],['/api/reports','reports.view'],['/api/aolinx','aolinx.view'],['/api/access','access.manage']
];
const PUBLIC=['/login','/register','/api/auth/login','/api/auth/register','/api/health'];
export function proxy(req:NextRequest){
 const p=req.nextUrl.pathname;if(PUBLIC.some(x=>p===x||p.startsWith(x+'/'))||p.startsWith('/_next/')||p.startsWith('/favicon')||p.startsWith('/wms-acis')||p.startsWith('/apple-touch'))return NextResponse.next();
 const u=parseSession(req.cookies.get(sessionCookieName)?.value);
 if(!u){if(p.startsWith('/api/'))return NextResponse.json({error:'Silakan login'},{status:401});const url=req.nextUrl.clone();url.pathname='/login';url.searchParams.set('next',p);return NextResponse.redirect(url)}
 if(p.startsWith('/admin/trials')&&!u.is_super_admin){const url=req.nextUrl.clone();url.pathname='/';return NextResponse.redirect(url)}
 if(p==='/'&&!hasPermission(u,'dashboard.view')){const url=req.nextUrl.clone();url.pathname='/products';return NextResponse.redirect(url)}
 let required:string|undefined;
 if(p.startsWith('/api/products')&&req.method!=='GET')required='products.manage';
 else if(p.startsWith('/api/packing-lists')&&req.method!=='GET')required='packing.manage';

 const rule=RULES.find(([prefix])=>p===prefix||p.startsWith(prefix+'/'));
 if(required&&!hasPermission(u,required)){return NextResponse.json({error:'Anda tidak memiliki hak akses'},{status:403})}if(rule&&!hasPermission(u,rule[1])){if(p.startsWith('/api/'))return NextResponse.json({error:'Anda tidak memiliki hak akses'},{status:403});const url=req.nextUrl.clone();url.pathname='/';return NextResponse.redirect(url)}
 if(!trialAllowed(u)&&!p.startsWith('/admin/')&&!p.startsWith('/api/admin/')&&!p.startsWith('/api/auth/')){if(p.startsWith('/api/'))return NextResponse.json({error:'Masa trial telah berakhir'},{status:402});const url=req.nextUrl.clone();url.pathname='/login';url.searchParams.set('expired','1');return NextResponse.redirect(url)}
 return NextResponse.next();
}
export const config={matcher:['/((?!_next/static|_next/image).*)']};
