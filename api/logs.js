// Item logs for the expandable tiles. Anyone can read them and add or remove crosses, in any order.
const { redis } = require('./progress.js');
const LOGS = require('../logs-data.js');

// Barrows keeps its original name, so progress saved before the other logs existed isn't lost
const hashFor = (tile) => (tile === 6 ? 'tile-rush:barrows' : 'tile-rush:log:' + tile);
const itemCount = (tile) => LOGS[tile].groups.reduce((total, group) => total + group.items.length, 0);

// Returns one list of true/false values for each team
async function readLog(tile) {
  const flat = (await redis('HGETALL', hashFor(tile))) || [];
  const logs = [0, 1, 2, 3, 4].map(() => Array(itemCount(tile)).fill(false));
  for (let i = 0; i < flat.length; i += 2) {
    const [team, item] = String(flat[i]).split(':').map(Number);
    if (item < itemCount(tile)) logs[team][item] = true;
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
      const tile = Number(new URL(req.url, 'http://localhost').searchParams.get('tile'));
      if (!Object.hasOwn(LOGS, tile)) return send(400, { error: 'Unknown tile.' });
      return send(200, { logs: await readLog(tile) });
    }
    if (req.method !== 'POST') return send(405, { error: 'Method not allowed.' });

    const { tile, team, item, crossed } = req.body || {};
    if (!Number.isInteger(tile) || !Object.hasOwn(LOGS, tile)) return send(400, { error: 'Unknown tile.' });
    const within = (v, max) => Number.isInteger(v) && v >= 0 && v < max;
    if (!within(team, 5) || !within(item, itemCount(tile)) || typeof crossed !== 'boolean') {
      return send(400, { error: 'Unknown item.' });
    }
    if (crossed) await redis('HSET', hashFor(tile), team + ':' + item, '1');
    else await redis('HDEL', hashFor(tile), team + ':' + item);
    return send(200, { logs: await readLog(tile) });
  } catch (error) {
    console.error(error);
    return send(500, { error: error.message });
  }
};
