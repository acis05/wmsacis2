import { query } from '@/lib/db';

function dateWhere(field:string, from:string|null, to:string|null, params:any[]) {
  const parts:string[]=[];
  if(from){params.push(`${from}T00:00:00`);parts.push(`${field} >= $${params.length}`)}
  if(to){params.push(`${to}T23:59:59.999`);parts.push(`${field} <= $${params.length}`)}
  return parts;
}

export async function GET(req:Request){
  const u=new URL(req.url);
  const report=u.searchParams.get('report')||'transactions';
  const from=u.searchParams.get('from'),to=u.searchParams.get('to');
  const productId=u.searchParams.get('product_id');
  const warehouseId=u.searchParams.get('warehouse_id');
  const locationId=u.searchParams.get('location_id');

  if(report==='transactions'){
    const p:any[]=[]; const where=dateWhere('o.operation_date',from,to,p);
    const type=u.searchParams.get('type');
    if(type){p.push(type);where.push(`o.type=$${p.length}`)}
    if(productId){p.push(productId);where.push(`o.product_id=$${p.length}`)}
    if(warehouseId){p.push(warehouseId);where.push(`(sw.id=$${p.length} OR dw.id=$${p.length})`)}
    const r=await query(`SELECT o.id,o.operation_no,o.type,o.qty,o.reference,o.note,o.actor,o.operation_date,
      p.sku,p.name product_name,p.unit,
      sl.code source_location_code,sl.name source_location,sw.code source_warehouse_code,sw.name source_warehouse,
      dl.code destination_location_code,dl.name destination_location,dw.code destination_warehouse_code,dw.name destination_warehouse
      FROM stock_operations o JOIN products p ON p.id=o.product_id
      LEFT JOIN locations sl ON sl.id=o.source_location_id LEFT JOIN warehouses sw ON sw.id=sl.warehouse_id
      LEFT JOIN locations dl ON dl.id=o.destination_location_id LEFT JOIN warehouses dw ON dw.id=dl.warehouse_id
      ${where.length?'WHERE '+where.join(' AND '):''}
      ORDER BY o.operation_date DESC,o.created_at DESC LIMIT 2000`,p);
    return Response.json(r.rows);
  }

  if(report==='stock-card'){
    const p:any[]=[]; const where=dateWhere('m.created_at',from,to,p);
    if(productId){p.push(productId);where.push(`m.product_id=$${p.length}`)}
    if(warehouseId){p.push(warehouseId);where.push(`w.id=$${p.length}`)}
    if(locationId){p.push(locationId);where.push(`l.id=$${p.length}`)}
    const r=await query(`SELECT m.id,m.type,m.qty,m.before_qty,m.after_qty,m.note,m.actor,m.created_at,
      p.id product_id,p.sku,p.name product_name,p.unit,l.id location_id,l.code location_code,l.name location_name,
      w.id warehouse_id,w.code warehouse_code,w.name warehouse_name,o.operation_no,o.reference
      FROM stock_movements m JOIN products p ON p.id=m.product_id
      LEFT JOIN locations l ON l.id=m.location_id LEFT JOIN warehouses w ON w.id=l.warehouse_id
      LEFT JOIN stock_operations o ON o.id=m.operation_id
      ${where.length?'WHERE '+where.join(' AND '):''}
      ORDER BY m.created_at DESC LIMIT 3000`,p);
    return Response.json(r.rows);
  }

  if(report==='warehouse-stock'){
    const p:any[]=[];const where=['p.is_active=TRUE'];
    if(productId){p.push(productId);where.push(`p.id=$${p.length}`)}
    if(warehouseId){p.push(warehouseId);where.push(`w.id=$${p.length}`)}
    const r=await query(`SELECT w.id warehouse_id,w.code warehouse_code,w.name warehouse_name,p.id product_id,p.sku,p.name product_name,p.category,p.unit,
      COALESCE(SUM(i.qty),0)::int qty
      FROM inventory i JOIN products p ON p.id=i.product_id JOIN locations l ON l.id=i.location_id JOIN warehouses w ON w.id=l.warehouse_id
      WHERE ${where.join(' AND ')} GROUP BY w.id,w.code,w.name,p.id,p.sku,p.name,p.category,p.unit
      HAVING COALESCE(SUM(i.qty),0)<>0 ORDER BY w.name,p.name`,p);
    return Response.json(r.rows);
  }

  if(report==='rack-stock'){
    const p:any[]=[];const where=['p.is_active=TRUE'];
    if(productId){p.push(productId);where.push(`p.id=$${p.length}`)}
    if(warehouseId){p.push(warehouseId);where.push(`w.id=$${p.length}`)}
    if(locationId){p.push(locationId);where.push(`l.id=$${p.length}`)}
    const r=await query(`SELECT w.id warehouse_id,w.code warehouse_code,w.name warehouse_name,l.id location_id,l.code location_code,l.name location_name,
      p.id product_id,p.sku,p.name product_name,p.category,p.unit,i.qty::int qty,i.updated_at
      FROM inventory i JOIN products p ON p.id=i.product_id JOIN locations l ON l.id=i.location_id LEFT JOIN warehouses w ON w.id=l.warehouse_id
      WHERE ${where.join(' AND ')} AND i.qty<>0 ORDER BY w.name,l.code,p.name`,p);
    return Response.json(r.rows);
  }

  return Response.json({error:'Jenis laporan tidak dikenal'},{status:400});
}
