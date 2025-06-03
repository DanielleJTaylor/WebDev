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

  // Render groups
  combatants
    .filter(c => c.isGroup)
    .forEach(group => {
      const groupRow = document.createElement('div');
      groupRow.className = 'group-row';
      groupRow.innerHTML = `
        <div class="cell">${group.init}</div>
        <div class="cell" colspan="5">${group.name} (Group)</div>
      `;
      list.appendChild(groupRow);

      // Render group members
      group.members.forEach(memberId => {
        const member = combatants.find(c => c.id === memberId);
        if (member) {
          const memberRow = document.createElement('div');
          memberRow.className = 'group-member';
          memberRow.setAttribute('draggable', true);
          memberRow.setAttribute('data-id', member.id);
          memberRow.innerHTML = `
            <div class="cell"></div>
            <div class="cell">- ${member.name}</div>
            <div class="cell">${member.hp}/${member.maxHp}</div>
            <div class="cell">${member.ac}</div>
            <div class="cell">${renderStatusTags(member)}</div>
            <div class="cell">
              <button onclick="duplicateCombatant('${member.id}')">+</button>
              <button onclick="deleteCombatant('${member.id}')">✖</button>
            </div>
          `;
          list.appendChild(memberRow);
        }
      });

      // Drop zone for adding combatants to the group
      const dropZone = document.createElement('div');
      dropZone.className = 'drop-zone';
      dropZone.setAttribute('data-group-id', group.id);
      dropZone.innerText = '[ Drag here to add to group ]';
      list.appendChild(dropZone);
    });

  // Render ungrouped combatants
  combatants
    .filter(c => !c.isGroup && !c.groupId)
    .forEach(c => {
      const row = document.createElement('div');
      row.className = 'creature-row';
      row.setAttribute('draggable', true);
      row.setAttribute('data-id', c.id);
      row.innerHTML = `
        <div class="cell">${c.init}</div>
        <div class="cell">${c.name}</div>
        <div class="cell">${c.hp}/${c.maxHp}</div>
        <div class="cell">${c.ac}</div>
        <div class="cell">${renderStatusTags(c)}</div>
        <div class="cell">
          <button onclick="duplicateCombatant('${c.id}')">+</button>
          <button onclick="deleteCombatant('${c.id}')">✖</button>
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

function duplicateCombatant(id) {
  const original = combatants.find(c => c.id === id);
  if (!original) return;

  const duplicate = { ...original };
  duplicate.id = generateUniqueId();
  duplicate.name += ' (Copy)';

  combatants.push(duplicate);

  // If the original is in a group, add the duplicate to the same group
  if (original.groupId) {
    const group = combatants.find(c => c.id === original.groupId);
    if (group && group.isGroup) {
      group.members.push(duplicate.id);
      duplicate.groupId = group.id;
    }
  }

  saveData();
  renderCombatants();
}


// Add event listeners after rendering
function addDragAndDropListeners() {
  const draggableItems = document.querySelectorAll('[draggable="true"]');
  const dropZones = document.querySelectorAll('.drop-zone');

  draggableItems.forEach(item => {
    item.addEventListener('dragstart', dragStart);
  });

  dropZones.forEach(zone => {
    zone.addEventListener('dragover', dragOver);
    zone.addEventListener('drop', drop);
  });
}

function dragStart(e) {
  e.dataTransfer.setData('text/plain', e.target.getAttribute('data-id'));
}

function dragOver(e) {
  e.preventDefault();
}

function drop(e) {
  e.preventDefault();
  const combatantId = e.dataTransfer.getData('text/plain');
  const groupId = e.target.getAttribute('data-group-id');

  const combatant = combatants.find(c => c.id === combatantId);
  const group = combatants.find(c => c.id === groupId);

  if (combatant && group && group.isGroup) {
    // Remove from previous group if any
    if (combatant.groupId) {
      const oldGroup = combatants.find(c => c.id === combatant.groupId);
      if (oldGroup && oldGroup.isGroup) {
        oldGroup.members = oldGroup.members.filter(id => id !== combatant.id);
      }
    }

    // Add to new group
    combatant.groupId = group.id;
    group.members.push(combatant.id);

    // Set combatant's initiative to match the group's
    combatant.init = group.init;

    saveData();
    renderCombatants();
  }
}

function sortCombatants() {
  // Sort groups and ungrouped combatants by initiative
  combatants.sort((a, b) => {
    const aInit = a.isGroup ? a.init : a.init;
    const bInit = b.isGroup ? b.init : b.init;
    return bInit - aInit;
  });
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
