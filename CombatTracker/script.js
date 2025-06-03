let combatants = [];
let currentTurnIndex = 0;
let round = 1;

const statusOptions = [
  'Charmed', 'Frightened', 'Prone', 'Poisoned',
  'Stunned', 'Blinded', 'Invisible', 'Paralyzed', 'Restrained'
];

document.getElementById('addCombatantBtn').addEventListener('click', openCreatureModal);
document.getElementById('modalCreatureForm').addEventListener('submit', addCombatant);
document.getElementById('importInput').addEventListener('change', handleImport);

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
      return `<span class="status-tag">${se.name} (${se.rounds})</span>`;
    }).join(' ') || '';

    const statusDropdown = `
      <select onchange="applyStatusEffect(${index}, this)">
        <option value="">＋ Add</option>
        ${statusOptions.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
    `;

    row.innerHTML = `
      <div class="cell">${c.init}</div>
      <div class="cell">${c.name}</div>
      <div class="cell">${c.hp}/${c.maxHp}</div>
      <div class="cell">${c.ac}</div>
      <div class="cell">${statusTags}${statusDropdown}</div>
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
    c.hp = Math.max(0, parseInt(c.hp) + delta);
    saveData();
    renderCombatants();
  }
}

function deleteCombatant(index) {
  combatants.splice(index, 1);
  if (currentTurnIndex >= combatants.length) {
    currentTurnIndex = 0;
  }
  saveData();
  renderCombatants();
}

function nextTurn() {
  currentTurnIndex++;
  if (currentTurnIndex >= combatants.length) {
    currentTurnIndex = 0;
    round++;
    tickStatusEffects();
  }
  renderCombatants();
}

function prevTurn() {
  currentTurnIndex--;
  if (currentTurnIndex < 0) {
    currentTurnIndex = combatants.length - 1;
    round = Math.max(1, round - 1);
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
    c.statusEffects = (c.statusEffects || []).map(effect => ({
      ...effect,
      rounds: effect.rounds - 1
    })).filter(effect => effect.rounds > 0);
  });
}

function applyStatusEffect(index, select) {
  const effect = select.value;
  if (!effect) return;
  const rounds = parseInt(prompt('How many rounds?'), 10);
  if (isNaN(rounds) || rounds <= 0) return;

  const combatant = combatants[index];
  if (!combatant.statusEffects) combatant.statusEffects = [];

  combatant.statusEffects.push({ name: effect, rounds });
  saveData();
  renderCombatants();
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

function exportToPDF() {
  alert("PDF export not yet implemented.");
}

function triggerImport() {
  document.getElementById('importInput').click();
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
    saveData();
    renderCombatants();
  };
  reader.readAsText(file);
}

window.addEventListener('load', loadData);
