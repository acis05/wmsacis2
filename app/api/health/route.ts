import { query } from "@/lib/db";
export async function GET(){ await query("SELECT 1"); return Response.json({ok:true}); }
