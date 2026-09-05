const crypto = require('crypto');
const { getSql } = require('./user-db');

const COOKIE = 'st_portal_user';
const SESSION_DAYS = 14;

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').filter(Boolean).map(part => {
    const i = part.indexOf('=');
    if (i < 0) return ['', ''];
    return [decodeURIComponent(part.slice(0, i).trim()), decodeURIComponent(part.slice(i + 1).trim())];
  }).filter(([k]) => k));
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, salt, expected) {
  const actual = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256');
  const target = Buffer.from(String(expected), 'hex');
  return actual.length === target.length && crypto.timingSafeEqual(actual, target);
}

async function createSession(res, userId) {
  const sql = await getSql();
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
  await sql`DELETE FROM portal_sessions WHERE expires_at <= NOW()`;
  await sql`INSERT INTO portal_sessions (token_hash, user_id, expires_at) VALUES (${tokenHash}, ${userId}, ${expires.toISOString()})`;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure}`);
}

async function currentUser(req) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return null;
  const sql = await getSql();
  const rows = await sql`SELECT u.id, u.username, u.email, u.status, u.created_at
    FROM portal_sessions s
    JOIN portal_users u ON u.id = s.user_id
    WHERE s.token_hash = ${hashToken(token)} AND s.expires_at > NOW() AND u.status = 'active'
    LIMIT 1`;
  return rows[0] || null;
}

async function clearSession(req, res) {
  const token = parseCookies(req)[COOKIE];
  if (token) {
    const sql = await getSql();
    await sql`DELETE FROM portal_sessions WHERE token_hash = ${hashToken(token)}`;
  }
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Secure`);
}

module.exports = { hashPassword, verifyPassword, createSession, currentUser, clearSession };
