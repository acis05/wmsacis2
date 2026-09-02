import {query} from '@/lib/db';

export async function GET(){
  const r=await query(`SELECT w.id,w.code,w.name,w.address,COUNT(l.id)::int rack_count
    FROM warehouses w LEFT JOIN locations l ON l.warehouse_id=w.id
    GROUP BY w.id ORDER BY w.name`);
  return Response.json(r.rows);
}

export async function POST(req:Request){
  const b=await req.json();
  const code=String(b.code||'').trim().toUpperCase();
  const name=String(b.name||'').trim();
  const address=String(b.address||'').trim();
  if(!code||!name)return Response.json({error:'Kode dan nama gudang wajib diisi.'},{status:400});
  try{
    const r=await query(`INSERT INTO warehouses(code,name,address) VALUES($1,$2,NULLIF($3,'')) RETURNING *`,[code,name,address]);
    return Response.json(r.rows[0],{status:201});
  }catch(e:any){
    console.error('POST /api/warehouses',e);
    if(e?.code==='23505')return Response.json({error:`Kode gudang ${code} sudah digunakan.`},{status:409});
    if(e?.code==='23502')return Response.json({error:'Data gudang belum lengkap.'},{status:400});
    return Response.json({error:`Gagal menambah gudang${e?.message?`: ${e.message}`:''}`},{status:500});
  }
}
