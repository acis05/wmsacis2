import { query } from "@/lib/db";
export async function GET(){
  const [kpi, low, moves] = await Promise.all([
    query(`SELECT COUNT(*)::int total_sku, COALESCE(SUM(i.qty),0)::int total_stock,
      COUNT(*) FILTER (WHERE COALESCE(i.qty,0) <= p.min_stock)::int low_stock
      FROM products p LEFT JOIN (SELECT product_id,SUM(qty)::int qty FROM inventory GROUP BY product_id)i ON i.product_id=p.id`),
    query(`SELECT p.id,p.sku,p.name,p.min_stock,COALESCE(SUM(i.qty),0)::int total_stock,
      STRING_AGG(DISTINCT l.name, ', ') FILTER (WHERE l.id IS NOT NULL) locations
      FROM products p LEFT JOIN inventory i ON i.product_id=p.id LEFT JOIN locations l ON l.id=i.location_id
      GROUP BY p.id HAVING COALESCE(SUM(i.qty),0)<=p.min_stock ORDER BY total_stock ASC LIMIT 8`),
    query(`SELECT m.id,m.type,m.qty,m.created_at,m.actor,p.name,l.name location_name FROM stock_movements m JOIN products p ON p.id=m.product_id LEFT JOIN locations l ON l.id=m.location_id ORDER BY m.created_at DESC LIMIT 10`)
  ]);
  const today = await query(`SELECT COALESCE(SUM(qty) FILTER (WHERE type IN ('IN','TRANSFER_IN') AND created_at::date=CURRENT_DATE),0)::int incoming,
  COALESCE(SUM(qty) FILTER (WHERE type IN ('OUT','TRANSFER_OUT') AND created_at::date=CURRENT_DATE),0)::int outgoing FROM stock_movements`);
  return Response.json({kpi:{...kpi.rows[0],...today.rows[0]},lowStock:low.rows,movements:moves.rows});
}
