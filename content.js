const { isAdmin } = require('./_lib/auth');
const { getContent, saveContent } = require('./_lib/db');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const row = await getContent();
      return res.status(200).json({ ok: true, configured: Boolean(process.env.DATABASE_URL), data: row?.data || null, updatedAt: row?.updated_at || null });
    }
    if (req.method === 'POST') {
      if (!isAdmin(req)) return res.status(401).json({ ok: false, error: 'Yetkisiz.' });
      if (!req.body || typeof req.body !== 'object') return res.status(400).json({ ok: false, error: 'Geçersiz veri.' });
      const data = { ...req.body };
      if (Array.isArray(data.bonusCodes)) {
        data.bonusCodes = data.bonusCodes
          .filter(x => x && String(x.code || '').trim())
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          .slice(0, 50);
      }
      if (Array.isArray(data.giveaways)) {
        data.giveaways = data.giveaways.filter(x => x && String(x.title || '').trim()).slice(0, 100);
      }
      await saveContent(data);
      return res.status(200).json({ ok: true, updatedAt: new Date().toISOString() });
    }
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: 'Sunucu hatası.' });
  }
};
