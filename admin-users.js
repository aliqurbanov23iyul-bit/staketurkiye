const { isAdmin } = require('./_lib/auth');
const { getSql } = require('./_lib/user-db');

module.exports = async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ ok: false, error: 'Yetkisiz.' });
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const sql = await getSql();
    const users = await sql`SELECT id, username, email, status, created_at, last_login_at FROM portal_users ORDER BY created_at DESC LIMIT 500`;
    const countRows = await sql`SELECT COUNT(*)::int AS count FROM portal_users`;
    return res.status(200).json({ ok: true, count: countRows[0]?.count || 0, users });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: 'Kullanıcılar alınamadı.' });
  }
};
