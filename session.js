const { isAdmin } = require('./_lib/auth');
module.exports = async (req, res) => res.status(200).json({ ok: true, authenticated: isAdmin(req) });
