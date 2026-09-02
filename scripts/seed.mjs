import pg from "pg";
const { Client } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL wajib diisi");
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined });
await client.connect();
await client.query("BEGIN");
try {
  await client.query(`INSERT INTO locations(code,name) VALUES
    ('A-01','Rak A-01'),('A-02','Rak A-02'),('B-03','Rak B-03'),('C-01','Rak C-01')
    ON CONFLICT (code) DO NOTHING`);
  await client.query(`INSERT INTO products(sku,name,barcode,category,unit,min_stock) VALUES
    ('IDM-GRG-001','Indomie Goreng','8999999001234','Makanan','pcs',20),
    ('AQU-600-001','Aqua 600ml','8999999002231','Minuman','pcs',15),
    ('KOP-ABC-001','Kopi ABC','8999999003238','Minuman','pcs',10)
    ON CONFLICT (sku) DO NOTHING`);
  await client.query(`
    INSERT INTO inventory(product_id,location_id,qty)
    SELECT p.id,l.id,v.qty FROM (VALUES
      ('IDM-GRG-001','A-02',124),('AQU-600-001','B-03',8),('KOP-ABC-001','C-01',5)
    ) v(sku,code,qty)
    JOIN products p ON p.sku=v.sku JOIN locations l ON l.code=v.code
    ON CONFLICT(product_id,location_id) DO UPDATE SET qty=EXCLUDED.qty, updated_at=NOW()`);
  await client.query("COMMIT");
  console.log("Seed selesai.");
} catch (e) { await client.query("ROLLBACK"); throw e; }
await client.end();
