const TEAMS = ['Team 1', 'Team 2', 'Team 3', 'Team 4', 'Team 5'];
const REFRESH_MS = 15000;
const X = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M15 15 85 85M85 15 15 85" stroke="#e11d1d" stroke-width="11" stroke-linecap="round"/></svg>';

// The admin link looks like https://your-site/#admin=YOUR_KEY
let adminKey = new URLSearchParams(location.hash.slice(1)).get('admin');
let isAdmin = false; // only true once the server accepts the key
let loaded = false;
let busy = false;
let version = 0; // goes up on every save, so older refreshes are ignored
let progress = TEAMS.map(() => '0'.repeat(36));

const statusEl = document.getElementById('status');
const boards = [];

function render() {
  document.body.classList.toggle('admin', isAdmin);
  document.getElementById('intro').textContent = isAdmin
    ? 'Admin mode: click the next tile to cross it off. Click a red X to remove it.'
    : "Follow each team's progress. This page updates automatically.";

  boards.forEach(({ tiles, count, reset }, t) => {
    const state = progress[t];
    const next = state.indexOf('0') + 1; // the only unlocked tile (0 when all are done)
    tiles.forEach(({ el, number }) => {
      const crossed = state[number - 1] === '1';
      const usable = isAdmin && !busy && (crossed || number === next);
      el.classList.toggle('crossed', crossed);
      el.classList.toggle('next', isAdmin && !crossed && number === next);
      el.disabled = !usable;
      const label = crossed ? 'crossed off' : number === next ? 'next tile' : 'locked';
      el.setAttribute('aria-label', TEAMS[t] + ', tile ' + number + ', ' + label);
    });
    count.textContent = loaded ? state.split('1').length - 1 + ' / 36' : '';
    reset.hidden = !isAdmin;
    reset.disabled = busy;
  });
}

async function request(body) {
  const options = { headers: {} };
  if (adminKey) options.headers.Authorization = 'Bearer ' + adminKey;
  if (body) {
    options.method = 'POST';
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const response = await fetch('/api/progress', options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function refresh() {
  if (busy) return;
  const startedAt = version;
  try {
    const { response, data } = await request();
    if (startedAt !== version) return;
    if (response.status === 401) {
      adminKey = null;
      isAdmin = false;
      await refresh();
      statusEl.textContent = 'That admin link is not valid, so this page is view only.';
      return;
    }
    if (!response.ok) throw new Error(data.error);
    progress = data.teams;
    loaded = true;
    isAdmin = Boolean(adminKey);
    if (statusEl.dataset.type === 'connection') statusEl.textContent = '';
  } catch (error) {
    statusEl.dataset.type = 'connection';
    statusEl.textContent = "Can't load the latest progress. " + (error.message || 'Retrying shortly.');
  }
  render();
}

async function change(body) {
  busy = true;
  version++;
  statusEl.dataset.type = 'save';
  statusEl.textContent = 'Saving…';
  render();
  try {
    const { response, data } = await request(body);
    if (data.teams) progress = data.teams;
    if (response.status === 401) isAdmin = false;
    if (!response.ok) throw new Error(data.error);
    statusEl.textContent = '';
  } catch (error) {
    statusEl.textContent = 'Not saved. ' + (error.message || 'Check your connection and try again.');
  }
  busy = false;
  render();
}

TEAMS.forEach((name, t) => {
  const section = document.createElement('section');
  section.innerHTML = '<header><h2></h2><span class="count"></span><button type="button" class="reset" hidden>Reset</button></header>' +
    '<div class="board"><img src="tiles.png" width="657" height="657" alt="Tile Rush board"></div>';
  section.querySelector('h2').textContent = name;
  const board = section.querySelector('.board');
  const tiles = [];

  // The board runs from tile 36 (top left) down to tile 1 (bottom left)
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const fromBottom = 5 - row;
      // Rows snake: 1-6 runs left to right, 7-12 right to left, and so on
      const number = fromBottom * 6 + (fromBottom % 2 === 0 ? col + 1 : 6 - col);
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'tile';
      el.disabled = true;
      el.style.left = (17 + col * 103.8) / 6.57 + '%';
      el.style.top = (18 + row * 103.8) / 6.57 + '%';
      el.innerHTML = X;
      el.addEventListener('click', () =>
        change({ team: t, tile: number, crossed: progress[t][number - 1] !== '1' }));
      tiles.push({ el, number });
      board.appendChild(el);
    }
  }

  const reset = section.querySelector('.reset');
  reset.addEventListener('click', () => {
    if (confirm('Clear all crosses for ' + name + '?')) change({ team: t, reset: true });
  });
  boards.push({ tiles, count: section.querySelector('.count'), reset });
  document.getElementById('teams').appendChild(section);
});

render();
refresh();
setInterval(() => { if (!document.hidden) refresh(); }, REFRESH_MS);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
// Reload if the admin key is added to or removed from an already open page
window.addEventListener('hashchange', () => location.reload());
