import pg from 'pg'

const { Pool } = pg

function poolSslOption(connectionString) {
  if (!connectionString) return false
  if (connectionString.includes('localhost') || connectionString.includes('127.0.0.1')) {
    return false
  }
  if (/sslmode=disable/i.test(connectionString)) return false
  return { rejectUnauthorized: false }
}

export function createPool() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required (Render PostgreSQL or local connection string)')
  }
  const ssl = poolSslOption(connectionString)
  return new Pool({
    connectionString,
    ssl: ssl || undefined
  })
}

export async function initDb(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      body JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS budget_items (
      id TEXT PRIMARY KEY,
      body JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
}
