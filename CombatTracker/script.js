const addCombatantBtn = document.getElementById("addCombatantBtn");
const creatureModal = document.getElementById("creatureModal");
const modalForm = document.getElementById("modalCreatureForm");
const showMoreBtn = document.getElementById("showMoreBtn");
const extraFields = document.getElementById("extraFields");
const combatantList = document.getElementById("combatantList");
const themeToggle = document.getElementById("themeToggle");
const currentTurnDisplay = document.getElementById("currentTurnDisplay");
const addGroupBtn = document.getElementById("addGroupBtn");
const clearDataBtn = document.getElementById("clearDataBtn");

let combatants = [];
let currentTurnIndex = 0;

// Load from localStorage
window.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("combatants");
  if (saved) {
    combatants = JSON.parse(saved);
  }

  const savedTheme = localStorage.getItem("theme");
  const isDark = savedTheme === "dark";
  document.body.classList.toggle("dark", isDark);
  themeToggle.checked = isDark;

  renderCombatants();
});

// Theme toggle
themeToggle.addEventListener("change", () => {
  document.body.classList.toggle("dark", themeToggle.checked);
  localStorage.setItem("theme", themeToggle.checked ? "dark" : "light");
});

// Show modal
addCombatantBtn.addEventListener("click", () => {
  creatureModal.style.display = "flex";
});

// Add group
addGroupBtn.addEventListener("click", () => {
  const group = {
    id: Date.now(),
    name: "New Group",
    init: 0,
    isGroup: true,
    members: []
  };
  combatants.push(group);
  sortCombatants();
  saveCombatants();
  renderCombatants();
});

// Clear all
clearDataBtn.addEventListener("click", () => {
  if (confirm("Clear all combatants?")) {
    combatants = [];
    currentTurnIndex = 0;
    saveCombatants();
    renderCombatants();
  }
});

// Close modal
creatureModal.addEventListener("click", (e) => {
  if (e.target === creatureModal) {
    creatureModal.style.display = "none";
    modalForm.reset();
    extraFields.style.display = "none";
  }
});

// Show more fields
showMoreBtn.addEventListener("click", () => {
  extraFields.style.display = extraFields.style.display === "none" ? "flex" : "none";
});

// Add combatant
modalForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("modalName").value;
  const init = parseInt(document.getElementById("modalInit").value, 10);
  const image = document.getElementById("modalImage").value;
  const ac = document.getElementById("modalAC").value || "";
  const hp = document.getElementById("modalHP").value || "";
  const maxHp = document.getElementById("modalMaxHP").value || "";
  const status = document.getElementById("modalStatus")?.value || "";

  const combatant = {
    id: Date.now(),
    name,
    init,
    image,
    ac,
    hp,
    maxHp,
    status,
    isGroup: false
  };

  combatants.push(combatant);
  sortCombatants();
  saveCombatants();
  renderCombatants();

  creatureModal.style.display = "none";
  modalForm.reset();
  extraFields.style.display = "none";
});

// Turn logic
function nextTurn() {
  if (combatants.length === 0) return;
  currentTurnIndex = (currentTurnIndex + 1) % combatants.length;
  updateTurnDisplay();
}

function prevTurn() {
  if (combatants.length === 0) return;
  currentTurnIndex = (currentTurnIndex - 1 + combatants.length) % combatants.length;
  updateTurnDisplay();
}

function updateTurnDisplay() {
  if (combatants.length === 0) {
    currentTurnDisplay.innerHTML = "🟢 Current Turn: <strong>None</strong>";
  } else {
    const current = combatants[currentTurnIndex];
    currentTurnDisplay.innerHTML = `🟢 Current Turn: <strong>${current.name}</strong>`;
  }
}

function sortCombatants() {
  combatants.sort((a, b) => b.init - a.init);
}

function saveCombatants() {
  localStorage.setItem("combatants", JSON.stringify(combatants));
}

