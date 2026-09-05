const { clearAdminCookie } = require('./_lib/auth');
module.exports = async (req, res) => {
  clearAdminCookie(res);
  res.status(200).json({ ok: true });
};
