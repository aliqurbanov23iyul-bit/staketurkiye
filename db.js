const { neon } = require('@neondatabase/serverless');

function getSql() {
  if (!process.env.DATABASE_URL) return null;
  return neon(process.env.DATABASE_URL);
}

async function ensureTable(sql) {
  await sql`CREATE TABLE IF NOT EXISTS site_content (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

async function getContent() {
  const sql = getSql();
  if (!sql) return null;
  await ensureTable(sql);
  const rows = await sql`SELECT data, updated_at FROM site_content WHERE id = 'main' LIMIT 1`;
  return rows[0] || null;
}

async function saveContent(data) {
  const sql = getSql();
  if (!sql) throw new Error('DATABASE_URL is not configured');
  await ensureTable(sql);
  const json = JSON.stringify(data);
  await sql`INSERT INTO site_content (id, data, updated_at)
    VALUES ('main', ${json}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
}

module.exports = { getContent, saveContent };
