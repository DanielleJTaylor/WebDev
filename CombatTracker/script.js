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

document.getElementById('addGroupBtn').addEventListener('click', () => {
  const name = prompt("Enter group name:");
  const init = parseInt(prompt("Enter group initiative:"), 10);
  if (!name || isNaN(init)) return;

  const group = {
    id: generateUniqueId(),
    name: getUniqueName(name), // ← ADD THIS
    init,
    isGroup: true,
    members: []
  };


  combatants.push(group);
  logChange(`Added group: ${name} (Init: ${init})`);
  sortCombatants();
  saveData();
  renderCombatants();
});


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

document.getElementById('showMoreBtn').addEventListener('click', () => {
  document.getElementById('extraFields').style.display = 'flex';
});

function openCreatureModal() {
  document.getElementById('creatureModal').style.display = 'flex';
}

function closeCreatureModal() {
  document.getElementById('creatureModal').style.display = 'none';
  document.getElementById('modalCreatureForm').reset();
  document.getElementById('extraFields').style.display = 'none';
}

function generateUniqueId() {
  return '_' + Math.random().toString(36).substr(2, 9);
}


function getUniqueName(baseName) {
  // Break off the trailing number if it exists
  const match = baseName.match(/^(.*?)(?: (\d+))?$/);
  const namePart = match[1].trim();
  
  let maxSuffix = 0;

  combatants.forEach(c => {
    const cMatch = c.name.match(/^(.+?)(?: (\d+))?$/);
    if (!cMatch) return;
    const cName = cMatch[1].trim();
    const cNum = parseInt(cMatch[2]);

    if (cName === namePart) {
      if (!isNaN(cNum)) {
        maxSuffix = Math.max(maxSuffix, cNum);
      } else {
        maxSuffix = Math.max(maxSuffix, 1);
      }
    }
  });

  return maxSuffix === 0 && !combatants.some(c => c.name === namePart)
    ? namePart
    : `${namePart} ${maxSuffix + 1}`;
}



function addCombatant(event) {
  event.preventDefault();
  const name = document.getElementById('modalName').value;
  const init = parseInt(document.getElementById('modalInit').value);
  const image = document.getElementById('modalImage').value || '';
  const ac = document.getElementById('modalAC').value || '-';
  const hp = document.getElementById('modalHP').value || '-';
  const maxHp = document.getElementById('modalMaxHP').value || hp;

const uniqueName = getUniqueName(name);

  combatants.push({
    id: generateUniqueId(),
    name: uniqueName,
    init, image, ac, hp, maxHp,
    statusEffects: [],
    isGroup: false,
    groupId: null
  });


  logChange(`Added combatant: ${name} (Init: ${init})`);
  closeCreatureModal();
  sortCombatants();
  saveData();
  renderCombatants();
}

function sortCombatants() {
  combatants.sort((a, b) => {
    const aInit = a.isGroup ? a.init : a.init;
    const bInit = b.isGroup ? b.init : b.init;
    return bInit - aInit;
  });
}


