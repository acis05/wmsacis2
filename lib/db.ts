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
ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_locations_warehouse_code ON locations(warehouse_id,code);
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
CREATE TABLE IF NOT EXISTS packing_lists(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packing_no VARCHAR(50) NOT NULL UNIQUE,
  recipient_name VARCHAR(160) NOT NULL,
  recipient_company VARCHAR(160),
  recipient_phone VARCHAR(80),
  address TEXT,
  reference VARCHAR(120),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK(status IN('DRAFT','PACKED','SHIPPED','CANCELLED')),
  notes TEXT,
  packed_by VARCHAR(120) NOT NULL DEFAULT 'Admin Gudang',
  packed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS packing_list_items(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packing_list_id UUID NOT NULL REFERENCES packing_lists(id) ON DELETE CASCADE,
  operation_id UUID UNIQUE REFERENCES stock_operations(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  qty INTEGER NOT NULL CHECK(qty>0),
  unit VARCHAR(30) NOT NULL DEFAULT 'pcs',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_packing_lists_created_at ON packing_lists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_packing_items_list ON packing_list_items(packing_list_id);

CREATE TABLE IF NOT EXISTS app_accounts(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(180) NOT NULL,
  account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK(account_status IN('ACTIVE','PAUSED','SUSPENDED')),
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS app_roles(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES app_accounts(id) ON DELETE CASCADE,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(140) NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS app_users(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES app_accounts(id) ON DELETE CASCADE,
  email VARCHAR(190) NOT NULL UNIQUE,
  name VARCHAR(140) NOT NULL,
  company VARCHAR(160),
  password_hash TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES app_roles(id) ON DELETE RESTRICT,
  is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
  account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK(account_status IN('ACTIVE','PAUSED','SUSPENDED')),
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE app_roles ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES app_accounts(id) ON DELETE CASCADE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES app_accounts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(lower(email));
INSERT INTO app_roles(code,name,is_system,permissions) VALUES('SUPERADMIN','Super Administrator',TRUE,'["*"]'::jsonb) ON CONFLICT(code) DO NOTHING;

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

-- V17: bootstrap harus mengikuti struktur multi-tenant.
-- Jangan membuat warehouse/AOLINX global karena setiap account harus mulai dari data kosong.
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES app_accounts(id) ON DELETE CASCADE;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES app_accounts(id) ON DELETE CASCADE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES app_accounts(id) ON DELETE CASCADE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES app_accounts(id) ON DELETE CASCADE;
ALTER TABLE stock_operations ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES app_accounts(id) ON DELETE CASCADE;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES app_accounts(id) ON DELETE CASCADE;
ALTER TABLE packing_lists ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES app_accounts(id) ON DELETE CASCADE;
ALTER TABLE packing_list_items ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES app_accounts(id) ON DELETE CASCADE;
ALTER TABLE integration_settings ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES app_accounts(id) ON DELETE CASCADE;

ALTER TABLE warehouses DROP CONSTRAINT IF EXISTS warehouses_code_key;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sku_key;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_barcode_key;
ALTER TABLE stock_operations DROP CONSTRAINT IF EXISTS stock_operations_operation_no_key;
ALTER TABLE packing_lists DROP CONSTRAINT IF EXISTS packing_lists_packing_no_key;
ALTER TABLE integration_settings DROP CONSTRAINT IF EXISTS integration_settings_pkey;

CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouses_account_code ON warehouses(account_id,code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_account_sku ON products(account_id,LOWER(sku));
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_account_barcode ON products(account_id,barcode) WHERE barcode IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_operations_account_no ON stock_operations(account_id,operation_no);
CREATE UNIQUE INDEX IF NOT EXISTS uq_packing_account_no ON packing_lists(account_id,packing_no);
CREATE UNIQUE INDEX IF NOT EXISTS uq_integration_account_id ON integration_settings(account_id,id);
CREATE INDEX IF NOT EXISTS idx_products_account ON products(account_id);
CREATE INDEX IF NOT EXISTS idx_inventory_account ON inventory(account_id);
CREATE INDEX IF NOT EXISTS idx_operations_account ON stock_operations(account_id);
CREATE INDEX IF NOT EXISTS idx_movements_account ON stock_movements(account_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_account ON warehouses(account_id);
CREATE INDEX IF NOT EXISTS idx_locations_account ON locations(account_id);
CREATE INDEX IF NOT EXISTS idx_packing_account ON packing_lists(account_id);
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
