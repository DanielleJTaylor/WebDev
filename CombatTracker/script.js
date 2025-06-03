let combatants = [];
let currentTurnIndex = 0;
let round = 1;
let historyLog = [];

const statusOptions = [
  'Charmed', 'Frightened', 'Prone', 'Poisoned',
  'Stunned', 'Blinded', 'Invisible', 'Paralyzed', 'Restrained'
];

document.getElementById('addCombatantBtn').addEventListener('click', openCreatureModal);
document.getElementById('modalCreatureForm').addEventListener('submit', addCombatant);
document.getElementById('clearDataBtn').addEventListener('click', () => {
  if (confirm('Clear all combatants?')) {
    logChange('Cleared all combatants.');
    combatants = [];
    saveData();
    renderCombatants();
  }
});
document.getElementById('importJSON').addEventListener('change', handleImport);
document.getElementById('toggleLogBtn').addEventListener('click', () => {
  const container = document.getElementById('trackerContainer');
  container.classList.toggle('show-log');

  const logContent = document.getElementById('historyLogContent');
  logContent.innerHTML = historyLog.map(entry => `<div>${entry}</div>`).join('');
});



function openCreatureModal() {
  document.getElementById('creatureModal').style.display = 'flex';
}

function closeCreatureModal() {
  document.getElementById('creatureModal').style.display = 'none';
  document.getElementById('modalCreatureForm').reset();
  document.getElementById('extraFields').style.display = 'none';
}

document.getElementById('showMoreBtn').addEventListener('click', () => {
  document.getElementById('extraFields').style.display = 'flex';
});

function addCombatant(event) {
  event.preventDefault();
  const name = document.getElementById('modalName').value;
  const init = parseInt(document.getElementById('modalInit').value);
  const image = document.getElementById('modalImage').value || '';
  const ac = document.getElementById('modalAC').value || '-';
  const hp = document.getElementById('modalHP').value || '-';
  const maxHp = document.getElementById('modalMaxHP').value || hp;

  combatants.push({
    name, init, image, ac, hp, maxHp,
    statusEffects: [],
    group: null
  });

  logChange(`Added combatant: ${name} (Init: ${init})`);
  closeCreatureModal();
  sortCombatants();
  saveData();
  renderCombatants();
}

function sortCombatants() {
  combatants.sort((a, b) => b.init - a.init);
}

function renderCombatants() {
  const list = document.getElementById('combatantList');
  list.innerHTML = '';

  combatants.forEach((c, index) => {
    const row = document.createElement('div');
    row.className = 'creature-row';

    const statusTags = c.statusEffects?.map(se => {
      return `<span class="status-tag ${se.name.toLowerCase()}">${se.name} (${se.rounds})</span>`;
    }).join(' ') || '';

    const statusDropdown = `
      <select onchange="applyStatusEffect(${index}, this)">
        <option value="">＋ Add Status</option>
        ${statusOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
      </select>
    `;

    row.innerHTML = `
      <div class="cell" contenteditable onblur="updateField(${index}, 'init', this.innerText)">${c.init}</div>
      <div class="cell" contenteditable onblur="updateField(${index}, 'name', this.innerText)">${c.name}</div>
      <div class="cell" contenteditable onblur="updateField(${index}, 'hp', this.innerText)">${c.hp}/${c.maxHp}</div>
      <div class="cell" contenteditable onblur="updateField(${index}, 'ac', this.innerText)">${c.ac}</div>
      <div class="cell">${statusTags} ${statusDropdown}</div>
      <div class="cell cell-actions">
        <button onclick="adjustHp(${index}, 1)">＋</button>
        <button onclick="adjustHp(${index}, -1)">−</button>
        <button onclick="deleteCombatant(${index})">✖</button>
      </div>
    `;

    list.appendChild(row);
  });

  updateTurnDisplay();
  document.getElementById('roundCounter').textContent = `Round: ${round}`;
}

