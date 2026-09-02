import {cookies} from 'next/headers';
import {parseSession,sessionCookieName,trialAllowed,hasPermission} from './session';
export async function currentSession(){const c=await cookies();return parseSession(c.get(sessionCookieName)?.value)}
export async function requireApi(permission?:string){const u=await currentSession();if(!u)return {error:Response.json({error:'Silakan login'},{status:401})};if(!trialAllowed(u))return {error:Response.json({error:'Masa trial telah berakhir. Hubungi administrator.'},{status:402})};if(permission&&!hasPermission(u,permission))return {error:Response.json({error:'Anda tidak memiliki hak akses'},{status:403})};return {user:u};}
