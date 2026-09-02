import {query,transaction} from '@/lib/db';

function packingNo(){const d=new Date();const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `PL-${y}${m}${day}-${Date.now().toString().slice(-6)}`}

async function getDetail(id:string){
  const h=await query(`SELECT pl.*,
    COUNT(pli.id)::int AS item_count,COALESCE(SUM(pli.qty),0)::int AS total_qty
    FROM packing_lists pl LEFT JOIN packing_list_items pli ON pli.packing_list_id=pl.id
    WHERE pl.id=$1 GROUP BY pl.id`,[id]);
  if(!h.rows[0])return null;
  const i=await query(`SELECT pli.*,o.operation_no,o.operation_date,p.sku,p.name product_name,p.barcode,
    l.code location_code,l.name location_name,w.code warehouse_code,w.name warehouse_name
    FROM packing_list_items pli
    JOIN products p ON p.id=pli.product_id
    LEFT JOIN stock_operations o ON o.id=pli.operation_id
    LEFT JOIN locations l ON l.id=pli.location_id
    LEFT JOIN warehouses w ON w.id=l.warehouse_id
    WHERE pli.packing_list_id=$1 ORDER BY pli.created_at`,[id]);
  return {...h.rows[0],items:i.rows};
}

export async function GET(req:Request){
  const u=new URL(req.url),id=u.searchParams.get('id'),available=u.searchParams.get('available');
  if(id){const d=await getDetail(id);return d?Response.json(d):Response.json({error:'Packing list tidak ditemukan'},{status:404})}
  if(available==='1'){
    const r=await query(`SELECT o.id,o.operation_no,o.operation_date,o.qty,o.reference,o.product_id,o.source_location_id,
      p.sku,p.name product_name,p.unit,l.code location_code,l.name location_name,w.name warehouse_name,
      pli.packing_list_id,pl.packing_no
      FROM stock_operations o JOIN products p ON p.id=o.product_id
      LEFT JOIN locations l ON l.id=o.source_location_id LEFT JOIN warehouses w ON w.id=l.warehouse_id
      LEFT JOIN packing_list_items pli ON pli.operation_id=o.id LEFT JOIN packing_lists pl ON pl.id=pli.packing_list_id
      WHERE o.type='OUT' ORDER BY o.operation_date DESC LIMIT 500`);
    return Response.json(r.rows)
  }
  const r=await query(`SELECT pl.*,COUNT(pli.id)::int item_count,COALESCE(SUM(pli.qty),0)::int total_qty,
    STRING_AGG(DISTINCT w.name, ', ') AS warehouses
    FROM packing_lists pl LEFT JOIN packing_list_items pli ON pli.packing_list_id=pl.id
    LEFT JOIN locations l ON l.id=pli.location_id LEFT JOIN warehouses w ON w.id=l.warehouse_id
    GROUP BY pl.id ORDER BY pl.created_at DESC LIMIT 500`);
  return Response.json(r.rows)
}

function validate(b:any){return b.recipient_name&&Array.isArray(b.operation_ids)&&b.operation_ids.length>0}
async function insertItems(c:any,listId:string,ids:string[]){
  const ops=await c.query(`SELECT o.id,o.product_id,o.source_location_id,o.qty,p.unit FROM stock_operations o JOIN products p ON p.id=o.product_id WHERE o.type='OUT' AND o.id=ANY($1::uuid[])`,[ids]);
  if(ops.rows.length!==ids.length)throw new Error('Salah satu transaksi Barang Keluar tidak valid');
  for(const o of ops.rows)await c.query(`INSERT INTO packing_list_items(packing_list_id,operation_id,product_id,location_id,qty,unit) VALUES($1,$2,$3,$4,$5,$6)`,[listId,o.id,o.product_id,o.source_location_id,o.qty,o.unit]);
}
export async function POST(req:Request){const b=await req.json();if(!validate(b))return Response.json({error:'Penerima dan minimal 1 transaksi Barang Keluar wajib dipilih'},{status:400});try{const out=await transaction(async c=>{const no=packingNo();const r=await c.query(`INSERT INTO packing_lists(packing_no,recipient_name,recipient_company,recipient_phone,address,reference,status,notes,packed_by,packed_at,shipped_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[no,b.recipient_name,b.recipient_company||null,b.recipient_phone||null,b.address||null,b.reference||null,b.status||'DRAFT',b.notes||null,b.packed_by||'Admin Gudang',(b.status==='PACKED'||b.status==='SHIPPED')?new Date():null,b.status==='SHIPPED'?new Date():null]);await insertItems(c,r.rows[0].id,b.operation_ids);return r.rows[0]});return Response.json(out,{status:201})}catch(e:any){const msg=e?.code==='23505'?'Salah satu Barang Keluar sudah masuk ke packing list lain':e.message||'Gagal membuat packing list';return Response.json({error:msg},{status:400})}}
export async function PUT(req:Request){const b=await req.json();if(!b.id||!validate(b))return Response.json({error:'Data packing list belum lengkap'},{status:400});try{await transaction(async c=>{const old=(await c.query(`SELECT * FROM packing_lists WHERE id=$1 FOR UPDATE`,[b.id])).rows[0];if(!old)throw new Error('Packing list tidak ditemukan');await c.query(`DELETE FROM packing_list_items WHERE packing_list_id=$1`,[b.id]);await c.query(`UPDATE packing_lists SET recipient_name=$2,recipient_company=$3,recipient_phone=$4,address=$5,reference=$6,status=$7,notes=$8,packed_by=$9,packed_at=CASE WHEN $7 IN ('PACKED','SHIPPED') THEN COALESCE(packed_at,NOW()) ELSE NULL END,shipped_at=CASE WHEN $7='SHIPPED' THEN COALESCE(shipped_at,NOW()) ELSE NULL END,updated_at=NOW() WHERE id=$1`,[b.id,b.recipient_name,b.recipient_company||null,b.recipient_phone||null,b.address||null,b.reference||null,b.status||'DRAFT',b.notes||null,b.packed_by||'Admin Gudang']);await insertItems(c,b.id,b.operation_ids)});return Response.json(await getDetail(b.id))}catch(e:any){const msg=e?.code==='23505'?'Salah satu Barang Keluar sudah masuk ke packing list lain':e.message||'Gagal mengubah packing list';return Response.json({error:msg},{status:400})}}
export async function DELETE(req:Request){const id=new URL(req.url).searchParams.get('id');if(!id)return Response.json({error:'ID wajib'},{status:400});try{await query(`DELETE FROM packing_lists WHERE id=$1`,[id]);return Response.json({ok:true})}catch(e:any){return Response.json({error:e.message||'Gagal menghapus packing list'},{status:400})}}
