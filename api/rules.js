// Saved edits to the rules page. Anyone can read; saving needs the ADMIN_KEY.
const { redis, isAdmin } = require('./progress.js');

const HASH = 'tile-rush:rules'; // one field per edited section
const SECTIONS = ['row1', 'row2', 'row3', 'row4', 'row5', 'row6', 'general', 'event'];

async function readRules() {
  const flat = (await redis('HGETALL', HASH)) || [];
  const rules = {};
  for (let i = 0; i < flat.length; i += 2) rules[flat[i]] = String(flat[i + 1]);
  return rules;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const send = (status, body) => res.status(status).json(body);
  try {
    if (req.method === 'GET') {
      if (req.headers.authorization) {
        if (!isAdmin(req)) return send(401, { error: 'The admin password is not valid.' });
      } else {
        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=5');
      }
      return send(200, { rules: await readRules() });
    }
    if (req.method !== 'POST') return send(405, { error: 'Method not allowed.' });
    if (!isAdmin(req)) return send(401, { error: 'The admin password is not valid.' });

    const { id, text } = req.body || {};
    if (!SECTIONS.includes(id) || typeof text !== 'string' || !text.trim() || text.length > 5000) {
      return send(400, { error: 'Rules text must be between 1 and 5000 characters.' });
    }
    await redis('HSET', HASH, id, text.replace(/\r\n/g, '\n').trim());
    return send(200, { rules: await readRules() });
  } catch (error) {
    console.error(error);
    return send(500, { error: error.message });
  }
};
