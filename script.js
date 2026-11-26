// Rename your teams here
const TEAMS = ['Team 1', 'Team 2', 'Team 3', 'Team 4', 'Team 5'];
const KEY = 'tile-rush-v1';
const X = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M15 15 85 85M85 15 15 85" stroke="#e11d1d" stroke-width="11" stroke-linecap="round"/></svg>';

let saved = {};
try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {}
}

TEAMS.forEach((name, t) => {
  const section = document.createElement('section');
  section.innerHTML = '<header><h2></h2><span class="count"></span><button type="button" class="reset">Reset</button></header>' +
    '<div class="board"><img src="tiles.png" width="657" height="657" alt="Tile Rush board"></div>';
  section.querySelector('h2').textContent = name;
  const board = section.querySelector('.board');
  const done = new Set(saved[t] || []);
  const tiles = [];

  function render() {
    tiles.forEach(({ el, n }) => el.setAttribute('aria-pressed', done.has(n)));
    section.querySelector('.count').textContent = done.size + ' / 36';
    saved[t] = [...done];
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
      el.setAttribute('aria-label', name + ', tile ' + number);
      el.style.left = (17 + col * 103.8) / 6.57 + '%';
      el.style.top = (18 + row * 103.8) / 6.57 + '%';
      el.innerHTML = X;
      el.addEventListener('click', () => {
        done.has(number) ? done.delete(number) : done.add(number);
        render(); save();
      });
      tiles.push({ el, n: number });
      board.appendChild(el);
    }
  }

  section.querySelector('.reset').addEventListener('click', () => {
    if (confirm('Clear all crosses for ' + name + '?')) { done.clear(); render(); save(); }
  });
  render();
  document.getElementById('teams').appendChild(section);
});
