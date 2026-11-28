const TEAMS = ['Team 1', 'Team 2', 'Team 3', 'Team 4', 'Team 5'];
const REFRESH_MS = 15000;
// Marks tiles that open an item log: arrows pointing out to two corners
const EXPAND = '<svg class="expand-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#ffff00" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5h6v6M19 5l-5.5 5.5M11 19H5v-6M5 19l5.5-5.5"/></svg>';
const CROWN = '<svg class="crown" viewBox="0 0 18 14" role="img" aria-label="Team captain"><path d="M1 3 5 7 9 1 13 7 17 3 15 13H3Z" fill="#ffd700" stroke="#6b5200"/></svg>';
const X = '<svg class="cross" viewBox="0 0 100 100" aria-hidden="true"><path d="M15 15 85 85M85 15 15 85" stroke="#e11d1d" stroke-width="11" stroke-linecap="round"/></svg>';

// Admins can use the password box, or a link like https://your-site/#admin=YOUR_KEY
// A password typed into the box is remembered only until this browser tab is closed
const SESSION_KEY = 'tile-rush-admin';
let adminKey = new URLSearchParams(location.hash.slice(1)).get('admin');
try { adminKey = adminKey || sessionStorage.getItem(SESSION_KEY); } catch (e) {}
let isAdmin = false; // only true once the server accepts the key
let loaded = false;
let busy = false; // true while a tile change is saving
let pending = 0; // saves that haven't finished
let queue = Promise.resolve(); // saves are sent one at a time, in order
let version = 0; // goes up on every save, so older refreshes are ignored
let lastSave = 0; // when this page last saved something
let progress = TEAMS.map(() => '0'.repeat(36));
let players = TEAMS.map(() => ({ title: '', names: Array(9).fill(''), captain: -1 }));

const statusEl = document.getElementById('status');
const boards = [];
// Admins can rename teams. Until they do, the default from TEAMS is shown.
const teamName = (t) => players[t].title || TEAMS[t];
const loginForm = document.getElementById('login');
const passwordInput = document.getElementById('password');

const passwordForm = document.getElementById('password-form');
const passwordToggle = document.getElementById('password-toggle');
const passwordStatus = document.getElementById('password-status');

function closePasswordForm() {
  passwordForm.reset();
  passwordForm.hidden = true;
  passwordStatus.textContent = '';
  passwordToggle.setAttribute('aria-expanded', 'false');
}

function forgetAdmin() {
  adminKey = null;
  isAdmin = false;
  try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  // Also remove the key from the address if an admin link was used
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
}

function render() {
  document.body.classList.toggle('admin', isAdmin);
  document.getElementById('intro').textContent = isAdmin
    ? 'Admin mode: click the next tile to cross it off, or click a red X to remove it. Type player names, and right-click a name to make that player captain.'
    : 'Click the next tile to cross it off, or click a red X to remove it. This page updates automatically.';
  loginForm.hidden = isAdmin;
  document.getElementById('password-area').hidden = !isAdmin;
  if (!isAdmin) closePasswordForm();
  document.getElementById('logout-row').hidden = !isAdmin;

  boards.forEach(({ heading, titleInput, tiles, inputs, count, reset }, t) => {
    // Viewers see a plain heading; admins see an editable box in its place
    heading.textContent = teamName(t);
    heading.hidden = isAdmin;
    titleInput.hidden = !isAdmin;
    if (!titleInput.dataset.dirty) titleInput.value = teamName(t);
    inputs.forEach((input, i) => {
      // Don't overwrite a name an admin is still typing or saving
      if (!input.dataset.dirty) input.value = players[t].names[i];
      input.readOnly = !isAdmin;
      if (!isAdmin) input.blur();
      input.tabIndex = isAdmin ? 0 : -1;
      input.placeholder = isAdmin ? 'Player ' + (i + 1) : '';
      const captain = players[t].captain === i;
      input.parentElement.classList.toggle('captain', captain);
      input.setAttribute('aria-label', teamName(t) + ', player ' + (i + 1) + (captain ? ', captain' : ''));
    });
    const state = progress[t];
    const next = state.indexOf('0') + 1; // the only unlocked tile (0 when all are done)
    tiles.forEach(({ el, number }) => {
      const crossed = state[number - 1] === '1';
      const usable = loaded && !busy && (crossed || number === next);
      el.classList.toggle('crossed', crossed);
      el.classList.toggle('next', loaded && !crossed && number === next);
      if (el.classList.contains('expandable')) {
        // A disabled button can't be right-clicked, so these tiles are only marked as locked
        el.disabled = false;
        el.setAttribute('aria-disabled', !usable);
      } else {
        el.disabled = !usable;
      }
      const label = crossed ? 'crossed off' : number === next ? 'next tile' : 'locked';
      el.setAttribute('aria-label', teamName(t) + ', tile ' + number + ', ' + label);
    });
    count.textContent = loaded ? state.split('1').length - 1 + ' / 36' : '';
    reset.hidden = !isAdmin;
    reset.disabled = busy;
  });
}

