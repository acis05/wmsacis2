import {query} from './db';
export async function auditLog(args:{accountId:string;userId?:string|null;userName?:string|null;action:string;entityType:string;entityId?:string|null;description?:string|null;before?:unknown;after?:unknown;request?:Request}){
  const ip=args.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||args.request?.headers.get('x-real-ip')||null;
  try{await query(`INSERT INTO audit_logs(account_id,user_id,user_name,action,entity_type,entity_id,description,before_data,after_data,ip_address) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10)`,[args.accountId,args.userId||null,args.userName||null,args.action,args.entityType,args.entityId||null,args.description||null,args.before===undefined?null:JSON.stringify(args.before),args.after===undefined?null:JSON.stringify(args.after),ip])}catch(e){console.error('audit log failed',e)}
}
