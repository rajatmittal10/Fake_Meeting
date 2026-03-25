/**
 * FakeMeeting — Meeting Room JS
 * ============================
 * Full meeting room logic:
 *   - Load state from server (/api/meeting-state)
 *   - Render video tiles with real webcam for host
 *   - Gallery / Speaker view toggle
 *   - Mic, Camera, Share, Record, Reactions, Raise Hand
 *   - Chat panel: send as yourself OR as any participant
 *   - Participants panel: search, mute/unmute, toggle video, remove
 *   - Right-click context menu on tiles
 *   - Simulated speaking animation for others
 *   - Auto incoming fake messages
 *   - Leave modal
 */

/* ── State ── */
let state = null;        // full meeting state from server
let localStream = null;  // webcam stream
let elapsed = 0;         // seconds
let timerInterval = null;
let viewMode = "gallery";
let panelOpen = null;    // "chat" | "participants" | null
let currentTab = "chat";
let isRecording = false;
let isSharing = false;
let ctxTargetId = null;  // participant id for context menu
let unreadCount = 0;
let handRaised = false;
let hostMuted = false;
let hostVideoOff = false;

const COLORS = ["#1a6ed8","#0e9f6e","#9b59b6","#d35400","#16a085","#8e44ad","#2c3e50","#e74c3c","#27ae60","#2980b9"];
const FAKE_MSGS = [
  "Can everyone hear me?","Yes, loud and clear!","Let me pull up that file.",
  "I have a quick question.","Great point, I completely agree.",
  "Could you repeat that please?","Let's schedule a follow-up for this.",
  "Sounds good to me!","When's the deadline for this?",
  "I'll send notes after the call.","Sorry, I was on mute!",
  "Can you see my screen?","Just got back, what did I miss?",
  "That makes total sense.","Let me check and get back to you.",
];

