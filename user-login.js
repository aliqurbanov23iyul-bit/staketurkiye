const { getSql } = require('./_lib/user-db');
const { verifyPassword, createSession } = require('./_lib/user-auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const sql = await getSql();
    const rows = await sql`SELECT id, username, email, password_hash, password_salt, status FROM portal_users WHERE email = ${email} LIMIT 1`;
    const user = rows[0];
    if (!user || user.status !== 'active' || !verifyPassword(password, user.password_salt, user.password_hash)) {
      return res.status(401).json({ ok: false, error: 'E-posta veya parola hatalı.' });
    }
    await sql`UPDATE portal_users SET last_login_at = NOW() WHERE id = ${user.id}`;
    await createSession(res, user.id);
    return res.status(200).json({ ok: true, user: { id: user.id, username: user.username, email: user.email } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: 'Giriş sırasında sunucu hatası oluştu.' });
  }
};
