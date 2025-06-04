// ========== GLOBAL STATE ==========
let combatants = [];
let currentTurnIndex = 0;
let round = 1;
let historyLog = [];
let draggedCombatantId = null;

const statusOptions = [
  'Charmed', 'Frightened', 'Prone', 'Poisoned',
  'Stunned', 'Blinded', 'Invisible', 'Paralyzed', 'Restrained'
];

// ========== THEME TOGGLE ==========
document.getElementById('themeToggle').addEventListener('change', (e) => {
  document.body.classList.toggle('dark', e.target.checked);
});

// ========== UTILITIES ==========
function generateUniqueId() {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function getUniqueName(baseName) {
  const match = baseName.match(/^(.*?)(?: (\d+))?$/);
  const namePart = match[1].trim();
  let maxSuffix = 0;

  getFlatCombatantList().forEach(c => {
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

  return maxSuffix === 0
    ? namePart
    : `${namePart} ${maxSuffix + 1}`;
}

function getFlatCombatantList() {
  return combatants.flatMap(c => c.isGroup ? c.members : [c])
                   .sort((a, b) => b.init - a.init);
}

function findCombatantById(id) {
  for (const c of combatants) {
    if (c.id === id) return c;
    if (c.isGroup) {
      const found = c.members.find(m => m.id === id);
      if (found) return found;
    }
  }
  return null;
}

function logChange(msg) {
  const timestamp = new Date().toLocaleTimeString();
  historyLog.push(`[${timestamp}] ${msg}`);
  const logContent = document.getElementById('historyLogContent');
  if (logContent) {
    logContent.innerHTML = historyLog.map(line => `<div>${line}</div>`).join('');
  }
}

// ========== MODAL HANDLING ==========
const creatureModal = document.getElementById('creatureModal');
const modalForm = document.getElementById('modalCreatureForm');
const extraFields = document.getElementById('extraFields');
const showMoreBtn = document.getElementById('showMoreBtn');

document.getElementById('addCombatantBtn').addEventListener('click', () => {
  creatureModal.classList.remove('hidden');
});

showMoreBtn.addEventListener('click', () => {
  extraFields.classList.toggle('hidden');
});

modalForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = document.getElementById('modalName').value.trim();
  const init = parseInt(document.getElementById('modalInit').value, 10);
  const ac = parseInt(document.getElementById('modalAC').value || 0, 10);
  const hp = parseInt(document.getElementById('modalHP').value || 0, 10);
  const maxHp = parseInt(document.getElementById('modalMaxHP').value || hp, 10);
  const role = document.getElementById('modalRole').value || 'player';

  if (!name || isNaN(init)) return;

  const newCombatant = {
    id: generateUniqueId(),
    name: getUniqueName(name),
    init,
    ac,
    hp,
    maxHp,
    role,
    statusEffects: [],
    isGroup: false,
    previousInit: init
  };

  combatants.push(newCombatant);
  saveCombatants();
  renderCombatants();

  creatureModal.classList.add('hidden');
  modalForm.reset();
  extraFields.classList.add('hidden');
});

window.addEventListener('click', (e) => {
  if (e.target === creatureModal) {
    creatureModal.classList.add('hidden');
  }
});

// ========== SAVE & LOAD ==========
function saveCombatants() {
  const state = {
    combatants,
    round,
    currentTurnIndex,
    historyLog
  };
  localStorage.setItem('trackerData', JSON.stringify(state));
}

function loadCombatants() {
  const saved = localStorage.getItem('trackerData');
  if (!saved) return;
  try {
    const state = JSON.parse(saved);
    combatants = state.combatants || [];
    round = state.round || 1;
    currentTurnIndex = state.currentTurnIndex || 0;
    historyLog = state.historyLog || [];
    document.getElementById('roundCounter').textContent = `Round: ${round}`;
    renderCombatants();
  } catch (err) {
    console.error('Error loading tracker data:', err);
  }
}

function clearData() {
  localStorage.removeItem('trackerData');
  combatants = [];
  round = 1;
  currentTurnIndex = 0;
  historyLog = [];
  renderCombatants();
  updateTurnDisplay();
}

// ========== START ENCOUNTER ==========
document.getElementById('startEncounterBtn').addEventListener('click', () => {
  round = 1;
  currentTurnIndex = 0;
  document.getElementById('roundCounter').textContent = `Round: 1`;
  logChange('🎲 Encounter started');
  renderCombatants();
});


// ========== PART 3: Rendering Combatants & Drop Zones ==========

function renderCombatants() {
  const list = document.getElementById('combatantList');
  list.innerHTML = '';
  document.body.classList.remove('dragging');

  const sorted = [...combatants].sort((a, b) => b.init - a.init);

  sorted.forEach((item, index) => {
    // DROP ZONE ABOVE
    list.appendChild(createDropZone(index, null));

    if (item.isGroup) {
      const groupHeader = createGroupRow(item);
      list.appendChild(groupHeader);

      item.members.forEach((member, memberIndex) => {
        const row = createCombatantRow(member, true, item);
        list.appendChild(row);

        // DROP ZONE ABOVE/BETWEEN MEMBERS
        list.appendChild(createDropZone(index, item));
      });

      // DROP ZONE BELOW GROUP
      list.appendChild(createDropZone(index + 0.5, null));
    } else {
      const row = createCombatantRow(item, false, null);
      list.appendChild(row);

      // DROP ZONE BELOW INDIVIDUAL
      list.appendChild(createDropZone(index + 0.5, null));
    }
  });

  updateTurnDisplay();
  saveCombatants();
}

function createDropZone(positionIndex, group) {
  const drop = document.createElement('div');
  drop.className = 'drop-zone';
  drop.dataset.position = positionIndex;
  drop.dataset.group = group?.id || '';

  drop.addEventListener('dragover', e => {
    e.preventDefault();
    document.body.classList.add('dragging');
    drop.classList.add('highlight');
  });

  drop.addEventListener('dragleave', () => {
    drop.classList.remove('highlight');
  });

  drop.addEventListener('drop', e => {
    e.preventDefault();
    document.body.classList.remove('dragging');
    drop.classList.remove('highlight');

    const draggedId = e.dataTransfer.getData("text/plain");
    const dragged = removeCombatantById(draggedId);
    if (!dragged) return;

    dragged.init = dragged.previousInit || dragged.init;

    if (group) {
      const targetGroup = combatants.find(c => c.id === group.id);
      if (targetGroup && targetGroup.isGroup) {
        targetGroup.members.push(dragged);
        logChange(`${dragged.name} added to group ${targetGroup.name}`);
      }
    } else {
      const pos = parseFloat(drop.dataset.position);
      combatants.splice(pos, 0, dragged);
      logChange(`${dragged.name} moved to initiative ${dragged.init}`);
    }

    renderCombatants();
  });

  return drop;
}

function removeCombatantById(id) {
  let found = null;

  // Try removing from top-level
  combatants = combatants.filter(c => {
    if (c.id === id) {
      found = c;
      return false;
    }
    return true;
  });

  // Or from group members
  combatants.forEach(group => {
    if (group.isGroup) {
      group.members = group.members.filter(m => {
        if (m.id === id) {
          found = m;
          m.init = m.previousInit || m.init;
          return false;
        }
        return true;
      });
    }
  });

  return found;
}

// ========== PART 4: Combatant Row, Status Effects & Actions ==========

function createCombatantRow(c, isGrouped = false, groupRef = null) {
  const row = document.createElement('div');
  row.className = 'creature-row';
  if (isGrouped) row.classList.add('group-member');
  row.setAttribute("draggable", "true");

  row.ondragstart = (e) => {
    draggedCombatantId = c.id;
    e.dataTransfer.setData("text/plain", c.id);
  };

  // Status tags with duration
  const statusTags = (c.statusEffects || []).map(se => {
    return `<span class="status-tag">${se.name} (${se.rounds})</span>`;
  }).join(' ');

  // Status dropdown
  const statusDropdown = `
    <select onchange="applyStatusEffect('${c.id}', this)">
      <option value="">＋ Add</option>
      ${statusOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
    </select>
  `;

  // Image cell placeholder
  const imageCell = `<div class="cell">🧍</div>`;

  row.innerHTML = `
    ${imageCell}
    <div class="cell">${isGrouped ? '' : c.init}</div>
    <div class="cell cell-name" contenteditable="true">${c.name}</div>
    <div class="cell cell-ac" contenteditable="true">${c.ac}</div>
    <div class="cell cell-hp" contenteditable="true">${c.hp}/${c.maxHp}</div>
    <div class="cell">${statusTags} ${statusDropdown}</div>
    <div class="cell">${c.role || 'player'}</div>
    <div class="cell">
      <button onclick="duplicateCombatant('${c.id}')">+</button>
      ${groupRef ? `<button onclick="removeFromGroup('${c.id}', '${groupRef.id}')">⬅</button>` : ''}
      <button onclick="deleteCombatant('${c.id}')">🗑</button>
    </div>
  `;

  attachEditableEvents(row, c);
  return row;
}

function attachEditableEvents(row, c) {
  row.querySelectorAll('[contenteditable="true"]').forEach(cell => {
    cell.addEventListener('blur', () => {
      const [nameEl, acEl, hpEl] = row.querySelectorAll('.cell-name, .cell-ac, .cell-hp');

      const newName = nameEl.textContent.trim();
      const newAC = parseInt(acEl.textContent.trim());
      const hpText = hpEl.textContent.trim();
      const [currentHP, maxHP] = parseHP(hpText, c.hp, c.maxHp);

      if (newName !== c.name) {
        logChange(`${c.name} renamed to ${newName}`);
        c.name = newName;
      }

      if (!isNaN(newAC) && newAC !== c.ac) {
        logChange(`${c.name}'s AC changed to ${newAC}`);
        c.ac = newAC;
      }

      if (currentHP !== c.hp || maxHP !== c.maxHp) {
        logChange(`${c.name} HP changed: ${c.hp}/${c.maxHp} → ${currentHP}/${maxHP}`);
        c.hp = Math.max(0, Math.min(currentHP, maxHP));
        c.maxHp = maxHP;
      }

      saveCombatants();
      renderCombatants();
    });
  });
}

function parseHP(hpText, currentHP, maxHP) {
  const mathMatch = hpText.match(/^([+-]?\d+)$/);
  if (mathMatch) {
    const delta = parseInt(mathMatch[1]);
    return [currentHP + delta, maxHP];
  }

  const fullMatch = hpText.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fullMatch) {
    return [parseInt(fullMatch[1]), parseInt(fullMatch[2])];
  }

  const single = parseInt(hpText);
  if (!isNaN(single)) {
    return [single, maxHP];
  }

  return [currentHP, maxHP];
}