function getInitials(name) {
  if (!name || !name.trim()) return "?";
  const p = name.trim().split(" ").filter(Boolean);
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0]+p[p.length-1][0]).toUpperCase();
}
function getColor(name) {
  let h = 0;
  for (const c of (name||"?")) h = c.charCodeAt(0) + ((h<<5)-h);
  return COLORS[Math.abs(h) % COLORS.length];
}
function randomItem(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function nowTime() {
  const d = new Date();
  return d.getHours().toString().padStart(2,"0")+":"+d.getMinutes().toString().padStart(2,"0");
}

/* ── Boot ── */
window.addEventListener("DOMContentLoaded", async () => {
  await loadState();
  if (!state) { window.location.href = "/"; return; }

  document.getElementById("display-meeting-id").textContent = state.meetingId;

  startTimer();
  await startCamera();
  renderGrid();
  populateSendAs();
  renderParticipantsList();
  renderMessages();
  updatePCountBadge();

  // Simulated speaking pulses
  setInterval(simulateSpeaking, 2800);

  // Simulated incoming messages
  setInterval(simulateIncoming, 8000);
});

/* ── Load state from server ── */
async function loadState() {
  try {
    const res = await fetch("/api/meeting-state");
    if (!res.ok) return;
    state = await res.json();
  } catch { state = null; }
}

/* ── Timer ── */
function startTimer() {
  timerInterval = setInterval(() => {
    elapsed++;
    const h = Math.floor(elapsed/3600);
    const m = Math.floor((elapsed%3600)/60);
    const s = elapsed%60;
    const str = h > 0
      ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
      : `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
    document.getElementById("timer").textContent = str;
  }, 1000);
}

/* ── Camera ── */
async function startCamera() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:false });
  } catch { localStream = null; }
}

/* ── Grid render ── */
function renderGrid() {
  const grid = document.getElementById("video-grid");
  grid.innerHTML = "";

  const ps = state.participants;
  const cols = Math.min(Math.ceil(Math.sqrt(ps.length)), 5);

  if (viewMode === "gallery") {
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    grid.style.gridTemplateRows = "";
    grid.style.height = "100%";
    ps.forEach(p => grid.appendChild(createTile(p, false)));
  } else {
    // Speaker view: host large + strip
    grid.style.display = "flex";
    grid.style.flexDirection = "column";
    grid.style.gap = "8px";
    grid.style.height = "100%";

    const host = ps[0];
    const others = ps.slice(1);

    const mainWrap = document.createElement("div");
    mainWrap.style.cssText = "flex:1;min-height:0;";
    mainWrap.appendChild(createTile(host, true));
    grid.appendChild(mainWrap);

    if (others.length) {
      const strip = document.createElement("div");
      strip.className = "speaker-strip";
      others.forEach(p => {
        const w = document.createElement("div");
        w.style.cssText = "width:160px;flex-shrink:0;height:100%;";
        w.appendChild(createTile(p, false));
        strip.appendChild(w);
      });
      grid.appendChild(strip);
    }
  }
}

function createTile(p, large) {
  const tile = document.createElement("div");
  tile.className = "tile" + (p.isMe ? " me" : "") + (p.speaking ? " speaking" : "");
  tile.dataset.id = p.id;
  tile.style.height = large ? "100%" : undefined;

  // Right-click context menu
  if (!p.isMe) {
    tile.addEventListener("contextmenu", e => { e.preventDefault(); showCtxMenu(e, p); });
  }

  // Video for host
  if (p.isMe && !p.videoOff && localStream) {
    const video = document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = localStream;
    tile.appendChild(video);
  } else {
    // Avatar
    const wrap = document.createElement("div");
    wrap.className = "tile-avatar-wrap";
    const size = large ? 96 : 56;

    if (p.photo) {
      const img = document.createElement("img");
      img.src = p.photo;
      img.className = "tile-avatar";
      img.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;`;
      wrap.appendChild(img);
    } else {
      const init = document.createElement("div");
      init.className = "tile-initials";
      init.style.cssText = `width:${size}px;height:${size}px;font-size:${Math.round(size*.38)}px;background:${getColor(p.name)};`;
      init.textContent = getInitials(p.name);
      wrap.appendChild(init);
    }
    tile.appendChild(wrap);
  }

  // Badges (top-left)
  const badges = document.createElement("div");
  badges.className = "tile-badges";
  if (p.muted) {
    const b = document.createElement("div");
    b.className = "tile-badge muted";
    b.title = "Muted";
    b.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M19 11a7 7 0 01-.78 3.22L6.07 3.07A7 7 0 0119 11zm-7 7a7 7 0 01-7-7c0-.6.08-1.18.22-1.73L3 7.1V11a9 9 0 009 9 8.9 8.9 0 005.06-1.55L15.42 17A7 7 0 0112 18zM3.71 2.29L2.3 3.71l18 18 1.41-1.41z"/></svg>`;
    badges.appendChild(b);
  }
  if (p.videoOff) {
    const b = document.createElement("div");
    b.className = "tile-badge novid";
    b.title = "Camera off";
    b.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="#aaa"><path d="M21 6.5l-4-4-2.14 2.14L10.72.5 9.28 1.94 19.06 11.72 21 9.78zM3.27 2L2 3.27l4.37 4.37C4.93 8.25 4 9.51 4 11v7a2 2 0 002 2h11a2 2 0 001.46-.63L21 22l1.27-1.27z"/></svg>`;
    badges.appendChild(b);
  }
  if (p.handRaised) {
    const b = document.createElement("div");
    b.className = "tile-badge hand";
    b.title = "Hand raised";
    b.textContent = "✋";
    badges.appendChild(b);
  }
  tile.appendChild(badges);

  // Hover controls (for non-host participants)
  if (!p.isMe) {
    const ctrls = document.createElement("div");
    ctrls.className = "tile-controls";

    const muteBtn = document.createElement("button");
    muteBtn.className = "tile-ctrl-btn";
    muteBtn.title = p.muted ? "Unmute" : "Mute";
    muteBtn.innerHTML = p.muted
      ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 11a7 7 0 01-.78 3.22L6.07 3.07A7 7 0 0119 11z"/></svg>`
      : `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z"/></svg>`;
    muteBtn.addEventListener("click", e => { e.stopPropagation(); participantAction(p.id, "toggle_mute"); });
    ctrls.appendChild(muteBtn);

    const removeBtn = document.createElement("button");
    removeBtn.className = "tile-ctrl-btn danger";
    removeBtn.title = "Remove";
    removeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
    removeBtn.addEventListener("click", e => { e.stopPropagation(); participantAction(p.id, "remove"); });
    ctrls.appendChild(removeBtn);

    tile.appendChild(ctrls);
  }

  // Name bar (bottom)
  const nameBar = document.createElement("div");
  nameBar.className = "tile-name";
  if (p.muted) nameBar.innerHTML = `<span class="muted-icon">🔇</span>`;
  nameBar.innerHTML += `${p.name}${p.isMe ? " (You)" : ""}${p.isHost ? " ⭐" : ""}`;
  tile.appendChild(nameBar);

  return tile;
}

/* ── View toggle ── */
function toggleView() {
  viewMode = viewMode === "gallery" ? "speaker" : "gallery";
  document.getElementById("view-label").textContent = viewMode === "gallery" ? "Gallery" : "Speaker";
  document.getElementById("view-toggle").classList.toggle("active", viewMode === "speaker");
  renderGrid();
}

/* ── Mic toggle ── */
function toggleMic() {
  hostMuted = !hostMuted;
  state.participants[0].muted = hostMuted;

  const btn = document.getElementById("btn-mic");
  const lbl = document.getElementById("label-mic");
  if (hostMuted) {
    btn.classList.add("muted-btn");
    lbl.textContent = "Unmute";
    btn.querySelector(".tool-icon").innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19 11a7 7 0 01-.78 3.22L6.07 3.07A7 7 0 0119 11zm-7 7a7 7 0 01-7-7c0-.6.08-1.18.22-1.73L3 7.1V11a9 9 0 009 9 8.9 8.9 0 005.06-1.55L15.42 17A7 7 0 0112 18zM3.71 2.29L2.3 3.71l18 18 1.41-1.41z"/></svg>`;
  } else {
    btn.classList.remove("muted-btn");
    lbl.textContent = "Mute";
    btn.querySelector(".tool-icon").innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.93V21h2v-3.07A7 7 0 0019 11h-2z"/></svg>`;
  }
  renderGrid();
}

/* ── Camera toggle ── */
function toggleCamera() {
  hostVideoOff = !hostVideoOff;
  state.participants[0].videoOff = hostVideoOff;
  if (localStream) {
    localStream.getVideoTracks().forEach(t => t.enabled = !hostVideoOff);
  }

  const btn = document.getElementById("btn-cam");
  const lbl = document.getElementById("label-cam");
  if (hostVideoOff) {
    btn.classList.add("muted-btn");
    lbl.textContent = "Start Video";
  } else {
    btn.classList.remove("muted-btn");
    lbl.textContent = "Stop Video";
  }
  renderGrid();
}

/* ── Share screen ── */
function toggleShare() {
  isSharing = !isSharing;
  document.getElementById("btn-share").classList.toggle("active", isSharing);
  document.getElementById("share-badge").classList.toggle("hidden", !isSharing);
}

/* ── Record ── */
function toggleRecord() {
  isRecording = !isRecording;
  document.getElementById("btn-rec").classList.toggle("active", isRecording);
  document.getElementById("label-rec").textContent = isRecording ? "Stop Rec" : "Record";
  document.getElementById("rec-badge").classList.toggle("hidden", !isRecording);
}

/* ── Raise hand ── */
function toggleHand() {
  handRaised = !handRaised;
  state.participants[0].handRaised = handRaised;
  document.getElementById("btn-hand").classList.toggle("active", handRaised);
  document.getElementById("label-hand").textContent = handRaised ? "Lower Hand" : "Raise Hand";
  renderGrid();
  if (handRaised) addSystemMsg("You raised your hand ✋");
}

/* ── Reactions ── */
function toggleReactionMenu() {
  const menu = document.getElementById("reaction-menu");
  menu.classList.toggle("hidden");
}
function sendReaction(emoji) {
  document.getElementById("reaction-menu").classList.add("hidden");
  const el = document.getElementById("float-reaction");
  el.textContent = emoji;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 3000);

  // Add to chat
  const sender = state.participants[0];
  appendMessage({ sender: sender.name, senderPhoto: sender.photo, text: `Reacted with ${emoji}`, senderId: sender.id });
}