async function request(body, key = adminKey) {
  const options = { headers: {} };
  if (key) options.headers.Authorization = 'Bearer ' + key;
  if (body) {
    options.method = 'POST';
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  // Viewers' updates are cached for a few seconds. Just after saving, skip the cache
  // so an older copy can't briefly undo what was just clicked.
  const fresh = !body && Date.now() - lastSave < 10000;
  const response = await fetch('/api/progress' + (fresh ? '?fresh=' + Date.now() : ''), options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function refresh() {
  if (pending) return;
  const startedAt = version;
  try {
    const { response, data } = await request();
    if (startedAt !== version) return;
    if (response.status === 401) {
      logOut();
      await refresh();
      statusEl.dataset.type = 'login';
      statusEl.textContent = 'The admin password is not valid, so this page is view only.';
      return;
    }
    if (!response.ok) throw new Error(data.error);
    applyData(data);
    loaded = true;
    isAdmin = Boolean(adminKey);
    // Remember an admin link too, so the rules page also opens in admin mode
    if (isAdmin) { try { sessionStorage.setItem(SESSION_KEY, adminKey); } catch (e) {} }
    if (statusEl.dataset.type === 'connection') statusEl.textContent = '';
  } catch (error) {
    statusEl.dataset.type = 'connection';
    statusEl.textContent = "Can't load the latest progress. " + (error.message || 'Retrying shortly.');
  }
  render();
}

function applyData(data) {
  if (data.teams) progress = data.teams;
  if (data.players) players = data.players;
}

// Sends one change to the server. Returns true if it was saved.
function save(body, onSaved) {
  pending++;
  version++;
  const key = adminKey;
  const result = queue.then(async () => {
    statusEl.dataset.type = 'save';
    statusEl.textContent = 'Saving…';
    let ok = false;
    try {
      const { response, data } = await request(body, key);
      applyData(data);
      if (response.status === 401) logOut();
      if (!response.ok) throw new Error(data.error);
      ok = true;
      if (onSaved) onSaved();
      statusEl.textContent = '';
    } catch (error) {
      statusEl.textContent = 'Not saved. ' + (error.message || 'Check your connection and try again.');
    }
    pending--;
    version++;
    lastSave = Date.now();
    render();
    return ok;
  });
  queue = result;
  return result;
}

async function change(body) {
  busy = true;
  const saved = save(body);
  render();
  await saved;
  busy = false;
  render();
}

// Saves a text box (team name or player name) if it has been edited
function saveText(input, body) {
  if (!isAdmin || !input.dataset.dirty || input.dataset.saving === input.value) return;
  const typed = input.value;
  input.dataset.saving = typed;
  save({ ...body, [body.player === undefined ? 'title' : 'name']: typed }, () => {
    if (input.value === typed) delete input.dataset.dirty;
  }).then(() => {
    if (input.dataset.saving === typed) delete input.dataset.saving;
  });
}

function logOut() {
  forgetAdmin();
  // Throw away anything typed but not saved
  boards.forEach(({ titleInput, inputs }) => [titleInput, ...inputs].forEach((input) => delete input.dataset.dirty));
}

TEAMS.forEach((name, t) => {
  const section = document.createElement('section');
  section.innerHTML = '<header><h2></h2><input type="text" class="title-input" maxlength="20" autocomplete="off" spellcheck="false" hidden><span class="count"></span><button type="button" class="reset" hidden>Reset</button></header>' +
    '<div class="players"></div>' +
    '<div class="board"><img src="tiles.png" width="657" height="657" alt="Tile Rush board"></div>';
  const heading = section.querySelector('h2');
  const titleInput = section.querySelector('.title-input');
  titleInput.setAttribute('aria-label', 'Name for ' + name);
  titleInput.addEventListener('input', () => { titleInput.dataset.dirty = '1'; });
  titleInput.addEventListener('blur', () => saveText(titleInput, { team: t }));
  titleInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') saveText(titleInput, { team: t });
  });
  const board = section.querySelector('.board');
  const tiles = [];
  const inputs = [];

  for (let i = 0; i < 9; i++) {
    const wrap = document.createElement('div');
    wrap.className = 'player';
    wrap.innerHTML = '<input type="text" maxlength="12" autocomplete="off" spellcheck="false">' + CROWN;
    const input = wrap.querySelector('input');
    input.addEventListener('input', () => { input.dataset.dirty = '1'; });
    input.addEventListener('blur', () => saveText(input, { team: t, player: i }));
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') saveText(input, { team: t, player: i });
    });
    // Right-click makes this player the captain. Right-click the captain again to remove it.
    input.addEventListener('contextmenu', (event) => {
      if (!isAdmin) return;
      event.preventDefault();
      if (!input.value.trim()) {
        statusEl.textContent = 'Type a name before making that player captain.';
        return;
      }
      saveText(input, { team: t, player: i }); // save a freshly typed name first
      save({ team: t, captain: players[t].captain === i ? -1 : i });
    });
    inputs.push(input);
    section.querySelector('.players').appendChild(wrap);
  }

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
      let held = false; // true after a long press, so it doesn't also count as a tap
      el.addEventListener('click', () => {
        if (held) { held = false; return; }
        if (el.getAttribute('aria-disabled') === 'true') return;
        change({ team: t, tile: number, crossed: progress[t][number - 1] !== '1' });
      });
      if (Object.hasOwn(LOGS, number)) {
        el.classList.add('expandable');
        el.insertAdjacentHTML('beforeend', EXPAND);
        el.title = 'Right-click to open the ' + LOGS[number].name + ' log';
        const open = () => { location.href = 'log.html?tile=' + number + '&team=' + (t + 1); };
        el.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          open();
        });
        // Press and hold also works, for phones that can't right-click
        let timer;
        const cancel = () => clearTimeout(timer);
        el.addEventListener('touchstart', () => {
          held = false;
          cancel();
          timer = setTimeout(() => { held = true; open(); }, 600);
        }, { passive: true });
        ['touchend', 'touchmove', 'touchcancel'].forEach((type) => el.addEventListener(type, cancel, { passive: true }));
      }
      tiles.push({ el, number });
      board.appendChild(el);
    }
  }

  const hint = document.createElement('div');
  hint.className = 'expand-hint';
  hint.innerHTML = EXPAND + '<span>right click any tile with this icon to expand!</span>';
  section.appendChild(hint);

  const reset = section.querySelector('.reset');
  reset.addEventListener('click', () => {
    if (confirm('Clear all crosses for ' + teamName(t) + '?')) change({ team: t, reset: true });
  });
  boards.push({ heading, titleInput, tiles, inputs, count: section.querySelector('.count'), reset });
  document.getElementById('teams').appendChild(section);
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector('button');
  button.disabled = true;
  statusEl.dataset.type = 'login';
  statusEl.textContent = 'Checking password…';
  try {
    const { response, data } = await request(null, passwordInput.value);
    if (response.status === 401) {
      statusEl.textContent = 'Incorrect password.';
    } else if (!response.ok) {
      throw new Error(data.error);
    } else {
      version++;
      adminKey = passwordInput.value;
      try { sessionStorage.setItem(SESSION_KEY, adminKey); } catch (e) {}
      isAdmin = true;
      loaded = true;
      applyData(data);
      passwordInput.value = '';
      statusEl.textContent = '';
      render();
    }
  } catch (error) {
    statusEl.textContent = "Couldn't log in. Check your connection and try again.";
  }
  button.disabled = false;
});

