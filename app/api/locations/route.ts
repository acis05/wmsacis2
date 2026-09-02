import {query} from '@/lib/db';

export async function GET(){
  const r=await query(`SELECT l.id,l.code,l.name,l.warehouse_id,w.name warehouse_name,w.code warehouse_code
    FROM locations l LEFT JOIN warehouses w ON w.id=l.warehouse_id
    ORDER BY w.name,l.code`);
  return Response.json(r.rows);
}

export async function POST(req:Request){
  const b=await req.json();
  const code=String(b.code||'').trim().toUpperCase();
  const name=String(b.name||'').trim();
  const warehouseId=String(b.warehouse_id||'').trim();
  if(!code||!name||!warehouseId)return Response.json({error:'Kode rak, nama rak, dan gudang wajib diisi.'},{status:400});
  try{
    const wh=await query(`SELECT id FROM warehouses WHERE id=$1`,[warehouseId]);
    if(!wh.rowCount)return Response.json({error:'Gudang yang dipilih tidak ditemukan. Refresh halaman lalu pilih kembali.'},{status:404});
    const r=await query(`INSERT INTO locations(code,name,warehouse_id) VALUES($1,$2,$3) RETURNING *`,[code,name,warehouseId]);
    return Response.json(r.rows[0],{status:201});
  }catch(e:any){
    console.error('POST /api/locations',e);
    if(e?.code==='23505')return Response.json({error:`Kode rak ${code} sudah digunakan di gudang tersebut.`},{status:409});
    if(e?.code==='23503')return Response.json({error:'Gudang yang dipilih tidak valid.'},{status:400});
    return Response.json({error:`Gagal menambah rak${e?.message?`: ${e.message}`:''}`},{status:500});
  }
}
