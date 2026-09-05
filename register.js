const { getSql } = require('./_lib/user-db');
const { hashPassword, createSession } = require('./_lib/user-auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const username = String(req.body?.username || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const ageConfirmed = req.body?.ageConfirmed === true;
    if (username.length < 2 || username.length > 40) return res.status(400).json({ ok: false, error: 'Kullanıcı adı 2-40 karakter olmalı.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false, error: 'Geçerli bir e-posta gir.' });
    if (password.length < 8) return res.status(400).json({ ok: false, error: 'Parola en az 8 karakter olmalı.' });
    if (!ageConfirmed) return res.status(400).json({ ok: false, error: '18+ onayı gerekli.' });

    const sql = await getSql();
    const exists = await sql`SELECT id FROM portal_users WHERE email = ${email} LIMIT 1`;
    if (exists.length) return res.status(409).json({ ok: false, error: 'Bu e-posta zaten kayıtlı.' });
    const { hash, salt } = hashPassword(password);
    const rows = await sql`INSERT INTO portal_users (username, email, password_hash, password_salt)
      VALUES (${username}, ${email}, ${hash}, ${salt})
      RETURNING id, username, email, created_at`;
    await createSession(res, rows[0].id);
    return res.status(201).json({ ok: true, user: rows[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: 'Kayıt sırasında sunucu hatası oluştu.' });
  }
};
