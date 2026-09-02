import {query} from '@/lib/db';
export async function GET(){
 const [kpi,low,moves,trend,cats,warehouses]=await Promise.all([
  query(`SELECT (SELECT COUNT(*) FROM products)::int total_sku,COALESCE((SELECT SUM(qty) FROM inventory),0)::int total_stock,(SELECT COUNT(*) FROM products p LEFT JOIN (SELECT product_id,SUM(qty) qty FROM inventory GROUP BY product_id)i ON i.product_id=p.id WHERE COALESCE(i.qty,0)<=p.min_stock)::int low_stock,COALESCE((SELECT SUM(qty) FROM stock_operations WHERE type='IN' AND operation_date::date=CURRENT_DATE),0)::int incoming,COALESCE((SELECT SUM(qty) FROM stock_operations WHERE type='OUT' AND operation_date::date=CURRENT_DATE),0)::int outgoing`),
  query(`SELECT p.id,p.sku,p.name,p.min_stock,COALESCE(SUM(i.qty),0)::int total_stock,STRING_AGG(DISTINCT COALESCE(w.name||' / ','')||l.name, ', ') FILTER(WHERE l.id IS NOT NULL) locations FROM products p LEFT JOIN inventory i ON i.product_id=p.id LEFT JOIN locations l ON l.id=i.location_id LEFT JOIN warehouses w ON w.id=l.warehouse_id GROUP BY p.id HAVING COALESCE(SUM(i.qty),0)<=p.min_stock ORDER BY total_stock ASC LIMIT 6`),
  query(`SELECT o.id,o.type,o.qty,o.operation_date created_at,o.actor,p.name,COALESCE(dl.name,sl.name) location_name FROM stock_operations o JOIN products p ON p.id=o.product_id LEFT JOIN locations sl ON sl.id=o.source_location_id LEFT JOIN locations dl ON dl.id=o.destination_location_id ORDER BY o.operation_date DESC LIMIT 7`),
  query(`WITH d AS (SELECT generate_series(CURRENT_DATE-INTERVAL '6 day',CURRENT_DATE,INTERVAL '1 day')::date dt) SELECT to_char(d.dt,'DD Mon') label,COALESCE(SUM(o.qty) FILTER(WHERE o.type='IN'),0)::int incoming,COALESCE(SUM(o.qty) FILTER(WHERE o.type='OUT'),0)::int outgoing FROM d LEFT JOIN stock_operations o ON o.operation_date::date=d.dt GROUP BY d.dt ORDER BY d.dt`),
  query(`SELECT COALESCE(NULLIF(p.category,''),'Lainnya') category,COALESCE(SUM(i.qty),0)::int stock FROM products p LEFT JOIN inventory i ON i.product_id=p.id GROUP BY 1 ORDER BY stock DESC LIMIT 6`),
  query(`SELECT w.name,COALESCE(SUM(i.qty),0)::int stock FROM warehouses w LEFT JOIN locations l ON l.warehouse_id=w.id LEFT JOIN inventory i ON i.location_id=l.id GROUP BY w.id ORDER BY stock DESC LIMIT 6`)
 ]);
 return Response.json({kpi:kpi.rows[0],lowStock:low.rows,movements:moves.rows,trend:trend.rows,categories:cats.rows,warehouses:warehouses.rows});
}
