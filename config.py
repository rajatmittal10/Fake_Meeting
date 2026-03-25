"""
FakeMeeting - Configuration
==========================
All app-level settings in one place.
"""

import os
import secrets

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class Config:
    SECRET_KEY = secrets.token_hex(32)
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "uploads")
    MAX_CONTENT_LENGTH = 8 * 1024 * 1024   # 8 MB max upload
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
    MAX_PARTICIPANTS = 25
