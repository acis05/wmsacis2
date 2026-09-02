import { Pool, PoolClient, QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __gudangkuPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __gudangkuSchemaPromise: Promise<void> | undefined;
}

const SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS warehouses(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(140) NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS locations(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS products(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  barcode VARCHAR(120) UNIQUE,
  category VARCHAR(120),
  unit VARCHAR(30) NOT NULL DEFAULT 'pcs',
  min_stock INTEGER NOT NULL DEFAULT 0 CHECK(min_stock>=0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
CREATE TABLE IF NOT EXISTS inventory(
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 0 CHECK(qty>=0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(product_id,location_id)
);
CREATE TABLE IF NOT EXISTS stock_operations(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_no VARCHAR(40) NOT NULL UNIQUE,
  type VARCHAR(30) NOT NULL CHECK(type IN('IN','OUT','WAREHOUSE_TRANSFER','RACK_TRANSFER')),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  source_location_id UUID REFERENCES locations(id) ON DELETE RESTRICT,
  destination_location_id UUID REFERENCES locations(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL CHECK(qty>0),
  reference VARCHAR(120),
  note TEXT,
  actor VARCHAR(120) NOT NULL DEFAULT 'Admin Gudang',
  operation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS stock_movements(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  type VARCHAR(30) NOT NULL CHECK(type IN('IN','OUT','ADJUSTMENT','TRANSFER_IN','TRANSFER_OUT')),
  qty INTEGER NOT NULL CHECK(qty>0),
  before_qty INTEGER NOT NULL,
  after_qty INTEGER NOT NULL,
  note TEXT,
  actor VARCHAR(120) NOT NULL DEFAULT 'Admin Gudang',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS operation_id UUID REFERENCES stock_operations(id) ON DELETE CASCADE;
CREATE TABLE IF NOT EXISTS integration_settings(
  id VARCHAR(40) PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  client_id TEXT,
  client_secret TEXT,
  access_token TEXT,
  refresh_token TEXT,
  database_id TEXT,
  last_sync_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO integration_settings(id) VALUES('aolinx') ON CONFLICT(id) DO NOTHING;
INSERT INTO warehouses(code,name) VALUES('WH-UTAMA','Gudang Utama') ON CONFLICT(code) DO NOTHING;
UPDATE locations SET warehouse_id=(SELECT id FROM warehouses WHERE code='WH-UTAMA' LIMIT 1) WHERE warehouse_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operations_date ON stock_operations(operation_date DESC);
`;

function getPool(): Pool {
  if (global.__gudangkuPool) return global.__gudangkuPool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL belum diset. Tambahkan variable DATABASE_URL yang mengarah ke PostgreSQL Railway.");
  global.__gudangkuPool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });
  return global.__gudangkuPool;
}

async function bootstrapSchema(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    // Mencegah dua instance melakukan bootstrap bersamaan.
    await client.query("SELECT pg_advisory_lock(73190217)");
    await client.query("SET search_path TO public");
    await client.query(SCHEMA_SQL);
  } finally {
    try { await client.query("SELECT pg_advisory_unlock(73190217)"); } catch {}
    client.release();
  }
}

export async function ensureSchema(): Promise<void> {
  if (!global.__gudangkuSchemaPromise) {
    global.__gudangkuSchemaPromise = bootstrapSchema().catch((err) => {
      global.__gudangkuSchemaPromise = undefined;
      throw err;
    });
  }
  return global.__gudangkuSchemaPromise;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  await ensureSchema();
  return getPool().query<T>(text, params);
}

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
