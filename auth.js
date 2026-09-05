const crypto = require('crypto');

const COOKIE_NAME = 'st_admin';
const TTL_MS = 12 * 60 * 60 * 1000;

function secret() {
  return process.env.ADMIN_SECRET || '';
}

function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

function makeToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TTL_MS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function verifyToken(token) {
  if (!token || !secret()) return false;
  const [payload, sig] = String(token).split('.');
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return Number(data.exp) > Date.now();
  } catch {
    return false;
  }
}

function cookieMap(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').filter(Boolean).map(part => {
    const i = part.indexOf('=');
    return [decodeURIComponent(part.slice(0, i).trim()), decodeURIComponent(part.slice(i + 1).trim())];
  }));
}

function isAdmin(req) {
  return verifyToken(cookieMap(req)[COOKIE_NAME]);
}

function setAdminCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${makeToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${TTL_MS / 1000}${secure}`);
}

function clearAdminCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0; Secure`);
}

module.exports = { isAdmin, setAdminCookie, clearAdminCookie, safeEqual };
