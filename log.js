// Icons are loaded from the Old School RuneScape Wiki
const WIKI = 'https://oldschool.runescape.wiki/images/';
const X = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M15 15 85 85M85 15 15 85" stroke="#e11d1d" stroke-width="11" stroke-linecap="round"/></svg>';

// log.html?tile=6&team=1
const params = new URLSearchParams(location.search);
const number = Number(params.get('team'));
const team = Number.isInteger(number) && number >= 1 && number <= 5 ? number - 1 : 0;
const tile = Object.hasOwn(LOGS, params.get('tile')) ? Number(params.get('tile')) : 6;
const config = LOGS[tile];
const ITEMS = config.groups.flatMap((group) => group.items);

const statusEl = document.getElementById('status');
let log = Array(ITEMS.length).fill(false);
let loaded = false;
let busy = false;
let version = 0;
let lastSave = 0;
const buttons = [];

function setTitle(name) {
  const title = name + ' ' + config.name + ' Log';
  document.getElementById('title').textContent = title;
  document.title = title;
}

function render() {
  buttons.forEach((el, i) => {
    el.classList.toggle('crossed', log[i]);
    el.setAttribute('aria-pressed', log[i]);
    el.disabled = !loaded || busy;
  });
  const items = log.filter(Boolean).length;
  let text = items + ' / ' + ITEMS.length + ' items';
  if (tile === 6) {
    // Each brother's set is four items in a row
    const sets = config.groups.filter((_, b) => log.slice(b * 4, b * 4 + 4).every(Boolean)).length;
    text += ', ' + sets + (sets === 1 ? ' full set' : ' full sets');
  }
  document.getElementById('count').textContent = loaded ? text : '';
}

async function request(body) {
  const fresh = !body && Date.now() - lastSave < 10000;
  const response = await fetch('/api/logs?tile=' + tile + (fresh ? '&fresh=' + Date.now() : ''), body
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
    const data = await request({ tile, team, item: i, crossed: !log[i] });
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

config.groups.forEach((group) => {
  const grid = document.createElement('div');
  grid.className = 'grid' + (config.smooth ? ' smooth' : '');
  group.items.forEach(([name, image]) => {
    const i = buttons.length;
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'item';
    el.innerHTML = '<img alt="" referrerpolicy="no-referrer"><span></span>' + X;
    // If an icon can't load, hide the broken picture; the item's name still shows
    el.querySelector('img').addEventListener('error', (event) => { event.target.hidden = true; });
    el.querySelector('img').src = WIKI + image;
    el.querySelector('span').textContent = name;
    el.addEventListener('click', () => toggle(i));
    buttons.push(el);
    grid.appendChild(el);
  });
  if (group.heading) {
    const heading = document.createElement('h2');
    heading.textContent = group.heading;
    document.getElementById('log').append(heading);
  }
  document.getElementById('log').append(grid);
});

setTitle('Team ' + (team + 1));
document.getElementById('tile-number').textContent = 'Tile ' + tile;
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