// ========== PART 5: Turn Logic & Status Effects ==========

function applyStatusEffect(id, select) {
  const effect = select.value;
  if (!effect) return;
  const rounds = parseInt(prompt('How many rounds?'), 10);
  if (isNaN(rounds) || rounds <= 0) return;

  const target = findCombatantById(id);
  if (!target.statusEffects) target.statusEffects = [];

  target.statusEffects.push({ name: effect, rounds });
  logChange(`${target.name} became ${effect} (${rounds} rounds)`);

  saveCombatants();
  renderCombatants();
}

function tickStatusEffects() {
  combatants.forEach(c => {
    const members = c.isGroup ? c.members : [c];
    members.forEach(m => {
      if (!m.statusEffects) return;
      const old = m.statusEffects.length;

      m.statusEffects = m.statusEffects
        .map(se => ({ ...se, rounds: se.rounds - 1 }))
        .filter(se => se.rounds > 0);

      const removed = old - m.statusEffects.length;
      if (removed > 0) {
        logChange(`${m.name} had ${removed} status effect(s) expire`);
      }
    });
  });
}

function nextTurn() {
  const list = getFlatCombatantList();
  if (list.length === 0) return;

  currentTurnIndex++;
  if (currentTurnIndex >= list.length) {
    currentTurnIndex = 0;
    round++;
    document.getElementById('roundCounter').textContent = `Round: ${round}`;
    logChange(`⏩ Round ${round} begins`);
    tickStatusEffects();
  }

  updateTurnDisplay();
  renderCombatants();
}