/* ── Panel ── */
function togglePanel(name) {
  const panel = document.getElementById("side-panel");
  if (panelOpen === name) {
    // Close
    panel.classList.add("hidden");
    panelOpen = null;
    document.getElementById("btn-chat").classList.remove("active");
    document.getElementById("btn-participants").classList.remove("active");
  } else {
    // Open / switch
    panel.classList.remove("hidden");
    panelOpen = name;
    document.getElementById("btn-chat").classList.toggle("active", name === "chat");
    document.getElementById("btn-participants").classList.toggle("active", name === "participants");
    switchTab(name);
    if (name === "chat") {
      unreadCount = 0;
      updateChatBadge();
    }
  }
}

function switchTab(name) {
  currentTab = name;
  document.getElementById("tab-chat").classList.toggle("active", name === "chat");
  document.getElementById("tab-participants").classList.toggle("active", name === "participants");
  document.getElementById("content-chat").classList.toggle("hidden", name !== "chat");
  document.getElementById("content-participants").classList.toggle("hidden", name !== "participants");
  if (name === "chat") { unreadCount = 0; updateChatBadge(); scrollChat(); }
  if (name === "participants") renderParticipantsList();
}

/* ── Chat ── */
function populateSendAs() {
  const sel = document.getElementById("send-as-select");
  sel.innerHTML = "";
  state.participants.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.isMe ? `${p.name} (You)` : p.name;
    sel.appendChild(opt);
  });
}

