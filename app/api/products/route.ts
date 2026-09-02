import { query } from "@/lib/db";
export async function GET(req:Request){
 const url=new URL(req.url); const q=url.searchParams.get("q")?.trim(); const barcode=url.searchParams.get("barcode")?.trim();
 let sql=`SELECT p.id,p.sku,p.name,p.barcode,p.category,p.unit,p.min_stock,COALESCE(SUM(i.qty),0)::int total_stock,STRING_AGG(DISTINCT l.name, ', ') FILTER (WHERE l.id IS NOT NULL) locations FROM products p LEFT JOIN inventory i ON i.product_id=p.id LEFT JOIN locations l ON l.id=i.location_id`;
 const params:string[]=[]; const wh:string[]=[];
 if(barcode){params.push(barcode);wh.push(`p.barcode=$${params.length}`)}
 if(q){params.push(`%${q}%`);wh.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.barcode ILIKE $${params.length})`)}
 if(wh.length)sql+=` WHERE ${wh.join(" AND ")}`; sql+=` GROUP BY p.id ORDER BY p.name LIMIT 200`;
 const r=await query(sql,params); return Response.json(r.rows);
}
export async function POST(req:Request){
 const b=await req.json(); if(!b.sku||!b.name)return Response.json({error:"SKU dan nama wajib"},{status:400});
 try{const r=await query(`INSERT INTO products(sku,name,barcode,category,unit,min_stock) VALUES($1,$2,NULLIF($3,''),NULLIF($4,''),$5,$6) RETURNING *`,[b.sku.trim(),b.name.trim(),(b.barcode||'').trim(),(b.category||'').trim(),b.unit||'pcs',Number(b.min_stock)||0]);return Response.json(r.rows[0],{status:201})}
 catch(e:any){return Response.json({error:e?.code==='23505'?"SKU/barcode sudah dipakai":"Gagal menyimpan produk"},{status:400})}
}
