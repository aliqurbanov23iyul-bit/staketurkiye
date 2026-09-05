const { neon } = require('@neondatabase/serverless');

function sqlClient() {
  if (!process.env.DATABASE_URL) return null;
  return neon(process.env.DATABASE_URL);
}

async function ensureUserTables(sql) {
  await sql`CREATE TABLE IF NOT EXISTS portal_users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
  )`;
  await sql`CREATE INDEX IF NOT EXISTS portal_users_created_idx ON portal_users (created_at DESC)`;
  await sql`CREATE TABLE IF NOT EXISTS portal_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS portal_sessions_user_idx ON portal_sessions (user_id)`;
}

async function getSql() {
  const sql = sqlClient();
  if (!sql) throw new Error('DATABASE_URL is not configured');
  await ensureUserTables(sql);
  return sql;
}

module.exports = { getSql, ensureUserTables };
