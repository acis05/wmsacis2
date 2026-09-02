import { query, transaction } from "@/lib/db";
export async function GET(){const r=await query(`SELECT m.id,m.type,m.qty,m.before_qty,m.after_qty,m.note,m.actor,m.created_at,p.sku,p.name,l.name location_name FROM stock_movements m JOIN products p ON p.id=m.product_id LEFT JOIN locations l ON l.id=m.location_id ORDER BY m.created_at DESC LIMIT 300`);return Response.json(r.rows)}
export async function POST(req:Request){
 const b=await req.json(); const qty=Number(b.qty); if(!b.product_id||!b.location_id||!['IN','OUT'].includes(b.type)||!Number.isInteger(qty)||qty<=0)return Response.json({error:'Data transaksi tidak valid'},{status:400});
 try{const result=await transaction(async c=>{
   const cur=await c.query(`SELECT qty FROM inventory WHERE product_id=$1 AND location_id=$2 FOR UPDATE`,[b.product_id,b.location_id]); const before=cur.rows[0]?.qty??0; const after=b.type==='IN'?before+qty:before-qty; if(after<0)throw new Error('Stok tidak cukup');
   await c.query(`INSERT INTO inventory(product_id,location_id,qty) VALUES($1,$2,$3) ON CONFLICT(product_id,location_id) DO UPDATE SET qty=EXCLUDED.qty,updated_at=NOW()`,[b.product_id,b.location_id,after]);
   const m=await c.query(`INSERT INTO stock_movements(product_id,location_id,type,qty,before_qty,after_qty,note,actor) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[b.product_id,b.location_id,b.type,qty,before,after,b.note||null,b.actor||'Admin Gudang']); return m.rows[0];
 }); return Response.json(result,{status:201})}catch(e:any){return Response.json({error:e.message||'Transaksi gagal'},{status:400})}
}
