const { getContent } = require('./_lib/db');
const { currentUser } = require('./_lib/user-auth');
const { giveawaySql, importLegacyGiveaways, settleExpiredGiveaways, maskUsername } = require('./_lib/giveaway-db');

function cleanTelegram(value) {
  let v = String(value || '').trim();
  if (!v) return '';
  v = v.replace(/^https?:\/\/(?:t\.me|telegram\.me)\//i, '').replace(/^@+/, '');
  return '@' + v;
}
function validTelegram(value) { return /^@[A-Za-z0-9_]{5,32}$/.test(value); }

module.exports = async (req, res) => {
  try {
    const sql = await giveawaySql();
    const contentRow = await getContent().catch(() => null);
    await importLegacyGiveaways(sql, contentRow?.data?.giveaways || []);
    await settleExpiredGiveaways(sql);

    if (req.method === 'GET') {
      const user = await currentUser(req).catch(() => null);
      const rows = await sql`SELECT g.id, g.title, g.prize, g.description, g.ends_at, g.active, g.created_at,
        COUNT(e.id)::int AS participant_count,
        wr.username AS winner_username, r.drawn_at
        FROM giveaway_campaigns g
        LEFT JOIN giveaway_entries e ON e.giveaway_id = g.id
        LEFT JOIN giveaway_results r ON r.giveaway_id = g.id
        LEFT JOIN portal_users wr ON wr.id = r.winner_user_id
        WHERE g.active = TRUE
        GROUP BY g.id, wr.username, r.drawn_at
        ORDER BY g.created_at DESC`;
      const joined = user ? await sql`SELECT giveaway_id FROM giveaway_entries WHERE user_id = ${user.id}` : [];
      const joinedSet = new Set(joined.map(x => String(x.giveaway_id)));
      const now = Date.now();
      const items = rows.map(x => {
        const expired = new Date(x.ends_at).getTime() <= now;
        return {
          id: x.id, title: x.title, prize: x.prize, description: x.description,
          date: x.ends_at, active: x.active,
          status: expired ? (x.winner_username ? 'Kazanan Açıklandı' : 'Sona Erdi') : 'Aktif',
          participantCount: Number(x.participant_count || 0), joined: joinedSet.has(String(x.id)),
          winnerDisplay: x.winner_username ? maskUsername(x.winner_username) : null,
          drawnAt: x.drawn_at || null
        };
      });
      return res.status(200).json({ ok: true, authenticated: Boolean(user), items });
    }

    if (req.method === 'POST') {
      const user = await currentUser(req).catch(() => null);
      if (!user) return res.status(401).json({ ok: false, error: 'Çekilişe katılmak için portal hesabına giriş yapmalısın.' });
      const giveawayId = String(req.body?.giveawayId || '').trim();
      const telegram = cleanTelegram(req.body?.telegram);
      if (!validTelegram(telegram)) return res.status(400).json({ ok: false, error: 'Geçerli Telegram kullanıcı adı gir. Örnek: @ali12345' });

      const campaign = await sql`SELECT id, ends_at, active FROM giveaway_campaigns WHERE id = ${giveawayId} LIMIT 1`;
      if (!campaign.length || campaign[0].active !== true) return res.status(404).json({ ok: false, error: 'Çekiliş bulunamadı veya pasif.' });
      if (new Date(campaign[0].ends_at).getTime() <= Date.now()) return res.status(409).json({ ok: false, error: 'Bu çekiliş sona erdi.' });

      const inserted = await sql`INSERT INTO giveaway_entries (giveaway_id, user_id, telegram)
        VALUES (${giveawayId}, ${user.id}, ${telegram})
        ON CONFLICT (giveaway_id, user_id) DO NOTHING RETURNING created_at`;
      if (!inserted.length) return res.status(409).json({ ok: false, error: 'Bu çekilişe zaten katıldın.' });
      return res.status(201).json({ ok: true, message: 'Katılımın başarıyla alındı.', joinedAt: inserted[0].created_at });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('giveaways api:', error);
    const missingDb = /DATABASE_URL/i.test(String(error?.message || ''));
    return res.status(missingDb ? 503 : 500).json({ ok: false, error: missingDb ? 'Database bağlantısı yapılandırılmamış.' : 'Çekiliş sistemi şu anda kullanılamıyor.' });
  }
};
