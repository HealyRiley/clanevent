// Each team's barrows log. Anyone can read it and add or remove crosses, in any order.
const { redis } = require('./progress.js');

const HASH = 'tile-rush:barrows'; // a field called "team:item" exists for each crossed item
const ITEMS = 24;

async function readLogs() {
  const flat = (await redis('HGETALL', HASH)) || [];
  const logs = [0, 1, 2, 3, 4].map(() => Array(ITEMS).fill(false));
  for (let i = 0; i < flat.length; i += 2) {
    const [team, item] = String(flat[i]).split(':');
    logs[team][item] = true;
  }
  return logs;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const send = (status, body) => res.status(status).json(body);
  try {
    if (req.method === 'GET') {
      // Lets Vercel share one answer between viewers for 5 seconds
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=5');
      return send(200, { logs: await readLogs() });
    }
    if (req.method !== 'POST') return send(405, { error: 'Method not allowed.' });

    const { team, item, crossed } = req.body || {};
    const within = (v, max) => Number.isInteger(v) && v >= 0 && v < max;
    if (!within(team, 5) || !within(item, ITEMS) || typeof crossed !== 'boolean') {
      return send(400, { error: 'Unknown item.' });
    }
    if (crossed) await redis('HSET', HASH, team + ':' + item, '1');
    else await redis('HDEL', HASH, team + ':' + item);
    return send(200, { logs: await readLogs() });
  } catch (error) {
    console.error(error);
    return send(500, { error: error.message });
  }
};