function prevTurn() {
  const list = getFlatCombatantList();
  if (list.length === 0) return;

  currentTurnIndex--;
  if (currentTurnIndex < 0) {
    currentTurnIndex = list.length - 1;
    round = Math.max(1, round - 1);
    document.getElementById('roundCounter').textContent = `Round: ${round}`;
    logChange(`⏪ Reverted to Round ${round}`);
    // Optional: reverse status effects here
  }

  updateTurnDisplay();
  renderCombatants();
}

function updateTurnDisplay() {
  const list = getFlatCombatantList();
  const current = list[currentTurnIndex];
  const name = current ? current.name : 'None';
  const display = document.getElementById('currentTurnDisplay');
  display.innerHTML = `🟢 Current Turn: <strong>${name}</strong>`;
}

// ========== PART 6: Duplication, Delete, Export/Import, Log Panel ==========

function duplicateCombatant(id) {
  const original = findCombatantById(id);
  if (!original) return;

  const clone = JSON.parse(JSON.stringify(original));
  clone.id = generateUniqueId();
  clone.name = getUniqueName(original.name);
  clone.statusEffects = [...(original.statusEffects || [])];
  clone.previousInit = original.init;

  combatants.push(clone);
  logChange(`Duplicated ${original.name} → ${clone.name}`);
  saveCombatants();
  renderCombatants();
}

