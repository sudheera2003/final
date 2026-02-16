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
    
    # --- 1. CONFIGURATION ---
    # Load keys from .env, with fallbacks for safety
    app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "dev_secret")
    app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY", "jwt_secret")
    app.config['MONGO_URI'] = os.getenv("MONGO_URI")

    # --- 2. DEFINE ALLOWED ORIGINS ---
    # This list allows your frontend to connect from ANY of these locations
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://final-backend-bsn2.onrender.com",
        
        # Add your Vercel URL here:
        "https://final-nowkqafnm-dilums-projects-d5e83860.vercel.app", 
        
        # PRO TIP: Add the main domain too (without the random letters) so it always works:
        "https://final-nowkqafnm.vercel.app" 
    ]

    # --- 3. INITIALIZE PLUGINS ---
    
    # Enable CORS for standard HTTP requests (Login, Register, Dashboard data)
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}}, supports_credentials=True)

    bcrypt.init_app(app)
    jwt.init_app(app)

    # Enable SocketIO for Real-Time updates (Sidebar, User Table)
    # cors_allowed_origins must match the list above
    socketio.init_app(app, cors_allowed_origins=allowed_origins)

    # --- 4. ROUTES ---
    @app.route('/api/health')
    def health():
        return jsonify({
            "status": "healthy", 
            "message": "Modular Backend Running!", 
            "env": "production" if os.getenv("RENDER") else "development"
        })

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(sales_bp, url_prefix='/api')
    app.register_blueprint(dashboard_bp, url_prefix='/api')

    return app