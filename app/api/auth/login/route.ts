import {query} from '@/lib/db';import {verifyPassword,hashPassword} from '@/lib/password';import {makeSession,sessionCookieName,cookieOptions} from '@/lib/session';import {cookies} from 'next/headers';

async function resolveLegacyAccount(){
 const data=await query(`SELECT account_id FROM (SELECT account_id,COUNT(*) n FROM products WHERE account_id IS NOT NULL GROUP BY account_id UNION ALL SELECT account_id,COUNT(*) n FROM warehouses WHERE account_id IS NOT NULL GROUP BY account_id UNION ALL SELECT account_id,COUNT(*) n FROM stock_operations WHERE account_id IS NOT NULL GROUP BY account_id) x GROUP BY account_id ORDER BY SUM(n) DESC LIMIT 1`);
 if(data.rows[0]?.account_id)return data.rows[0].account_id as string;
 const old=await query(`SELECT id FROM app_accounts ORDER BY created_at LIMIT 1`);
 if(old.rows[0]?.id)return old.rows[0].id as string;
 const created=await query(`INSERT INTO app_accounts(name,account_status,trial_started_at,trial_ends_at) VALUES('WMS ACIS Internal','ACTIVE',NULL,NULL) RETURNING id`);
 return created.rows[0].id as string;
}

async function ensureSuperAdmin(){
 const email=process.env.SUPERADMIN_EMAIL?.trim().toLowerCase(),pw=process.env.SUPERADMIN_PASSWORD;if(!email||!pw)return;
 const ex=await query(`SELECT id,account_id FROM app_users WHERE lower(email)=$1`,[email]);
 if(ex.rows.length){
   if(!ex.rows[0].account_id){const account=await resolveLegacyAccount();await query(`UPDATE app_users SET account_id=$2,company=COALESCE(NULLIF(company,''),'WMS ACIS'),updated_at=NOW() WHERE id=$1`,[ex.rows[0].id,account])}
   return;
 }
 const account=await resolveLegacyAccount();
 const role=(await query(`INSERT INTO app_roles(account_id,code,name,is_system,permissions) VALUES(NULL,'SUPERADMIN','Super Administrator',TRUE,$1::jsonb) ON CONFLICT(code) DO UPDATE SET permissions=EXCLUDED.permissions RETURNING id`,[JSON.stringify(['*'])])).rows[0];
 await query(`INSERT INTO app_users(account_id,email,name,company,password_hash,role_id,is_super_admin,account_status) VALUES($1,$2,'Super Admin','WMS ACIS',$3,$4,TRUE,'ACTIVE')`,[account,email,hashPassword(pw),role.id])
}

export async function POST(req:Request){try{await ensureSuperAdmin();const b=await req.json();const email=String(b.email||'').trim().toLowerCase();const r=await query(`SELECT u.*,r.code role_code,r.name role_name,r.permissions,a.account_status account_plan_status,a.trial_ends_at,COALESCE(u.company,a.name) resolved_company FROM app_users u JOIN app_roles r ON r.id=u.role_id LEFT JOIN app_accounts a ON a.id=u.account_id WHERE lower(u.email)=$1`,[email]);const u=r.rows[0];if(!u||!verifyPassword(String(b.password||''),u.password_hash))return Response.json({error:'Email atau password salah'},{status:401});if(u.account_status!=='ACTIVE'&&!u.is_super_admin)return Response.json({error:`Akun ${u.account_status.toLowerCase()}. Hubungi administrator.`},{status:403});if(!u.account_id)return Response.json({error:'Tenant akun belum terhubung. Logout lalu login kembali atau hubungi administrator.'},{status:409});const planStatus=u.is_super_admin?'ACTIVE':(u.account_plan_status||'SUSPENDED');const session={id:u.id,email:u.email,name:u.name,account_id:u.account_id,company:u.resolved_company||null,role_code:u.role_code,role_name:u.role_name,is_super_admin:u.is_super_admin,permissions:u.permissions||[],trial_ends_at:u.is_super_admin?null:u.trial_ends_at,account_status:planStatus};(await cookies()).set(sessionCookieName,makeSession(session),cookieOptions());await query(`UPDATE app_users SET last_login_at=NOW() WHERE id=$1`,[u.id]);return Response.json({ok:true,user:session})}catch(e:any){return Response.json({error:e.message||'Gagal login'},{status:500})}}
