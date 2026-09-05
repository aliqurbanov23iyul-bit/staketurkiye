const { isAdmin } = require('./_lib/auth');
const { getContent } = require('./_lib/db');
const { giveawaySql, importLegacyGiveaways, settleExpiredGiveaways } = require('./_lib/giveaway-db');

module.exports = async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ ok: false, error: 'Yetkisiz.' });
  try {
    const sql = await giveawaySql();
    const contentRow = await getContent().catch(() => null);
    await importLegacyGiveaways(sql, contentRow?.data?.giveaways || []);
    await settleExpiredGiveaways(sql);

    if (req.method === 'GET') {
      const giveawayId = String(req.query?.giveawayId || '').trim();
      if (giveawayId) {
        const entries = await sql`SELECT e.id, e.user_id, e.telegram, e.created_at, u.username, u.email,
          CASE WHEN r.winner_user_id = e.user_id THEN TRUE ELSE FALSE END AS is_winner
          FROM giveaway_entries e
          JOIN portal_users u ON u.id = e.user_id
          LEFT JOIN giveaway_results r ON r.giveaway_id = e.giveaway_id
          WHERE e.giveaway_id = ${giveawayId}
          ORDER BY e.created_at ASC`;
        const winner = await sql`SELECT r.drawn_at, u.username, u.email
          FROM giveaway_results r JOIN portal_users u ON u.id = r.winner_user_id
          WHERE r.giveaway_id = ${giveawayId} LIMIT 1`;
        return res.status(200).json({ ok: true, count: entries.length, entries, winner: winner[0] || null });
      }
      const items = await sql`SELECT g.id, g.title, g.prize, g.description, g.ends_at, g.active, g.created_at,
        COUNT(e.id)::int AS participant_count, wr.username AS winner_username, r.drawn_at
        FROM giveaway_campaigns g
        LEFT JOIN giveaway_entries e ON e.giveaway_id = g.id
        LEFT JOIN giveaway_results r ON r.giveaway_id = g.id
        LEFT JOIN portal_users wr ON wr.id = r.winner_user_id
        GROUP BY g.id, wr.username, r.drawn_at
        ORDER BY g.created_at DESC`;
      return res.status(200).json({ ok: true, items });
    }

    if (req.method === 'POST') {
      const title = String(req.body?.title || '').trim();
      const prize = String(req.body?.prize || '').trim();
      const description = String(req.body?.description || '').trim();
      const endsAt = new Date(req.body?.endsAt || '');
      if (!title || !prize) return res.status(400).json({ ok: false, error: 'Başlık ve ödül zorunlu.' });
      if (!Number.isFinite(endsAt.getTime()) || endsAt.getTime() <= Date.now()) return res.status(400).json({ ok: false, error: 'Bitiş tarihi gelecekte olmalı.' });
      const id = `give_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const rows = await sql`INSERT INTO giveaway_campaigns (id, title, prize, description, ends_at, active)
        VALUES (${id}, ${title}, ${prize}, ${description}, ${endsAt.toISOString()}, TRUE)
        RETURNING id, title, prize, description, ends_at, active, created_at`;
      return res.status(201).json({ ok: true, item: rows[0] });
    }

    if (req.method === 'PATCH') {
      const id = String(req.body?.id || '').trim();
      if (!id) return res.status(400).json({ ok: false, error: 'Çekiliş ID eksik.' });
      const rows = await sql`UPDATE giveaway_campaigns SET active = NOT active WHERE id = ${id} RETURNING id, active`;
      if (!rows.length) return res.status(404).json({ ok: false, error: 'Çekiliş bulunamadı.' });
      return res.status(200).json({ ok: true, item: rows[0] });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query?.id || '').trim();
      if (!id) return res.status(400).json({ ok: false, error: 'Çekiliş ID eksik.' });
      await sql`DELETE FROM giveaway_results WHERE giveaway_id = ${id}`;
      await sql`DELETE FROM giveaway_entries WHERE giveaway_id = ${id}`;
      const rows = await sql`DELETE FROM giveaway_campaigns WHERE id = ${id} RETURNING id`;
      if (!rows.length) return res.status(404).json({ ok: false, error: 'Çekiliş bulunamadı.' });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('admin giveaways api:', error);
    const missingDb = /DATABASE_URL/i.test(String(error?.message || ''));
    return res.status(missingDb ? 503 : 500).json({ ok: false, error: missingDb ? 'Database bağlantısı yapılandırılmamış.' : 'Çekiliş yönetimi sırasında sunucu hatası oluştu.' });
  }
};
