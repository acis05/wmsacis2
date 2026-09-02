import { query } from "@/lib/db";
import {requireApi} from "@/lib/auth-server";

function baseSelect(){
  return `SELECT p.id,p.sku,p.name,p.barcode,p.category,p.unit,p.min_stock,p.is_active,
    COALESCE(SUM(i.qty),0)::int total_stock,
    STRING_AGG(DISTINCT COALESCE(w.name||' / ','')||l.name, ', ') FILTER (WHERE l.id IS NOT NULL) locations
    FROM products p
    LEFT JOIN inventory i ON i.product_id=p.id
    LEFT JOIN locations l ON l.id=i.location_id
    LEFT JOIN warehouses w ON w.id=l.warehouse_id`;
}

export async function GET(req:Request){
  const url=new URL(req.url);
  const q=url.searchParams.get("q")?.trim();
  const barcode=url.searchParams.get("barcode")?.trim();
  const id=url.searchParams.get("id")?.trim();
  let sql=baseSelect();
  const params:string[]=[];
  const wh:string[]=[`p.is_active=TRUE`];
  if(id){params.push(id);wh.push(`p.id=$${params.length}`)}
  if(barcode){params.push(barcode);wh.push(`p.barcode=$${params.length}`)}
  if(q){params.push(`%${q}%`);wh.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR COALESCE(p.barcode,'') ILIKE $${params.length})`)}
  sql+=` WHERE ${wh.join(" AND ")} GROUP BY p.id ORDER BY p.name LIMIT 200`;
  const r=await query(sql,params);
  return Response.json(r.rows);
}

async function duplicateCheck(sku:string,barcode:string,id?:string){
  const params:any[]=[sku];
  let exclude='';
  if(id){params.push(id);exclude=` AND id<>$${params.length}`}
  const skuRow=await query(`SELECT id FROM products WHERE LOWER(sku)=LOWER($1)${exclude} LIMIT 1`,params);
  if(skuRow.rowCount)return 'SKU sudah terdaftar. Gunakan SKU lain.';
  if(barcode){
    const bp:any[]=[barcode]; let bx='';
    if(id){bp.push(id);bx=` AND id<>$${bp.length}`}
    const barRow=await query(`SELECT id FROM products WHERE barcode=$1${bx} LIMIT 1`,bp);
    if(barRow.rowCount)return 'Barcode/QR sudah terdaftar pada produk lain.';
  }
  return '';
}

export async function POST(req:Request){const auth=await requireApi("products.manage");if(auth.error)return auth.error;
  const b=await req.json();
  const sku=(b.sku||'').trim(),name=(b.name||'').trim(),barcode=(b.barcode||'').trim();
  if(!sku||!name)return Response.json({error:"SKU dan nama wajib"},{status:400});
  const dup=await duplicateCheck(sku,barcode); if(dup)return Response.json({error:dup},{status:409});
  try{
    const r=await query(`INSERT INTO products(sku,name,barcode,category,unit,min_stock,is_active) VALUES($1,$2,NULLIF($3,''),NULLIF($4,''),$5,$6,TRUE) RETURNING *`,[sku,name,barcode,(b.category||'').trim(),b.unit||'pcs',Number(b.min_stock)||0]);
    return Response.json(r.rows[0],{status:201});
  }catch(e:any){
    console.error('POST /api/products',e);
    return Response.json({error:e?.code==='23505'?'SKU atau barcode sudah digunakan.':'Gagal menyimpan produk.'},{status:400});
  }
}

export async function PUT(req:Request){const auth=await requireApi("products.manage");if(auth.error)return auth.error;
  const b=await req.json();
  const id=(b.id||'').trim(),sku=(b.sku||'').trim(),name=(b.name||'').trim(),barcode=(b.barcode||'').trim();
  if(!id||!sku||!name)return Response.json({error:'ID, SKU, dan nama wajib'},{status:400});
  const dup=await duplicateCheck(sku,barcode,id); if(dup)return Response.json({error:dup},{status:409});
  const r=await query(`UPDATE products SET sku=$2,name=$3,barcode=NULLIF($4,''),category=NULLIF($5,''),unit=$6,min_stock=$7,updated_at=NOW() WHERE id=$1 AND is_active=TRUE RETURNING *`,[id,sku,name,barcode,(b.category||'').trim(),b.unit||'pcs',Number(b.min_stock)||0]);
  if(!r.rowCount)return Response.json({error:'Produk tidak ditemukan'},{status:404});
  return Response.json(r.rows[0]);
}

export async function DELETE(req:Request){const auth=await requireApi("products.manage");if(auth.error)return auth.error;
  const id=new URL(req.url).searchParams.get('id')?.trim();
  if(!id)return Response.json({error:'ID produk wajib'},{status:400});
  const stock=await query(`SELECT COALESCE(SUM(qty),0)::int qty FROM inventory WHERE product_id=$1`,[id]);
  if(Number(stock.rows[0]?.qty||0)>0)return Response.json({error:'Produk masih memiliki stok. Kosongkan/pindahkan stok terlebih dahulu sebelum dihapus.'},{status:409});
  const r=await query(`UPDATE products SET is_active=FALSE,barcode=NULL,updated_at=NOW() WHERE id=$1 AND is_active=TRUE RETURNING id`,[id]);
  if(!r.rowCount)return Response.json({error:'Produk tidak ditemukan'},{status:404});
  return Response.json({ok:true});
}