function chatKeydown(e) {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
}

async function sendChatMessage() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;

  const senderId = parseInt(document.getElementById("send-as-select").value);
  const sender = state.participants.find(p => p.id === senderId) || state.participants[0];

  const msg = { sender: sender.name, senderPhoto: sender.photo, text, senderId: sender.id };
  appendMessage(msg);
  input.value = "";
  input.style.height = "auto";

  // Persist to server
  try {
    await fetch("/api/send-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });
  } catch {}
}

function appendMessage(msg) {
  state.messages = state.messages || [];
  state.messages.push(msg);
  renderSingleMessage(msg);
  scrollChat();

  if (panelOpen !== "chat") {
    unreadCount++;
    updateChatBadge();
  }
}

function addSystemMsg(text) {
  const msg = { sender: "System", senderPhoto: null, text, senderId: 0 };
  appendMessage(msg);
}

function renderMessages() {
  const container = document.getElementById("chat-messages");
  container.innerHTML = "";
  (state.messages || []).forEach(m => renderSingleMessage(m));
  scrollChat();
}

function renderSingleMessage(msg) {
  const container = document.getElementById("chat-messages");
  const myId = state.participants[0].id;

  const div = document.createElement("div");

  if (msg.senderId === 0 || msg.sender === "System") {
    div.className = "chat-msg system";
    div.innerHTML = `<div class="msg-system">${msg.text}</div>`;
  } else {
    const isMe = msg.senderId === myId;
    div.className = `chat-msg${isMe ? " me" : ""}`;

    const senderRow = document.createElement("div");
    senderRow.className = "msg-sender-row";

    // Avatar
    if (msg.senderPhoto) {
      const img = document.createElement("img");
      img.src = msg.senderPhoto;
      img.className = "msg-avatar";
      senderRow.appendChild(img);
    } else {
      const init = document.createElement("div");
      init.className = "msg-avatar-init";
      init.style.background = getColor(msg.sender);
      init.textContent = getInitials(msg.sender);
      senderRow.appendChild(init);
    }

    const nameEl = document.createElement("span");
    nameEl.className = `msg-sender-name${isMe ? " me-name" : ""}`;
    nameEl.textContent = isMe ? "You" : msg.sender;
    senderRow.appendChild(nameEl);

    const timeEl = document.createElement("span");
    timeEl.className = "msg-time";
    timeEl.textContent = nowTime();
    senderRow.appendChild(timeEl);

    const bubble = document.createElement("div");
    bubble.className = "msg-bubble";
    bubble.textContent = msg.text;

    div.appendChild(senderRow);
    div.appendChild(bubble);
  }

  container.appendChild(div);
}

