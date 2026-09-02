import { query } from "@/lib/db";
export async function GET(){const r=await query("SELECT id,code,name FROM locations ORDER BY code");return Response.json(r.rows)}
export async function POST(req:Request){const b=await req.json();if(!b.code||!b.name)return Response.json({error:"Kode dan nama wajib"},{status:400});const r=await query("INSERT INTO locations(code,name) VALUES($1,$2) RETURNING *",[b.code.trim(),b.name.trim()]);return Response.json(r.rows[0],{status:201})}
