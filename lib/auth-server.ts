import {cookies} from 'next/headers';
import {parseSession,sessionCookieName,trialAllowed,hasPermission,type SessionUser} from './session';
import {query} from './db';

export async function currentSession():Promise<SessionUser|null>{
  const c=await cookies();
  const u=parseSession(c.get(sessionCookieName)?.value);
  if(!u)return null;
  if(!u.account_id){
    try{
      const r=await query(`SELECT u.account_id,COALESCE(u.company,a.name) company,a.account_status,a.trial_ends_at FROM app_users u LEFT JOIN app_accounts a ON a.id=u.account_id WHERE u.id=$1 LIMIT 1`,[u.id]);
      const fresh=r.rows[0] as any;
      if(fresh?.account_id){
        u.account_id=fresh.account_id;
        u.company=fresh.company||u.company;
        if(!u.is_super_admin){
          u.account_status=fresh.account_status||u.account_status;
          u.trial_ends_at=fresh.trial_ends_at||u.trial_ends_at;
        }
      }
    }catch{}
  }
  return u;
}

export async function requireApi(permission?:string){
  const u=await currentSession();
  if(!u)return {error:Response.json({error:'Silakan login'},{status:401})};
  if(!trialAllowed(u))return {error:Response.json({error:'Masa trial telah berakhir. Hubungi administrator.'},{status:402})};
  if(permission&&!hasPermission(u,permission))return {error:Response.json({error:'Anda tidak memiliki hak akses'},{status:403})};
  return {user:u};
}
