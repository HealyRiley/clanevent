// The original rules. Edits made in admin mode are saved in the database and shown instead.
// Lines starting with "* " are shown as bullet points.
const GROUPS = [
  { heading: 'Board Rules', sections: [
    { id: 'row1', title: 'Row 1', text: `1. Obtain a steel ring
2. Obtain 5 scurrius spines
3. Obtain a brutus pet
4. Obtain a tempoross unique (barrel, tackle box, tome, harpoonfish, dragon harpoon or pet)
5. Complete the Pyromancer outfit (head, chest. bottoms and boots)

6. Obtain any 2 completed sets of barrows` },
    { id: 'row2', title: 'Row 2', text: `7. Obtain a belles folly
8. Obtain a zombie axe
9. Obtain any kraken unique (from the kraken boss only)
10. Complete a twinflame staff
11. Complete the full blood moon set

12. Complete the Huey Speed Chaser CA (5 Man) wearing only the blood moon set, no other mainhand weapon but the macahuitls can be used, minimum of 5 unique player submissions to complete` },
    { id: 'row3', title: 'Row 3', text: `13. Obtain a dragon pickaxe
14. Complete all unique DK rings (warrior, berseker, archers, seers)
15. Obtain 2 Zenyte shards
16. Obtain 3 Unsired
17. Complete a set of burning claws

18. Submit 5 unique CG submissions, the total time of the submissions should average time of 6:25 or below` },
    { id: 'row4', title: 'Row 4', text: `19. Obtain any god hilt
20. Obtain 2 Zulrah uniques (No onyx)
21. Obtain any piece of torva, does not need to be fortified
22. Obtain any revenant weapon
23. Complete a venator bow

24. Complete duo nex kills with 6 unique players, all times must be under 8:30` },
    { id: 'row5', title: 'Row 5', text: `25. Complete Morytania only ca with submissions from 5 unique players in your team
26. Obtain a maggot king unique
27. Complete a full sunfire set
28. Obtain 200mil gp worth of raids uniques
29. Obtain 2 unique yama items

30. Complete the following inferno speed times based on your player category:

Category 1: 60 minutes
Category 2: 80 minutes
Category 3: 110 minutes

Requires 2 unique submissions from different categories of players to complete.` },
    { id: 'row6', title: 'Row 6', text: `31. Obtain 2 doom uniques
32. Obtain 1 unique armour piece from each raid (shields/avernic hilts are included)
33. Obtain any nightmare orb
34. Obtain 1 unique raid weapon for each combat style, each item for each style must be obtained from a unique raid
35. Complete each of the awakened bosses, 4 unique submissions from 4 different players must be submitted

36. Obtain a megarare from any raid (no kodai/maul included)` },
  ] },
  { heading: 'General Rules', sections: [
    { id: 'general', title: '', text: `* All clan rules must be followed
* You may only participate on 1 account at any given time, irons are eligible to to swap to mains
* Alting is not permitted at all` },
    { id: 'event', title: 'Event Rules', text: `* All teams must complete the board tile by tile in order starting from tile 1 ending at tile 36
* You cannot progress to the next tile until you complete your current one
* The winner of the event is determined by either the first team to complete the board or the team that has progressed the furthest through the board the quickest
* Tile completions will be determined by submission time and not the time the tile is completed in game, make sure to submit your tiles asap before proceeding to the next tile.
* Any drops obtained before the submission of a prior tile will be voided
* All tile submissions must be put into your team dedicated thread
* Submissions for group content tiles can only be done with people within the clan, any submission not adhering to this rule will be instantly denied and any progress made from that point will be voided
* All submissions must display the clan codeword and time correctly and clearly
* All submissions for capstone tiles must only be done within your team
* Tiles that require multiple items will by default require different items, dupes do not count
* In the event a submission is denied @Wdr will notify your team of same, all progress on the board is to halt until the denied submission is recompleted.
* All submissions should come from the boss variant if there is one` },
  ] },
];

