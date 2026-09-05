const { setAdminCookie, safeEqual } = require('./_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SECRET) {
    return res.status(503).json({ ok: false, error: 'Admin environment variables are not configured.' });
  }
  const password = String(req.body?.password || '');
  if (!safeEqual(password, process.env.ADMIN_PASSWORD)) {
    return res.status(401).json({ ok: false, error: 'Parola hatalı.' });
  }
  setAdminCookie(res);
  return res.status(200).json({ ok: true });
};
