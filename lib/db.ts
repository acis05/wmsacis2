import { Pool, PoolClient, QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __gudangkuPool: Pool | undefined;
}

function getPool(): Pool {
  if (global.__gudangkuPool) return global.__gudangkuPool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL belum diset. Tambahkan variable DATABASE_URL yang mengarah ke PostgreSQL Railway."
    );
  }

  const pool = new Pool({
    connectionString,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
    max: 10,
  });

  // Cache pool pada proses Node agar koneksi tidak dibuat ulang tiap request.
  global.__gudangkuPool = pool;
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
) {
  return getPool().query<T>(text, params);
}

export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
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