document.getElementById('logout').addEventListener('click', () => {
  version++;
  logOut();
  statusEl.textContent = '';
  render();
  refresh();
});

passwordToggle.addEventListener('click', () => {
  if (!passwordForm.hidden) return closePasswordForm();
  passwordForm.hidden = false;
  passwordToggle.setAttribute('aria-expanded', 'true');
});

passwordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const { owner, next, confirm: again } = passwordForm.elements;
  const say = (text, ok) => {
    passwordStatus.textContent = text;
    passwordStatus.classList.toggle('ok', Boolean(ok));
  };
  if (next.value !== again.value) return say("The new passwords don't match.");

  const button = passwordForm.querySelector('button');
  button.disabled = true;
  say('Saving…');
  const newPassword = next.value;
  // Pause refreshing so the old password isn't rejected halfway through the change
  pending++;
  version++;
  try {
    await queue; // let any other saves finish with the old password
    const response = await fetch('/api/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerPassword: owner.value, newPassword }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error);
    adminKey = newPassword;
    try { sessionStorage.setItem(SESSION_KEY, newPassword); } catch (e) {}
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    passwordForm.reset();
    say('Password changed. Give your admins the new one.', true);
  } catch (error) {
    say('Not changed. ' + (error.message || 'Check your connection and try again.'));
  }
  pending--;
  version++;
  button.disabled = false;
});

render();
refresh();
setInterval(() => { if (!document.hidden) refresh(); }, REFRESH_MS);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
// Reload if the admin key is added to or removed from an already open page
window.addEventListener('hashchange', () => location.reload());