// Same key the main page remembers after an admin logs in
const SESSION_KEY = 'tile-rush-admin';
let adminKey = null;
try { adminKey = sessionStorage.getItem(SESSION_KEY); } catch (e) {}
let isAdmin = false;
const statusEl = document.getElementById('status');
const views = [];

function make(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

// Builds the text with createElement and textContent, so saved text can never run as code
function showText(box, text) {
  box.replaceChildren();
  let list = null;
  text.split('\n').forEach((line) => {
    if (line.startsWith('* ')) {
      if (!list) list = box.appendChild(make('ul'));
      list.appendChild(make('li', '', line.slice(2)));
    } else {
      list = null;
      box.appendChild(make('p', '', line));
    }
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
  const response = await fetch('/api/rules', options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

function buildSection(section) {
  const el = make('section');
  const top = el.appendChild(make('div', 'section-top'));
  if (section.title) top.appendChild(make('h2', '', section.title));
  const editButton = top.appendChild(make('button', '', 'Edit'));
  editButton.style.marginLeft = 'auto';
  const textBox = el.appendChild(make('div', 'text'));
  const editor = el.appendChild(make('div'));
  const area = editor.appendChild(make('textarea'));
  area.maxLength = 5000;
  area.setAttribute('aria-label', 'Rules text for ' + (section.title || 'General Rules'));
  const actions = editor.appendChild(make('div', 'actions'));
  const saveButton = actions.appendChild(make('button', '', 'Save'));
  const cancelButton = actions.appendChild(make('button', '', 'Cancel'));
  editButton.type = saveButton.type = cancelButton.type = 'button';

  const view = { section, text: section.text, editing: false, area };
  view.render = () => {
    showText(textBox, view.text);
    textBox.hidden = view.editing;
    editor.hidden = !view.editing;
    editButton.hidden = !isAdmin || view.editing;
    top.hidden = !section.title && editButton.hidden;
  };
  editButton.addEventListener('click', () => {
    view.editing = true;
    area.value = view.text;
    view.render();
    area.rows = Math.min(24, area.value.split('\n').length + 3);
    area.focus();
  });
  cancelButton.addEventListener('click', () => { view.editing = false; view.render(); });
  saveButton.addEventListener('click', async () => {
    if (!area.value.trim()) { alert('The rules text cannot be empty.'); return; }
    saveButton.disabled = cancelButton.disabled = area.disabled = true;
    saveButton.textContent = 'Saving…';
    try {
      const { response, data } = await request({ id: section.id, text: area.value });
      if (!response.ok) throw new Error(data.error);
      view.text = data.rules[section.id] || section.text;
      view.editing = false;
      statusEl.textContent = '';
      view.render();
    } catch (error) {
      // The editor stays open so nothing typed is lost
      alert('Not saved. ' + (error.message || 'Check your connection and try again.'));
    }
    saveButton.disabled = cancelButton.disabled = area.disabled = false;
    saveButton.textContent = 'Save';
  });

  views.push(view);
  return el;
}

const main = document.getElementById('rules');
GROUPS.forEach((group) => {
  main.appendChild(make('h1', '', group.heading));
  group.sections.forEach((section) => main.appendChild(buildSection(section)));
});
main.hidden = true;

// Warn before leaving the page with unsaved changes
window.addEventListener('beforeunload', (event) => {
  if (views.some((v) => v.editing && v.area.value !== v.text)) {
    event.preventDefault();
    event.returnValue = '';
  }
});

(async () => {
  try {
    let { response, data } = await request();
    if (response.status === 401) {
      adminKey = null;
      ({ response, data } = await request());
    }
    if (!response.ok) throw new Error(data.error);
    views.forEach((v) => { v.text = data.rules[v.section.id] || v.section.text; });
    isAdmin = Boolean(adminKey);
    statusEl.textContent = isAdmin ? 'Admin mode: click Edit to change a section.' : '';
  } catch (error) {
    statusEl.textContent = "Couldn't load the latest rules, so these may be out of date. Try refreshing.";
  }
  views.forEach((v) => v.render());
  main.hidden = false;
})();
