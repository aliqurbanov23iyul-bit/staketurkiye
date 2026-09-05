const { getSql } = require('./user-db');

async function ensureGiveawayTables(sql) {
  await sql`CREATE TABLE IF NOT EXISTS giveaway_campaigns (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    prize TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    ends_at TIMESTAMPTZ NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS giveaway_campaigns_created_idx ON giveaway_campaigns (created_at DESC)`;
  await sql`CREATE TABLE IF NOT EXISTS giveaway_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`;

  await sql`CREATE TABLE IF NOT EXISTS giveaway_entries (
    id BIGSERIAL PRIMARY KEY,
    giveaway_id TEXT NOT NULL,
    user_id BIGINT NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
    telegram TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (giveaway_id, user_id)
  )`;
  await sql`CREATE INDEX IF NOT EXISTS giveaway_entries_giveaway_idx ON giveaway_entries (giveaway_id, created_at ASC)`;

  await sql`CREATE TABLE IF NOT EXISTS giveaway_results (
    giveaway_id TEXT PRIMARY KEY,
    winner_user_id BIGINT NOT NULL REFERENCES portal_users(id) ON DELETE RESTRICT,
    drawn_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

async function giveawaySql() {
  const sql = await getSql();
  if (!sql) throw new Error('DATABASE_URL is not configured');
  await ensureGiveawayTables(sql);
  return sql;
}

async function importLegacyGiveaways(sql, items) {
  const done = await sql`SELECT value FROM giveaway_meta WHERE key = 'legacy_import_v2' LIMIT 1`;
  if (done.length) return;
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || !item.id || !String(item.title || '').trim() || !String(item.prize || '').trim() || !item.date) continue;
    const end = new Date(item.date);
    if (!Number.isFinite(end.getTime())) continue;
    await sql`INSERT INTO giveaway_campaigns (id, title, prize, description, ends_at, active, created_at)
      VALUES (${String(item.id)}, ${String(item.title).trim()}, ${String(item.prize).trim()}, ${String(item.description || '').trim()}, ${end.toISOString()}, ${item.active !== false}, ${item.createdAt || new Date().toISOString()})
      ON CONFLICT (id) DO NOTHING`;
  }
  await sql`INSERT INTO giveaway_meta (key, value) VALUES ('legacy_import_v2', 'done') ON CONFLICT (key) DO NOTHING`;
}

async function settleExpiredGiveaways(sql) {
  const expired = await sql`SELECT id FROM giveaway_campaigns WHERE active = TRUE AND ends_at <= NOW()`;
  for (const row of expired) {
    await sql`WITH candidate AS (
        SELECT user_id FROM giveaway_entries
        WHERE giveaway_id = ${row.id}
        ORDER BY random()
        LIMIT 1
      )
      INSERT INTO giveaway_results (giveaway_id, winner_user_id, drawn_at)
      SELECT ${row.id}, user_id, NOW() FROM candidate
      ON CONFLICT (giveaway_id) DO NOTHING`;
  }
}

function maskUsername(value) {
  const s = String(value || '').trim();
  if (!s) return 'Kullanıcı';
  if (s.length === 1) return `${s}***`;
  if (s.length === 2) return `${s[0]}***${s[1]}`;
  return `${s[0]}${'*'.repeat(Math.max(3, Math.min(12, s.length - 2)))}${s[s.length - 1]}`;
}

module.exports = { giveawaySql, importLegacyGiveaways, settleExpiredGiveaways, maskUsername };
