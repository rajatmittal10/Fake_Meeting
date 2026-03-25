"""
FakeMeeting - Setup Routes
=========================
Handles the pre-meeting setup page (name, photo, participant config).
"""

from flask import Blueprint, render_template

setup_bp = Blueprint("setup", __name__)


@setup_bp.route("/")
def index():
    """Landing / setup page."""
    return render_template("setup.html")
