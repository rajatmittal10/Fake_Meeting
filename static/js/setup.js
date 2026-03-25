/**
 * FakeMeeting — Setup Page JS
 * ===========================
 * Handles:
 *   - 3-step form navigation
 *   - Host photo upload (preview + server upload)
 *   - Dynamic participant cards (name + photo per person)
 *   - Form validation
 *   - Start-meeting API call → redirect to /meeting
 */

/* ── State ── */
let currentStep = 1;
let participantCount = 3;
const participantData = {};   // id → { name, photoUrl }
let hostPhotoUrl = null;

/* ── Avatar helpers ── */
const AVATAR_COLORS = [
  "#1a6ed8","#0e9f6e","#9b59b6","#d35400",
  "#16a085","#8e44ad","#2c3e50","#c0392b","#27ae60","#2980b9"
];
function getInitials(name) {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  return parts.length === 1 ? parts[0][0].toUpperCase() : (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
}
function getColor(name) {
  let h = 0;
  for (const c of (name || "?")) h = c.charCodeAt(0) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/* ── Step navigation ── */
function goStep(n) {
  if (n === 2 && !validateStep1()) return;
  if (n === 3) buildParticipantGrid();

  document.querySelectorAll(".step-section").forEach(el => el.classList.add("hidden"));
  document.getElementById(`step-${n}`).classList.remove("hidden");

  // Update dots
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById(`step-dot-${i}`);
    dot.classList.remove("active", "done");
    if (i < n) dot.classList.add("done");
    else if (i === n) dot.classList.add("active");
  }
  // Update lines
  document.querySelectorAll(".step-line").forEach((line, idx) => {
    line.classList.toggle("done", idx < n - 1);
  });

  currentStep = n;
}

/* ── Step 1 validation ── */
function validateStep1() {
  let ok = true;
  const name = document.getElementById("host-name").value.trim();
  const mid  = document.getElementById("meeting-id").value.trim();

  const errName = document.getElementById("err-host-name");
  const errMid  = document.getElementById("err-meeting-id");
  const nameInp = document.getElementById("host-name");
  const midInp  = document.getElementById("meeting-id");

  if (!name) {
    errName.textContent = "Your name is required";
    nameInp.classList.add("error");
    ok = false;
  } else {
    errName.textContent = "";
    nameInp.classList.remove("error");
  }

  if (!mid) {
    errMid.textContent = "Meeting ID is required";
    midInp.classList.add("error");
    ok = false;
  } else {
    errMid.textContent = "";
    midInp.classList.remove("error");
  }

  return ok;
}

/* ── Counter ── */
function adjustCount(delta) {
  setCount(participantCount + delta);
}
function setCount(n) {
  participantCount = Math.max(1, Math.min(24, parseInt(n) || 1));
  document.getElementById("count-display").textContent = participantCount;
  document.getElementById("count-slider").value = participantCount;
}

/* ── Host photo upload ── */
document.getElementById("host-avatar-wrap").addEventListener("click", () => {
  document.getElementById("host-photo-input").click();
});
document.getElementById("host-photo-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Local preview immediately
  const reader = new FileReader();
  reader.onload = ev => {
    const img = document.getElementById("host-preview-img");
    const initDiv = document.getElementById("host-initials");
    img.src = ev.target.result;
    img.classList.remove("hidden");
    initDiv.classList.add("hidden");
  };
  reader.readAsDataURL(file);

  // Upload to server
  hostPhotoUrl = await uploadPhoto(file);
});

/* ── Host name → initials live ── */
document.getElementById("host-name").addEventListener("input", function() {
  const initDiv = document.getElementById("host-initials");
  const img = document.getElementById("host-preview-img");
  if (img.classList.contains("hidden")) {
    initDiv.textContent = getInitials(this.value);
  }
  const circle = document.getElementById("host-preview-circle");
  circle.style.background = getColor(this.value);
});

