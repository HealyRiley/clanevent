// Shared Tile Rush progress, stored in Redis (Upstash) through its REST API.
// Anyone can read. Changing tiles needs the ADMIN_KEY environment variable.
const crypto = require('crypto');

const HASH = 'tile-rush:progress'; // one 36-character string of 0s and 1s per team
const EMPTY = '0'.repeat(36);
// Player names are stored as "team:player" fields, and each captain as "team:captain"
const PLAYERS = 'tile-rush:players';

// A captain must have a name. -1 removes the captain.
const SET_CAPTAIN = `
if ARGV[2] == '-1' then redis.call('HDEL', KEYS[1], ARGV[1] .. ':captain') return 1 end
if redis.call('HEXISTS', KEYS[1], ARGV[1] .. ':' .. ARGV[2]) == 0 then return 0 end
redis.call('HSET', KEYS[1], ARGV[1] .. ':captain', ARGV[2])
return 1`;

// Clearing a captain's name also removes the captaincy
const SET_NAME = `
if ARGV[3] == '' then
  redis.call('HDEL', KEYS[1], ARGV[1] .. ':' .. ARGV[2])
  if redis.call('HGET', KEYS[1], ARGV[1] .. ':captain') == ARGV[2] then redis.call('HDEL', KEYS[1], ARGV[1] .. ':captain') end
else
  redis.call('HSET', KEYS[1], ARGV[1] .. ':' .. ARGV[2], ARGV[3])
end
return 1`;

// Runs inside Redis, so the order check and the save happen as one step
const SET_TILE = `
local s = redis.call('HGET', KEYS[1], ARGV[1]) or string.rep('0', 36)
local n = tonumber(ARGV[2])
if ARGV[3] == '1' and string.sub(s, 1, n - 1) ~= string.rep('1', n - 1) then return 0 end
redis.call('HSET', KEYS[1], ARGV[1], string.sub(s, 1, n - 1) .. ARGV[3] .. string.sub(s, n + 1))
return 1`;

async function redis(...command) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('The database is not connected yet.');
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || 'Database request failed.');
  return data.result;
}

async function readTeams() {
  const flat = (await redis('HGETALL', HASH)) || [];
  const teams = [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY];
  for (let i = 0; i < flat.length; i += 2) teams[Number(flat[i])] = flat[i + 1];
  return teams;
}

async function readPlayers() {
  const flat = (await redis('HGETALL', PLAYERS)) || [];
  const players = [0, 1, 2, 3, 4].map(() => ({ names: Array(9).fill(''), captain: -1 }));
  for (let i = 0; i < flat.length; i += 2) {
    const [team, slot] = String(flat[i]).split(':');
    if (slot === 'captain') players[team].captain = Number(flat[i + 1]);
    else players[team].names[slot] = String(flat[i + 1]);
  }
  return players;
}

async function readAll() {
  const [teams, players] = await Promise.all([readTeams(), readPlayers()]);
  return { teams, players };
}

function isAdmin(req) {
  const expected = process.env.ADMIN_KEY;
  const given = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!expected || !given) return false;
  const hash = (v) => crypto.createHash('sha256').update(v).digest();
  return crypto.timingSafeEqual(hash(given), hash(expected));
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const send = (status, body) => res.status(status).json(body);
  try {
    if (req.method === 'GET') {
      // A request carrying a key is checked, so the page knows whether to unlock editing
      if (req.headers.authorization) {
        if (!isAdmin(req)) return send(401, { error: 'That admin link is not valid.' });
      } else {
        // Lets Vercel share one answer between viewers for 5 seconds, saving database usage
        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=5');
      }
      return send(200, await readAll());
    }

    if (req.method !== 'POST') return send(405, { error: 'Method not allowed.' });
    if (!isAdmin(req)) return send(401, { error: 'That admin link is not valid.' });

    const { team, tile, crossed, reset, player, name, captain } = req.body || {};
    if (!Number.isInteger(team) || team < 0 || team > 4) return send(400, { error: 'Unknown team.' });

    const isSlot = (v) => Number.isInteger(v) && v >= 0 && v <= 8;

    if (player !== undefined) {
      if (!isSlot(player) || typeof name !== 'string' || name.trim().length > 12) {
        return send(400, { error: 'Names can be up to 12 characters.' });
      }
      await redis('EVAL', SET_NAME, '1', PLAYERS, String(team), String(player), name.trim());
    } else if (captain !== undefined) {
      if (captain !== -1 && !isSlot(captain)) return send(400, { error: 'Unknown player.' });
      const ok = await redis('EVAL', SET_CAPTAIN, '1', PLAYERS, String(team), String(captain));
      if (!ok) return send(409, { error: 'Type a name before making that player captain.', ...(await readAll()) });
    } else if (reset === true) {
      await redis('HDEL', HASH, String(team));
    } else {
      if (!Number.isInteger(tile) || tile < 1 || tile > 36 || typeof crossed !== 'boolean') {
        return send(400, { error: 'Unknown tile.' });
      }
      const ok = await redis('EVAL', SET_TILE, '1', HASH, String(team), String(tile), crossed ? '1' : '0');
      if (!ok) return send(409, { error: 'That tile is locked. Cross off the earlier tiles first.', ...(await readAll()) });
    }
    return send(200, await readAll());
  } catch (error) {
    console.error(error);
    return send(500, { error: error.message });
  }
};
