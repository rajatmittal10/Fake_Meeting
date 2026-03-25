"""
FakeMeeting - API Routes
=======================
REST endpoints:
  POST /api/upload-photo  → save a participant photo, return URL
  POST /api/start-meeting → validate & persist meeting config in session
  GET  /api/meeting-state → return current meeting JSON for JS
"""

import os
import uuid
from flask import Blueprint, request, jsonify, session, current_app
from utils.image_utils import process_avatar
from utils.meeting_utils import build_meeting_state

api_bp = Blueprint("api", __name__)


@api_bp.route("/upload-photo", methods=["POST"])
def upload_photo():
    """Receive a photo file, process it, return a public URL."""
    if "photo" not in request.files:
        return jsonify({"error": "No file"}), 400

    file = request.files["photo"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    ext = file.filename.rsplit(".", 1)[-1].lower()
    allowed = current_app.config["ALLOWED_EXTENSIONS"]
    if ext not in allowed:
        return jsonify({"error": "File type not allowed"}), 400

    filename = f"{uuid.uuid4().hex}.jpg"
    upload_dir = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_dir, exist_ok=True)
    save_path = os.path.join(upload_dir, filename)

    # Process (resize + crop to square)
    process_avatar(file, save_path)

    url = f"/static/uploads/{filename}"
    return jsonify({"url": url})


@api_bp.route("/start-meeting", methods=["POST"])
def start_meeting():
    """Validate and store meeting config in server session."""
    data = request.get_json(force=True)

    host_name = (data.get("hostName") or "").strip()
    if not host_name:
        return jsonify({"error": "Host name required"}), 400

    meeting_id = (data.get("meetingId") or "").strip() or "862-4821-0193"
    participants_raw = data.get("participants") or []

    state = build_meeting_state(host_name, data.get("hostPhoto"), meeting_id, participants_raw)
    session["meeting"] = state
    return jsonify({"ok": True})


@api_bp.route("/meeting-state", methods=["GET"])
def meeting_state():
    """Return current meeting state JSON to the frontend JS."""
    state = session.get("meeting")
    if not state:
        return jsonify({"error": "No active meeting"}), 404
    return jsonify(state)


@api_bp.route("/update-participant", methods=["POST"])
def update_participant():
    """Host toggles mute / video / remove for a participant."""
    data = request.get_json(force=True)
    state = session.get("meeting")
    if not state:
        return jsonify({"error": "No meeting"}), 404

    pid = data.get("id")
    action = data.get("action")   # "mute" | "unmute" | "video_off" | "video_on" | "remove"

    updated = []
    for p in state["participants"]:
        if p["id"] == pid:
            if action == "mute":
                p["muted"] = True
            elif action == "unmute":
                p["muted"] = False
            elif action == "toggle_mute":
                p["muted"] = not p["muted"]
            elif action == "video_off":
                p["videoOff"] = True
            elif action == "video_on":
                p["videoOff"] = False
            elif action == "toggle_video":
                p["videoOff"] = not p["videoOff"]
            elif action == "remove":
                continue   # skip → effectively removes
            elif action == "toggle_hand":
                p["handRaised"] = not p.get("handRaised", False)
        updated.append(p)

    state["participants"] = updated
    session["meeting"] = state
    return jsonify({"participants": updated})


@api_bp.route("/send-message", methods=["POST"])
def send_message():
    """Append a chat message to the meeting state."""
    data = request.get_json(force=True)
    state = session.get("meeting")
    if not state:
        return jsonify({"error": "No meeting"}), 404

    msg = {
        "sender": data.get("sender", "Unknown"),
        "senderPhoto": data.get("senderPhoto", None),
        "text": data.get("text", ""),
        "senderId": data.get("senderId", 0),
    }
    state.setdefault("messages", []).append(msg)
    session["meeting"] = state
    return jsonify({"ok": True, "message": msg})


@api_bp.route("/get-messages", methods=["GET"])
def get_messages():
    state = session.get("meeting")
    if not state:
        return jsonify([])
    return jsonify(state.get("messages", []))