function deleteCombatant(id) {
  let name = '';

  // Try deleting from top level
  combatants = combatants.filter(c => {
    if (c.id === id) {
      name = c.name;
      return false;
    }
    return true;
  });

  // Try deleting from inside a group
  combatants.forEach(c => {
    if (c.isGroup) {
      c.members = c.members.filter(m => {
        if (m.id === id) {
          name = m.name;
          return false;
        }
        return true;
      });
    }
  });

  logChange(`${name} was removed from the tracker`);
  saveCombatants();
  renderCombatants();
}

function removeFromGroup(id, groupId) {
  const group = combatants.find(c => c.id === groupId && c.isGroup);
  if (!group) return;

  const member = group.members.find(m => m.id === id);
  if (!member) return;

  member.init = member.previousInit || member.init;
  combatants.push(member);

  group.members = group.members.filter(m => m.id !== id);
  logChange(`${member.name} was removed from ${group.name}`);

  saveCombatants();
  renderCombatants();
}

function triggerImport() {
  document.getElementById('importInput').click();
}

document.getElementById('importInput').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    try {
      const state = JSON.parse(event.target.result);
      combatants = state.combatants || [];
      round = state.round || 1;
      currentTurnIndex = state.currentTurnIndex || 0;
      historyLog = state.historyLog || [];
      logChange("📂 Encounter loaded");
      renderCombatants();
    } catch (err) {
      alert('Failed to import encounter.');
    }
  };
  reader.readAsText(file);
});

function exportToPDF() {
  alert('🖨 PDF export not implemented yet.\nUse browser Print (Ctrl+P) as a workaround.');
}

function saveEncounter() {
  const data = {
    combatants,
    round,
    currentTurnIndex,
    historyLog
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "encounter.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

document.getElementById('toggleLogBtn').addEventListener('click', () => {
  const container = document.getElementById('trackerContainer');
  container.classList.toggle('show-log');

  const logContent = document.getElementById('historyLogContent');
  logContent.innerHTML = historyLog.map(entry => `<div>${entry}</div>`).join('');
});