/* ── Participant grid ── */
function buildParticipantGrid() {
  const grid = document.getElementById("participant-grid");

  // Keep existing cards, only add/remove as needed
  const existing = grid.querySelectorAll(".p-card");
  const existCount = existing.length;

  if (existCount < participantCount) {
    for (let i = existCount; i < participantCount; i++) {
      const id = i + 2;   // IDs start at 2 (host is 1)
      if (!participantData[id]) participantData[id] = { name: "", photoUrl: null };
      grid.appendChild(createParticipantCard(id));
    }
  } else if (existCount > participantCount) {
    for (let i = existCount; i > participantCount; i--) {
      grid.removeChild(grid.lastChild);
    }
  }
}

function createParticipantCard(id) {
  const data = participantData[id];
  const div = document.createElement("div");
  div.className = "p-card";
  div.dataset.id = id;

  const initials = getInitials(data.name) || String(id - 1);
  const color = getColor(data.name || String(id));

  div.innerHTML = `
    <div class="avatar-upload p-avatar-wrap" data-id="${id}">
      <div class="avatar-circle" id="p-circle-${id}" style="background:${color}">
        <div class="avatar-initials" id="p-init-${id}" style="font-size:18px">${initials}</div>
        <img id="p-img-${id}" class="hidden" alt="" style="width:100%;height:100%;object-fit:cover"/>
      </div>
      <div class="avatar-overlay">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 15.2A3.2 3.2 0 1 0 12 8.8a3.2 3.2 0 0 0 0 6.4z"/><path d="M9 2L7.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3.17L15 2H9zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/></svg>
      </div>
      <input type="file" class="hidden p-photo-input" accept="image/*" data-id="${id}"/>
      <span class="p-upload-hint">Upload photo</span>
    </div>
    <input type="text" class="p-name-input" placeholder="Participant ${id - 1}" value="${data.name}" data-id="${id}"/>
  `;

  // Name change
  div.querySelector(".p-name-input").addEventListener("input", function() {
    participantData[id].name = this.value;
    const init = document.getElementById(`p-init-${id}`);
    const img  = document.getElementById(`p-img-${id}`);
    if (img.classList.contains("hidden")) {
      init.textContent = getInitials(this.value) || String(id - 1);
    }
    document.getElementById(`p-circle-${id}`).style.background = getColor(this.value || String(id));
  });

  // Photo click
  div.querySelector(".p-avatar-wrap").addEventListener("click", () => {
    div.querySelector(".p-photo-input").click();
  });

  // Photo change
  div.querySelector(".p-photo-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const img  = document.getElementById(`p-img-${id}`);
      const init = document.getElementById(`p-init-${id}`);
      img.src = ev.target.result;
      img.classList.remove("hidden");
      init.classList.add("hidden");
    };
    reader.readAsDataURL(file);

    participantData[id].photoUrl = await uploadPhoto(file);
    e.target.value = "";
  });

  return div;
}

/* ── Upload photo to server ── */
async function uploadPhoto(file) {
  const fd = new FormData();
  fd.append("photo", file);
  try {
    const res = await fetch("/api/upload-photo", { method: "POST", body: fd });
    const json = await res.json();
    return json.url || null;
  } catch {
    return null;
  }
}

/* ── Start meeting ── */
async function startMeeting() {
  if (!validateStep1()) { goStep(1); return; }

  const hostName  = document.getElementById("host-name").value.trim();
  const meetingId = document.getElementById("meeting-id").value.trim();
  const passcode  = document.getElementById("passcode").value.trim();

  const participants = [];
  for (let i = 0; i < participantCount; i++) {
    const id = i + 2;
    const data = participantData[id] || {};
    participants.push({
      name: data.name || `Participant ${i + 1}`,
      photo: data.photoUrl || null,
    });
  }

  const btn = document.getElementById("join-btn");
  btn.disabled = true;
  btn.innerHTML = `<span style="opacity:.6">Joining…</span>`;

  try {
    const res = await fetch("/api/start-meeting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostName, hostPhoto: hostPhotoUrl, meetingId, passcode, participants }),
    });
    const json = await res.json();
    if (json.ok) {
      window.location.href = "/meeting";
    } else {
      alert(json.error || "Could not start meeting");
      btn.disabled = false;
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg> Join Meeting`;
    }
  } catch {
    alert("Network error. Please try again.");
    btn.disabled = false;
  }
}
