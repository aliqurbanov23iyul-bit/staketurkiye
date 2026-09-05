const { clearSession } = require('./_lib/user-auth');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    await clearSession(req, res);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: 'Sunucu hatası.' });
  }
};
