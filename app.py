"""
FakeMeeting - Main Flask Application
===================================
Entry point. Registers all routes and starts the dev server.
"""

from flask import Flask
from config import Config
from routes.setup_routes import setup_bp
from routes.meeting_routes import meeting_bp
from routes.api_routes import api_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Register blueprints
    app.register_blueprint(setup_bp)
    app.register_blueprint(meeting_bp)
    app.register_blueprint(api_bp, url_prefix="/api")

    return app


if __name__ == "__main__":
    app = create_app()
    print("\n" + "="*50)
    print("  🎥  FakeMeeting is running!")
    print("  👉  Open: http://localhost:5000")
    print("="*50 + "\n")
    app.run(debug=True, host="0.0.0.0", port=5000)
