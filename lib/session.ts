import {createHmac,timingSafeEqual} from 'crypto';

export type SessionUser={id:string;email:string;name:string;account_id:string|null;company:string|null;role_code:string;role_name:string;is_super_admin:boolean;permissions:string[];trial_ends_at:string|null;account_status:string};
const COOKIE='wms_acis_session';
function secret(){return process.env.AUTH_SECRET||process.env.DATABASE_URL||'wms-acis-dev-change-me'}
function b64(s:string){return Buffer.from(s).toString('base64url')}
function unb64(s:string){return Buffer.from(s,'base64url').toString()}
function sig(payload:string){return createHmac('sha256',secret()).update(payload).digest('base64url')}
export function makeSession(user:SessionUser){const payload=b64(JSON.stringify({...user,iat:Date.now()}));return `${payload}.${sig(payload)}`}
export function parseSession(raw?:string|null):SessionUser|null{
  if(!raw)return null; const [p,s]=raw.split('.'); if(!p||!s)return null;
  const a=Buffer.from(sig(p)),b=Buffer.from(s); if(a.length!==b.length||!timingSafeEqual(a,b))return null;
  try{return JSON.parse(unb64(p))}catch{return null}
}
export const sessionCookieName=COOKIE;
export function cookieOptions(){return {httpOnly:true,sameSite:'lax' as const,secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*24*14}}
export function trialAllowed(u:SessionUser){if(u.is_super_admin)return true;if(u.account_status!=='ACTIVE')return false;if(!u.trial_ends_at)return true;return new Date(u.trial_ends_at).getTime()>Date.now()}
export function hasPermission(u:SessionUser|null,permission:string){return !!u&&(u.is_super_admin||u.permissions.includes('*')||u.permissions.includes(permission))}
