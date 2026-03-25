"""
FakeMeeting - Meeting Routes
===========================
Serves the main meeting room page.
"""

from flask import Blueprint, render_template

meeting_bp = Blueprint("meeting", __name__)


@meeting_bp.route("/meeting")
def meeting():
    """Main meeting room."""
    return render_template("meeting.html")
