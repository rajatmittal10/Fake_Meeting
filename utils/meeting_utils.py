"""
FakeMeeting - Meeting Utilities
==============================
Pure-Python helpers for building and managing meeting state dicts
that get stored in the Flask session and served to the frontend.
"""

import random
import string
from datetime import datetime


def generate_meeting_id() -> str:
    """Generate a random meeting ID: 862-4821-0193"""
    return "{}-{}-{}".format(
        "".join(random.choices(string.digits, k=3)),
        "".join(random.choices(string.digits, k=4)),
        "".join(random.choices(string.digits, k=4)),
    )


def build_meeting_state(host_name: str, host_photo: str | None,
                         meeting_id: str, participants_raw: list) -> dict:
    """
    Build the full meeting state dict from the setup form data.

    Parameters
    ----------
    host_name       : Display name of the host (user)
    host_photo      : URL of uploaded host photo (or None)
    meeting_id      : Meeting ID string
    participants_raw: List of dicts [{name, photo}, ...]
    """
    host = {
        "id": 1,
        "name": host_name,
        "photo": host_photo,
        "isHost": True,
        "muted": False,
        "videoOff": False,
        "handRaised": False,
        "speaking": False,
        "isMe": True,
    }

    others = []
    for i, p in enumerate(participants_raw):
        others.append({
            "id": i + 2,
            "name": (p.get("name") or f"Participant {i + 2}").strip(),
            "photo": p.get("photo") or None,
            "isHost": False,
            "muted": random.choice([True, False]),
            "videoOff": random.choice([True, False, False]),  # bias toward video on
            "handRaised": False,
            "speaking": False,
            "isMe": False,
        })

    return {
        "meetingId": meeting_id,
        "hostName": host_name,
        "hostPhoto": host_photo,
        "startedAt": datetime.now().isoformat(),
        "participants": [host] + others,
        "messages": [
            {
                "sender": "System",
                "senderPhoto": None,
                "text": f"Welcome to meeting {meeting_id}",
                "senderId": 0,
            }
        ],
    }
