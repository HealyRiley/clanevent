// Changes the admin password. Needs the owner password (OWNER_PASSWORD in Vercel).
const { redis, matches, hashPassword, AUTH_KEY } = require('./progress.js');

const MAX_TRIES = 5;
const LOCK_SECONDS = 15 * 60;

// Counts an attempt and starts the 15 minute timer on the first one
const COUNT_TRY = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return n`;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const send = (status, body) => res.status(status).json(body);
  try {
    if (req.method !== 'POST') return send(405, { error: 'Method not allowed.' });
    const owner = process.env.OWNER_PASSWORD;
    if (!owner) return send(500, { error: 'OWNER_PASSWORD has not been set up in Vercel yet.' });

    const { ownerPassword, newPassword } = req.body || {};
    const ip = req.headers['x-real-ip'] || String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0];
    const triesKey = 'tile-rush:owner-tries:' + ip;
    if ((await redis('EVAL', COUNT_TRY, '1', triesKey, String(LOCK_SECONDS))) > MAX_TRIES) {
      return send(429, { error: 'Too many attempts. Wait 15 minutes and try again.' });
    }
    if (typeof ownerPassword !== 'string' || !matches(ownerPassword, owner)) {
      return send(403, { error: 'Incorrect owner password.' });
    }
    await redis('DEL', triesKey);

    // No spaces or special unicode, so the password can be sent safely with each request
    if (typeof newPassword !== 'string' || !/^[!-~]{8,100}$/.test(newPassword)) {
      return send(400, { error: 'The new password needs at least 8 characters and no spaces.' });
    }
    if (matches(newPassword, owner)) {
      return send(400, { error: 'The admin password must be different from the owner password.' });
    }
    await redis('SET', AUTH_KEY, hashPassword(newPassword));
    return send(200, { ok: true });
  } catch (error) {
    console.error(error);
    return send(500, { error: error.message });
  }
};
