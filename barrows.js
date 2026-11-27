// Icons are loaded from the Old School RuneScape Wiki
const WIKI = 'https://oldschool.runescape.wiki/images/';
// The order here sets each item's saved number, so don't rearrange it during an event
const BROTHERS = [
  ['Ahrim', [['hood', '8d9e1'], ['robetop', '248b4'], ['robeskirt', '65d4f'], ['staff', '248b4']]],
  ['Dharok', [['helm', '3043c'], ['platebody', '4806b'], ['platelegs', '2c9d4'], ['greataxe', '3043c']]],
  ['Guthan', [['helm', 'e75c0'], ['platebody', '06911'], ['chainskirt', 'd316a'], ['warspear', '06911']]],
  ['Karil', [['coif', '49f5e'], ['leathertop', '6d393'], ['leatherskirt', '49f5e'], ['crossbow', '49f5e']]],
  ['Torag', [['helm', 'c9227'], ['platebody', '04f28'], ['platelegs', '9e8ff'], ['hammers', 'c9227']]],
  ['Verac', [['helm', 'e3acf'], ['brassard', 'e3acf'], ['plateskirt', '4afbb'], ['flail', 'f4ddf']]],
];
const X = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M15 15 85 85M85 15 15 85" stroke="#e11d1d" stroke-width="11" stroke-linecap="round"/></svg>';

// barrows.html?team=1 to ?team=5
const number = Number(new URLSearchParams(location.search).get('team'));
const team = Number.isInteger(number) && number >= 1 && number <= 5 ? number - 1 : 0;

const statusEl = document.getElementById('status');
let log = Array(24).fill(false);
let loaded = false;
let busy = false;
let version = 0;
let lastSave = 0;
const buttons = [];

function setTitle(name) {
  document.getElementById('title').textContent = name + ' Barrows Log';
  document.title = name + ' Barrows Log';
}

function render() {
  buttons.forEach((el, i) => {
    el.classList.toggle('crossed', log[i]);
    el.setAttribute('aria-pressed', log[i]);
    el.disabled = !loaded || busy;
  });
  const items = log.filter(Boolean).length;
  const sets = BROTHERS.filter((_, b) => log.slice(b * 4, b * 4 + 4).every(Boolean)).length;
  document.getElementById('count').textContent = loaded ? items + ' / 24 items, ' + sets + (sets === 1 ? ' full set' : ' full sets') : '';
}

async function request(body) {
  const fresh = !body && Date.now() - lastSave < 10000;
  const response = await fetch('/api/barrows' + (fresh ? '?fresh=' + Date.now() : ''), body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : undefined);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error);
  return data;
}

async function refresh() {
  if (busy) return;
  const startedAt = version;
  try {
    const data = await request();
    if (startedAt !== version) return;
    log = data.logs[team];
    loaded = true;
    statusEl.textContent = '';
  } catch (error) {
    statusEl.textContent = "Can't load the latest log. " + (error.message || 'Retrying shortly.');
  }
  render();
}

async function toggle(i) {
  busy = true;
  version++;
  statusEl.textContent = 'Saving…';
  render();
  try {
    const data = await request({ team, item: i, crossed: !log[i] });
    log = data.logs[team];
    statusEl.textContent = '';
  } catch (error) {
    statusEl.textContent = 'Not saved. ' + (error.message || 'Check your connection and try again.');
  }
  lastSave = Date.now();
  version++;
  busy = false;
  render();
}

BROTHERS.forEach(([brother, pieces]) => {
  const heading = document.createElement('h2');
  heading.textContent = brother + "'s";
  const grid = document.createElement('div');
  grid.className = 'grid';
  pieces.forEach(([piece, tag]) => {
    const name = brother + "'s " + piece;
    const i = buttons.length;
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'item';
    el.innerHTML = '<img alt="" referrerpolicy="no-referrer"><span></span>' + X;
    // If an icon can't load, hide the broken picture; the item's name still shows
    el.querySelector('img').addEventListener('error', (event) => { event.target.hidden = true; });
    el.querySelector('img').src = WIKI + encodeURIComponent(name.replace(/ /g, '_')).replace(/'/g, '%27') + '.png?' + tag;
    el.querySelector('span').textContent = name;
    el.addEventListener('click', () => toggle(i));
    buttons.push(el);
    grid.appendChild(el);
  });
  document.getElementById('log').append(heading, grid);
});

setTitle('Team ' + (team + 1));
// Show the team's custom name if an admin has set one
fetch('/api/progress')
  .then((r) => r.json())
  .then((data) => { if (data.players[team].title) setTitle(data.players[team].title); })
  .catch(() => {});

render();
refresh();
setInterval(() => { if (!document.hidden) refresh(); }, 15000);
// Also covers returning with the browser's back button
window.addEventListener('pageshow', (event) => { if (event.persisted) refresh(); });
