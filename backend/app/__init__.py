import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from app.extensions import socketio, bcrypt, jwt
from app.routes.auth import auth_bp
from app.routes.sales import sales_bp
from app.routes.dashboard import dashboard_bp

# Explicitly load environment variables from .env file
load_dotenv()

def create_app():
    app = Flask(__name__)
    
    # Configuration
    # Now it is guaranteed to load from your .env file
    app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "dev_secret")
    app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY", "jwt_secret")

    # Initialize Plugins
    CORS(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*")

    # Health Check Route
    @app.route('/api/health')
    def health():
        return jsonify({"status": "healthy", "message": "Modular Backend Running!"})

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(sales_bp, url_prefix='/api')
    app.register_blueprint(dashboard_bp, url_prefix='/api')

    return app