function adjustHp(index, delta) {
  let c = combatants[index];
  if (!isNaN(parseInt(c.hp))) {
    const oldHp = c.hp;
    c.hp = Math.max(0, parseInt(c.hp) + delta);
    logChange(`${c.name} HP changed: ${oldHp} → ${c.hp}`);
    saveData();
    renderCombatants();
  }
}

function deleteCombatant(index) {
  const name = combatants[index]?.name;
  combatants.splice(index, 1);
  logChange(`Deleted combatant: ${name}`);
  if (currentTurnIndex >= combatants.length) {
    currentTurnIndex = 0;
  }
  saveData();
  renderCombatants();
}

function updateField(index, field, value) {
  const oldValue = combatants[index][field];
  combatants[index][field] = value;
  logChange(`${combatants[index].name} ${field} changed: ${oldValue} → ${value}`);
  saveData();
}

function applyStatusEffect(index, selectEl) {
  const effect = selectEl.value;
  if (!effect) return;

  const rounds = parseInt(prompt(`How many rounds should ${effect} last?`), 10);
  if (isNaN(rounds) || rounds <= 0) return;

  const combatant = combatants[index];
  if (!combatant.statusEffects) combatant.statusEffects = [];

  combatant.statusEffects.push({ name: effect, rounds });
  logChange(`${combatant.name} gained status: ${effect} (${rounds} rounds)`);
  saveData();
  renderCombatants();
}

function nextTurn() {
  currentTurnIndex++;
  if (currentTurnIndex >= combatants.length) {
    currentTurnIndex = 0;
    round++;
    tickStatusEffects();
    logChange(`Round advanced to ${round}`);
  }
  renderCombatants();
}

function prevTurn() {
  currentTurnIndex--;
  if (currentTurnIndex < 0) {
    currentTurnIndex = combatants.length - 1;
    round = Math.max(1, round - 1);
    logChange(`Round reverted to ${round}`);
  }
  renderCombatants();
}

function updateTurnDisplay() {
  const display = document.getElementById('currentTurnDisplay');
  if (combatants.length === 0) {
    display.innerHTML = '🟢 Current Turn: <strong>None</strong>';
  } else {
    display.innerHTML = `🟢 Current Turn: <strong>${combatants[currentTurnIndex]?.name}</strong>`;
  }
}

function tickStatusEffects() {
  combatants.forEach(c => {
    const before = c.statusEffects?.length || 0;
    c.statusEffects = (c.statusEffects || []).map(effect => ({
      ...effect,
      rounds: effect.rounds - 1
    })).filter(effect => effect.rounds > 0);
    const after = c.statusEffects.length;
    if (before > after) {
      logChange(`${c.name} lost expired status effect(s).`);
    }
  });
}

function saveData() {
  localStorage.setItem('combatants', JSON.stringify(combatants));
  localStorage.setItem('turnIndex', currentTurnIndex);
  localStorage.setItem('round', round);
}

function loadData() {
  const stored = localStorage.getItem('combatants');
  if (stored) combatants = JSON.parse(stored);
  currentTurnIndex = parseInt(localStorage.getItem('turnIndex')) || 0;
  round = parseInt(localStorage.getItem('round')) || 1;
  renderCombatants();
}

function exportJSON() {
  const data = JSON.stringify({ combatants, currentTurnIndex, round }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'combat_tracker.json';
  link.click();
}

function importJSON() {
  document.getElementById('importJSON').click();
}

function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    const data = JSON.parse(e.target.result);
    combatants = data.combatants || [];
    currentTurnIndex = data.currentTurnIndex || 0;
    round = data.round || 1;
    logChange('Imported encounter from file.');
    saveData();
    renderCombatants();
  };
  reader.readAsText(file);
}

function logChange(msg) {
  const timestamp = new Date().toLocaleTimeString();
  historyLog.push(`[${timestamp}] ${msg}`);
}

window.addEventListener('load', loadData);
