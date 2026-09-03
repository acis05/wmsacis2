import pg from "pg";
const { Client } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL wajib diisi");
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined });
await client.connect();
await client.query("BEGIN");
try {
  const acc=(await client.query(`SELECT id,name FROM app_accounts ORDER BY created_at LIMIT 1`)).rows[0];
  if(!acc) throw new Error('Buat/login tenant terlebih dahulu sebelum seed.');
  let company=(await client.query(`SELECT id FROM companies WHERE account_id=$1 ORDER BY created_at LIMIT 1`,[acc.id])).rows[0];
  if(!company) company=(await client.query(`INSERT INTO companies(account_id,code,name) VALUES($1,'MAIN',$2) RETURNING id`,[acc.id,acc.name])).rows[0];
  let wh=(await client.query(`SELECT id FROM warehouses WHERE account_id=$1 AND code='MAIN'`,[acc.id])).rows[0];
  if(!wh) wh=(await client.query(`INSERT INTO warehouses(account_id,code,name) VALUES($1,'MAIN','Gudang Utama') RETURNING id`,[acc.id])).rows[0];
  for(const code of ['A-01','A-02','B-03','C-01']) await client.query(`INSERT INTO locations(account_id,warehouse_id,code,name) VALUES($1,$2,$3,$4) ON CONFLICT(warehouse_id,code) DO NOTHING`,[acc.id,wh.id,code,`Rak ${code}`]);
  for(const [sku,name,barcode,category,min] of [['IDM-GRG-001','Indomie Goreng','8999999001234','Makanan',20],['AQU-600-001','Aqua 600ml','8999999002231','Minuman',15],['KOP-ABC-001','Kopi ABC','8999999003238','Minuman',10]]) await client.query(`INSERT INTO products(account_id,sku,name,barcode,category,unit,min_stock) VALUES($1,$2,$3,$4,$5,'pcs',$6) ON CONFLICT(account_id,LOWER(sku)) DO NOTHING`,[acc.id,sku,name,barcode,category,min]);
  for(const [sku,code,qty] of [['IDM-GRG-001','A-02',124],['AQU-600-001','B-03',8],['KOP-ABC-001','C-01',5]]) await client.query(`INSERT INTO inventory(account_id,company_id,product_id,location_id,qty) SELECT $1,$2,p.id,l.id,$5 FROM products p JOIN locations l ON l.account_id=p.account_id WHERE p.account_id=$1 AND p.sku=$3 AND l.code=$4 LIMIT 1 ON CONFLICT(account_id,company_id,product_id,location_id) DO UPDATE SET qty=EXCLUDED.qty,updated_at=NOW()`,[acc.id,company.id,sku,code,qty]);
  await client.query("COMMIT");console.log("Seed V21 selesai.");
} catch (e) { await client.query("ROLLBACK"); throw e; }
await client.end();
