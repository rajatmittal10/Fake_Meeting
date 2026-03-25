# 🎥 FakeMeeting — Python Flask Meeting App

A pixel-perfect, high-fidelity meeting app clone built with **Python (Flask) + Vanilla JS**.
Every screen, button, and interaction mirrors a premium meeting UI.

---

## 📁 Project Structure

```
fakemeeting/
├── app.py                    ← Flask entry point (run this)
├── config.py                 ← App settings (secret key, upload folder, limits)
├── requirements.txt          ← Python dependencies
│
├── routes/
│   ├── setup_routes.py       ← GET / → setup page
│   ├── meeting_routes.py     ← GET /meeting → meeting room
│   └── api_routes.py         ← REST API (upload, start, state, chat, controls)
│
├── utils/
│   ├── image_utils.py        ← Pillow: resize + crop avatar photos
│   └── meeting_utils.py      ← Build & manage meeting state dicts
│
├── templates/
│   ├── setup.html            ← 3-step pre-join setup page
│   └── meeting.html          ← Full meeting room UI
│
└── static/
    ├── css/
    │   ├── setup.css         ← Setup page styles (dark theme)
    │   └── meeting.css       ← Meeting room styles (dark theme)
    └── js/
        ├── setup.js          ← Setup form: steps, photo uploads, validation
        └── meeting.js        ← Full meeting logic: tiles, chat, controls
```

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the server
```bash
python app.py
```

### 3. Open your browser
```
http://localhost:5000
```

---

## ✨ Features

### Setup Screen (3-Step Flow)
| Step | What you do |
|------|-------------|
| **1 — Your Profile** | Enter your name, upload your photo, set Meeting ID + passcode |
| **2 — Participants** | Choose how many other participants (1–24) via slider or stepper |
| **3 — Add Participants** | Set a custom name + upload a real photo for every participant |

### Meeting Room
| Feature | Details |
|---------|---------|
| 🎙 **Mic toggle** | Mute/unmute yourself; red indicator when muted |
| 📹 **Camera toggle** | Uses real webcam via browser API; toggle on/off |
| 🖥 **Screen share** | Banner shown when sharing; toggle off |
| ⏺ **Recording** | REC badge in top bar; blinking red dot |
| 😊 **Reactions** | Emoji picker; floating animation + logged in chat |
| ✋ **Raise Hand** | Shows ✋ badge on your tile; logged in chat |
| 💬 **Chat panel** | Full chat with avatars, timestamps, bubble styling |
| 👤 **Send as anyone** | Dropdown to send messages AS any participant |
| 👥 **Participants panel** | Search, mute/unmute, toggle video, remove any participant |
| ⊞ **Gallery view** | Auto-responsive grid (up to 5 columns) |
| 👤 **Speaker view** | Host large + strip of others below |
| 🖱 **Right-click tiles** | Context menu: mute, stop video, chat with, remove |
| 🔵 **Speaking indicator** | Blue border pulses on active tiles |
| ⏱ **Meeting timer** | Live elapsed time in top bar |
| 🔒 **Meeting ID badge** | Shown with lock icon in top bar |
| 🚪 **Leave modal** | Confirm before leaving; returns to setup |
| 🤖 **Simulated messages** | Participants auto-send realistic messages |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.10+ · Flask 3.x |
| **Image processing** | Pillow (PIL) — square-crop + resize avatars |
| **Session** | Flask server-side session (cookie-based) |
| **Frontend** | Vanilla HTML5 · CSS3 · JavaScript (ES2020) |
| **Camera** | Browser `getUserMedia` API |
| **Fonts** | Google Fonts — Inter |

---

## 📸 How Photos Work

1. User clicks the photo circle → browser file picker opens
2. File is uploaded to `/api/upload-photo` (POST multipart)
3. **Pillow** (`image_utils.py`) resizes and centre-crops to 400×400 JPEG
4. URL `/static/uploads/<uuid>.jpg` is returned and stored in meeting state
5. Photo appears on tile, in chat bubbles, and in the participants list

---

## 🧪 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/` | Setup page |
| `GET`  | `/meeting` | Meeting room |
| `POST` | `/api/upload-photo` | Upload + process avatar image |
| `POST` | `/api/start-meeting` | Validate config, store in session |
| `GET`  | `/api/meeting-state` | Fetch full meeting state JSON |
| `POST` | `/api/update-participant` | Mute / unmute / remove participant |
| `POST` | `/api/send-message` | Send chat message |
| `GET`  | `/api/get-messages` | Fetch all chat messages |
