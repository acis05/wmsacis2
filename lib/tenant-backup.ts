import type {PoolClient} from 'pg';
import {query,transaction} from './db';

export const TENANT_BACKUP_FORMAT='wms-acis-tenant-backup';
export const TENANT_BACKUP_VERSION=1;

const TABLES=['companies','warehouses','locations','products','inventory','stock_operations','stock_movements','stocktakes','purchase_orders','purchase_order_items','picking_lists','picking_list_items','packing_lists','packing_list_items','audit_logs','integration_settings'] as const;
type TableName=(typeof TABLES)[number];
export type TenantBackup={format:string;version:number;exported_at:string;source:{account_id:string;account_name:string};counts:Record<string,number>;data:Record<TableName,any[]>};

export async function exportTenant(accountId:string):Promise<TenantBackup>{
  const acc=(await query(`SELECT id,name FROM app_accounts WHERE id=$1`,[accountId])).rows[0] as any;
  if(!acc)throw new Error('Tenant tidak ditemukan');
  const data={} as Record<TableName,any[]>; const counts:Record<string,number>={};
  for(const table of TABLES){
    const r=await query(`SELECT * FROM ${table} WHERE account_id=$1 ORDER BY created_at NULLS LAST`,[accountId]).catch(async()=>query(`SELECT * FROM ${table} WHERE account_id=$1`,[accountId]));
    data[table]=r.rows as any[]; counts[table]=r.rows.length;
  }
  return {format:TENANT_BACKUP_FORMAT,version:TENANT_BACKUP_VERSION,exported_at:new Date().toISOString(),source:{account_id:acc.id,account_name:acc.name},counts,data};
}

function validateBackup(b:any):asserts b is TenantBackup{
  if(!b||b.format!==TENANT_BACKUP_FORMAT||b.version!==TENANT_BACKUP_VERSION||!b.data)throw new Error('File backup tidak valid atau versinya tidak didukung');
  for(const t of TABLES)if(!Array.isArray(b.data[t]))b.data[t]=[];
}

function cols(row:any,exclude:string[]=[]){return Object.keys(row).filter(k=>!exclude.includes(k));}
async function insertRows(c:PoolClient,table:TableName,rows:any[],accountId:string,fallbackCompanyId?:string|null){
  for(const original of rows){
    const row={...original,account_id:accountId};
    if(fallbackCompanyId && ['inventory','stock_operations','stock_movements','stocktakes','purchase_orders','picking_lists','packing_lists'].includes(table) && !row.company_id) row.company_id=fallbackCompanyId;
    if(table==='audit_logs')row.user_id=null;
    const columns=cols(row); if(!columns.length)continue;
    const vals=columns.map(k=>row[k]); const marks=columns.map((_,i)=>`$${i+1}`).join(',');
    await c.query(`INSERT INTO ${table} (${columns.map(x=>`"${x}"`).join(',')}) VALUES (${marks})`,vals);
  }
}

export async function restoreTenant(accountId:string,raw:any){
  validateBackup(raw);
  return transaction(async c=>{
    await c.query(`SELECT id FROM app_accounts WHERE id=$1 FOR UPDATE`,[accountId]);
    // Hapus dari child ke parent. User, role dan akun login sengaja tidak disentuh.
    for(const sql of [
      `DELETE FROM picking_list_items WHERE account_id=$1`,
      `DELETE FROM picking_lists WHERE account_id=$1`,
      `DELETE FROM purchase_order_items WHERE account_id=$1`,
      `DELETE FROM purchase_orders WHERE account_id=$1`,
      `DELETE FROM packing_list_items WHERE account_id=$1`,
      `DELETE FROM packing_lists WHERE account_id=$1`,
      `DELETE FROM stocktakes WHERE account_id=$1`,
      `DELETE FROM stock_movements WHERE account_id=$1`,
      `DELETE FROM stock_operations WHERE account_id=$1`,
      `DELETE FROM inventory WHERE account_id=$1`,
      `DELETE FROM audit_logs WHERE account_id=$1`,
      `DELETE FROM integration_settings WHERE account_id=$1`,
      `DELETE FROM locations WHERE account_id=$1`,
      `DELETE FROM products WHERE account_id=$1`,
      `DELETE FROM warehouses WHERE account_id=$1`,
      `DELETE FROM companies WHERE account_id=$1`
    ])await c.query(sql,[accountId]);
    // Backup sebelum V21 belum mempunyai tabel companies/company_id. Buat Company MAIN otomatis saat restore backup lama.
    let fallbackCompanyId:string|null=null;
    if(!raw.data.companies.length){
      const acc=(await c.query(`SELECT name FROM app_accounts WHERE id=$1`,[accountId])).rows[0];
      fallbackCompanyId=(await c.query(`INSERT INTO companies(account_id,code,name,is_active) VALUES($1,'MAIN',$2,TRUE) RETURNING id`,[accountId,acc?.name||'Main Company'])).rows[0].id;
    }
    // Parent ke child agar FK valid. UUID asli dipertahankan agar relasi antartabel tetap utuh.
    for(const table of ['companies','warehouses','locations','products','inventory','stock_operations','stock_movements','stocktakes','purchase_orders','purchase_order_items','picking_lists','picking_list_items','packing_lists','packing_list_items','audit_logs','integration_settings'] as TableName[]){
      await insertRows(c,table,raw.data[table],accountId,fallbackCompanyId);
    }
    return {ok:true,counts:raw.counts,source:raw.source};
  });
}
