const { currentUser } = require('./_lib/user-auth');
module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const user = await currentUser(req);
    return res.status(200).json({ ok: true, authenticated: Boolean(user), user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: 'Sunucu hatası.' });
  }
};