function renderCombatants() {
  combatantList.innerHTML = "";
  combatants.forEach((c) => {
    if (c.isGroup) {
      // Group row
      const groupRow = document.createElement("div");
      groupRow.className = "creature-row group-row";
      groupRow.innerHTML = `
        <div class="cell cell-init" contenteditable="true">${c.init}</div>
        <div class="cell cell-name" contenteditable="true">${c.name} (Group)</div>
        <div class="cell cell-hp">—</div>
        <div class="cell cell-ac">—</div>
        <div class="cell cell-status">—</div>
        <div class="cell cell-actions"><button onclick="deleteGroup(${c.id})">🗑</button></div>
      `;
      groupRow.querySelector(".cell-init").addEventListener("blur", (e) => {
        c.init = parseInt(e.target.innerText) || 0;
        sortCombatants();
        saveCombatants();
        renderCombatants();
      });
      groupRow.querySelector(".cell-name").addEventListener("blur", (e) => {
        c.name = e.target.innerText.replace(" (Group)", "").trim();
        saveCombatants();
        renderCombatants();
      });
      combatantList.appendChild(groupRow);

      // Group members
      c.members.forEach((m) => {
        const row = document.createElement("div");
        row.className = "creature-row group-member";
        row.innerHTML = `
          <div class="cell cell-init">—</div>
          <div class="cell cell-name" contenteditable="true">${m.name}</div>
          <div class="cell cell-hp" contenteditable="true">${m.hp}/${m.maxHp}</div>
          <div class="cell cell-ac" contenteditable="true">${m.ac}</div>
          <div class="cell cell-status" contenteditable="true">${m.status}</div>
          <div class="cell cell-actions"><button onclick="removeFromGroup(${c.id}, ${m.id})">❌</button></div>
        `;
        attachEditableEvents(row, m, c.id);
        combatantList.appendChild(row);
      });

      const dropZone = document.createElement("div");
      dropZone.className = "creature-row drop-zone";
      dropZone.innerHTML = '<div class="cell" colspan="6">[ Drag here to add to group ]</div>';
      dropZone.addEventListener("dragover", (e) => e.preventDefault());
      dropZone.addEventListener("drop", (e) => {
        const draggedId = parseInt(e.dataTransfer.getData("text/plain"));
        const dragged = combatants.find(x => x.id === draggedId);
        if (!dragged || dragged.isGroup) return;
        c.members.push(dragged);
        combatants = combatants.filter(x => x.id !== draggedId);
        saveCombatants();
        renderCombatants();
      });
      combatantList.appendChild(dropZone);

    } else {
      const row = document.createElement("div");
      row.className = "creature-row";
      row.setAttribute("draggable", true);
      row.ondragstart = (e) => {
        e.dataTransfer.setData("text/plain", c.id);
      };
      row.innerHTML = `
        <div class="cell cell-init" contenteditable="true">${c.init}</div>
        <div class="cell cell-name" contenteditable="true">${c.name}</div>
        <div class="cell cell-hp" contenteditable="true">${c.hp}/${c.maxHp}</div>
        <div class="cell cell-ac" contenteditable="true">${c.ac}</div>
        <div class="cell cell-status" contenteditable="true">${c.status}</div>
        <div class="cell cell-actions"><button onclick="deleteCombatant(${c.id})">🗑</button></div>
      `;
      attachEditableEvents(row, c);
      combatantList.appendChild(row);
    }
  });

  updateTurnDisplay();
}

function attachEditableEvents(row, obj, groupId = null) {
  const fields = ["init", "name", "hp", "ac", "status"];
  fields.forEach((field, idx) => {
    const cell = row.children[idx];
    if (!cell || field === "init" && obj.isGroupMember) return;
    cell.addEventListener("blur", () => {
      let value = cell.innerText.trim();
      if (field === "init") value = parseInt(value) || 0;
      if (field === "hp" && value.includes("/")) {
        const [hp, maxHp] = value.split("/");
        obj.hp = hp.trim();
        obj.maxHp = maxHp.trim();
      } else {
        obj[field] = value;
      }
      saveCombatants();
    });
  });
}

function deleteCombatant(id) {
  combatants = combatants.filter(c => c.id !== id);
  saveCombatants();
  renderCombatants();
}

function deleteGroup(id) {
  combatants = combatants.filter(c => c.id !== id);
  saveCombatants();
  renderCombatants();
}

function removeFromGroup(groupId, memberId) {
  const group = combatants.find(c => c.id === groupId);
  if (!group) return;
  const member = group.members.find(m => m.id === memberId);
  if (member) {
    combatants.push(member);
    group.members = group.members.filter(m => m.id !== memberId);
    saveCombatants();
    renderCombatants();
  }
}