function renderCombatants() {
  const list = document.getElementById('combatantList');
  list.innerHTML = '';

  const addDropZone = (position, index = null) => {
    const dropZone = document.createElement('div');
    dropZone.className = 'drop-zone';
    dropZone.setAttribute('data-drop-index', index !== null ? index : '');
    dropZone.innerText = '[ Drop Here ]';
    list.appendChild(dropZone);
  };

  // Unified render: flatten combatants into display order
  const displayOrder = [];

  combatants.forEach(item => {
    if (item.isGroup) {
      displayOrder.push(item);
      item.members.forEach(memberId => {
        const member = combatants.find(c => c.id === memberId);
        if (member) displayOrder.push(member);
      });
    } else if (!item.groupId) {
      displayOrder.push(item);
    }
  });

  displayOrder.forEach((c, index) => {
    addDropZone('above', index);

    if (c.isGroup) {
      // Group row
      const groupRow = document.createElement('div');
      groupRow.className = 'group-row';
      groupRow.innerHTML = `
        <div class="cell">${c.init}</div>
        <div class="cell" colspan="5">${c.name} (Group)</div>
      `;
      groupRow.setAttribute('data-id', c.id);
      groupRow.setAttribute('draggable', true);
      list.appendChild(groupRow);
    } else {
      // Creature row
      const row = document.createElement('div');
      row.className = 'creature-row';
      row.setAttribute('data-id', c.id);
      row.setAttribute('draggable', true);
      row.dataset.groupMember = c.groupId ? "true" : "false";

      row.innerHTML = `
        <div class="cell">${c.groupId ? '' : c.init}</div>
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
    }
  });

  // Add one final drop zone at the end
  addDropZone('below', displayOrder.length);

  updateTurnDisplay();
  document.getElementById('roundCounter').textContent = `Round: ${round}`;
  addDragAndDropListeners();
}




function renderStatusTags(c) {
  return (c.statusEffects || [])
    .map(se => `<span class="status-tag">${se.name} (${se.rounds})</span>`)
    .join(' ');
}

function adjustHp(id, delta) {
  const c = combatants.find(c => c.id === id);
  if (!c || isNaN(parseInt(c.hp))) return;

  const oldHp = c.hp;
  c.hp = Math.max(0, parseInt(c.hp) + delta);
  logChange(`${c.name} HP changed: ${oldHp} → ${c.hp}`);
  saveData();
  renderCombatants();
}

function deleteCombatant(id) {
  const index = combatants.findIndex(c => c.id === id);
  if (index === -1) return;

  const c = combatants[index];
  if (c.groupId) {
    const group = combatants.find(g => g.id === c.groupId);
    if (group && group.isGroup) {
      group.members = group.members.filter(mid => mid !== c.id);
    }
  }

  logChange(`Deleted combatant: ${c.name}`);
  combatants.splice(index, 1);
  if (currentTurnIndex >= combatants.length) currentTurnIndex = 0;
  saveData();
  renderCombatants();
}

function updateField(id, field, value) {
  const combatant = combatants.find(c => c.id === id);
  if (!combatant) return;
  const oldValue = combatant[field];
  combatant[field] = value;
  logChange(`${combatant.name} ${field} changed: ${oldValue} → ${value}`);
  saveData();
}

function applyStatusEffect(id, selectEl) {
  const effect = selectEl.value;
  if (!effect) return;

  const rounds = parseInt(prompt(`How many rounds should ${effect} last?`), 10);
  if (isNaN(rounds) || rounds <= 0) return;

  const combatant = combatants.find(c => c.id === id);
  if (!combatant) return;

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
  duplicate.name = getUniqueName(original.name);


  combatants.push(duplicate);

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

function addDragAndDropListeners() {
  const draggableItems = document.querySelectorAll('[draggable="true"]');
  const dropZones = document.querySelectorAll('.drop-zone');

  draggableItems.forEach(item => {
    item.addEventListener('dragstart', dragStart);
    item.addEventListener('dragend', dragEnd); // ✅
  });

  dropZones.forEach(zone => {
    zone.addEventListener('dragover', dragOver);
    zone.addEventListener('drop', drop);
  });
}



function dragStart(e) {
  e.dataTransfer.setData('text/plain', e.target.getAttribute('data-id'));
  document.body.classList.add('dragging'); // ✅ show drop zones
}

function dragEnd(e) {
  document.body.classList.remove('dragging'); // ✅ hide drop zones
}



function drop(e) {
  e.preventDefault();
  const combatantId = e.dataTransfer.getData('text/plain');
  const dropIndex = parseInt(e.target.getAttribute('data-drop-index'));
  const combatant = combatants.find(c => c.id === combatantId);

  if (!combatant) return;

  // Remove from current group if any
  if (combatant.groupId) {
    const group = combatants.find(g => g.id === combatant.groupId);
    if (group && group.isGroup) {
      group.members = group.members.filter(id => id !== combatant.id);
    }
    combatant.init = combatant.originalInit || combatant.init;
    combatant.groupId = null;
  }

  // Remove from current position
  combatants = combatants.filter(c => c.id !== combatant.id || c.isGroup);

  // Insert at new position
  combatants.splice(dropIndex, 0, combatant);

  saveData();
  renderCombatants();
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


// Ensure combatants with missing fields (from imported data) still render correctly
function sanitizeCombatantData() {
  combatants.forEach(c => {
    if (!c.hasOwnProperty('statusEffects')) c.statusEffects = [];
    if (!c.hasOwnProperty('isGroup')) c.isGroup = false;
    if (!c.hasOwnProperty('groupId')) c.groupId = null;
    if (c.isGroup && !c.members) c.members = [];
  });
}

function loadData() {
  const stored = localStorage.getItem('combatants');
  if (stored) combatants = JSON.parse(stored);

  sanitizeCombatantData(); // 🧼 Clean up old/missing keys

  currentTurnIndex = parseInt(localStorage.getItem('turnIndex')) || 0;
  round = parseInt(localStorage.getItem('round')) || 1;
  renderCombatants();
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

    sanitizeCombatantData(); // 🧼 Ensure new fields exist

    logChange('Imported encounter from file.');
    saveData();
    renderCombatants();
  };
  reader.readAsText(file);
}

// Initial load when page opens
window.addEventListener('load', loadData);