function scrollChat() {
  const c = document.getElementById("chat-messages");
  if (c) c.scrollTop = c.scrollHeight;
}

function updateChatBadge() {
  const badge = document.getElementById("chat-badge");
  if (unreadCount > 0 && panelOpen !== "chat") {
    badge.textContent = unreadCount > 9 ? "9+" : unreadCount;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

/* ── Participants list ── */
function renderParticipantsList(filter = "") {
  const list = document.getElementById("participant-list");
  list.innerHTML = "";
  const lower = filter.toLowerCase();

  state.participants
    .filter(p => !filter || p.name.toLowerCase().includes(lower))
    .forEach(p => {
      const row = document.createElement("div");
      row.className = "p-row";

      // Avatar
      if (p.photo) {
        const img = document.createElement("img");
        img.src = p.photo;
        img.className = "p-row-avatar";
        row.appendChild(img);
      } else {
        const init = document.createElement("div");
        init.className = "p-row-init";
        init.style.background = getColor(p.name);
        init.textContent = getInitials(p.name);
        row.appendChild(init);
      }

      // Info
      const info = document.createElement("div");
      info.className = "p-row-info";
      info.innerHTML = `<div class="p-row-name">${p.name}${p.isHost ? " <span style='color:#2D8CFF;font-size:10px'>★ Host</span>" : ""}${p.isMe ? " <span style='color:#888;font-size:10px'>(You)</span>" : ""}</div>`;

      const status = document.createElement("div");
      status.className = "p-row-status";
      status.innerHTML = p.muted
        ? `<span class="muted-txt">🔇 Muted</span>`
        : `<span class="active-txt">🎙 Unmuted</span>`;
      if (p.videoOff) status.innerHTML += `<span>· 📷 No video</span>`;
      if (p.handRaised) status.innerHTML += `<span>· ✋ Hand raised</span>`;
      info.appendChild(status);
      row.appendChild(info);

      // Actions (host can control everyone; also control self)
      const actions = document.createElement("div");
      actions.className = "p-row-actions";

      const muteBtn = document.createElement("button");
      muteBtn.className = "p-action-btn";
      muteBtn.textContent = p.muted ? "Unmute" : "Mute";
      muteBtn.onclick = () => participantAction(p.id, "toggle_mute");
      actions.appendChild(muteBtn);

      const vidBtn = document.createElement("button");
      vidBtn.className = "p-action-btn";
      vidBtn.textContent = p.videoOff ? "Ask Video" : "Stop Video";
      vidBtn.onclick = () => participantAction(p.id, "toggle_video");
      actions.appendChild(vidBtn);

      if (!p.isMe) {
        const removeBtn = document.createElement("button");
        removeBtn.className = "p-action-btn danger";
        removeBtn.textContent = "Remove";
        removeBtn.onclick = () => participantAction(p.id, "remove");
        actions.appendChild(removeBtn);
      }

      row.appendChild(actions);
      list.appendChild(row);
    });
}

function filterParticipants(val) { renderParticipantsList(val); }

function updatePCountBadge() {
  document.getElementById("p-count-badge").textContent = state.participants.length;
}

/* ── Participant actions ── */
async function participantAction(id, action) {
  if (action === "remove") {
    const p = state.participants.find(p => p.id === id);
    if (!p) return;
    state.participants = state.participants.filter(p => p.id !== id);
    addSystemMsg(`${p.name} was removed from the meeting.`);
    populateSendAs();
    updatePCountBadge();
    renderGrid();
    renderParticipantsList();
    return;
  }

  // Local state update (instant UI)
  state.participants = state.participants.map(p => {
    if (p.id !== id) return p;
    if (action === "toggle_mute") return { ...p, muted: !p.muted };
    if (action === "toggle_video") return { ...p, videoOff: !p.videoOff };
    return p;
  });

  renderGrid();
  renderParticipantsList();

  // Sync to server
  try {
    await fetch("/api/update-participant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
  } catch {}
}

/* ── Context menu ── */
function showCtxMenu(e, p) {
  ctxTargetId = p.id;
  const menu = document.getElementById("ctx-menu");
  document.getElementById("ctx-mute-label").textContent = p.muted ? "Unmute" : "Mute";
  document.getElementById("ctx-video-label").textContent = p.videoOff ? "Ask to start video" : "Stop video";

  menu.style.left = `${Math.min(e.clientX, window.innerWidth - 210)}px`;
  menu.style.top  = `${Math.min(e.clientY, window.innerHeight - 160)}px`;
  menu.classList.remove("hidden");
}
function ctxAction(action) {
  if (ctxTargetId) participantAction(ctxTargetId, action);
  document.getElementById("ctx-menu").classList.add("hidden");
  ctxTargetId = null;
}
function ctxChatWith() {
  if (!ctxTargetId) return;
  const p = state.participants.find(p => p.id === ctxTargetId);
  if (!p) return;
  document.getElementById("ctx-menu").classList.add("hidden");
  // Open chat and set send-as to this participant
  if (panelOpen !== "chat") togglePanel("chat");
  else switchTab("chat");
  document.getElementById("send-as-select").value = ctxTargetId;
  document.getElementById("chat-input").focus();
  ctxTargetId = null;
}
document.addEventListener("click", () => {
  document.getElementById("ctx-menu").classList.add("hidden");
  document.getElementById("reaction-menu").classList.add("hidden");
});

/* ── Simulate speaking ── */
function simulateSpeaking() {
  if (!state) return;
  state.participants = state.participants.map(p => ({
    ...p,
    speaking: !p.isMe && !p.muted && Math.random() < 0.12,
  }));
  // Update tile borders without full re-render
  document.querySelectorAll(".tile").forEach(tile => {
    const id = parseInt(tile.dataset.id);
    const p = state.participants.find(p => p.id === id);
    if (p) tile.classList.toggle("speaking", !!p.speaking);
  });
}

/* ── Simulate incoming messages ── */
function simulateIncoming() {
  if (!state) return;
  if (Math.random() > 0.35) return;
  const others = state.participants.filter(p => !p.isMe);
  if (!others.length) return;
  const sender = randomItem(others);
  const msg = {
    sender: sender.name,
    senderPhoto: sender.photo,
    text: randomItem(FAKE_MSGS),
    senderId: sender.id,
  };
  appendMessage(msg);
}

/* ── Leave modal ── */
function showLeaveModal() { document.getElementById("leave-modal").classList.remove("hidden"); }
function hideLeaveModal() { document.getElementById("leave-modal").classList.add("hidden"); }
function leaveMeeting() {
  clearInterval(timerInterval);
  if (localStream) localStream.getTracks().forEach(t => t.stop());
  window.location.href = "/";
}
