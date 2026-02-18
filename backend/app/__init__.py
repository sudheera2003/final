import os
from pathlib import Path  # <--- NEW IMPORT
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from app.extensions import socketio, bcrypt, jwt
from app.routes.auth import auth_bp
from app.routes.sales import sales_bp
from app.routes.dashboard import dashboard_bp

# --- FIX: FORCE LOAD THE .ENV FILE ---
# 1. Get the path to this specific file (__init__.py)
base_dir = Path(__file__).resolve().parent.parent 
# 2. Point to the .env file in the 'backend' root
env_path = base_dir / '.env'

# 3. Load it explicitly
load_dotenv(dotenv_path=env_path)

# --- DEBUGGING BLOCK (Check your terminal!) ---
print("------------------------------------------------")
print(f"📂 Looking for .env at: {env_path}")
if env_path.exists():
    print("✅ .env file found!")
else:
    print("❌ .env file NOT found! Check filename and location.")

uri = os.getenv("MONGO_URI")
if uri:
    # Print only the start to prove it's loaded (hiding password)
    print(f"🔗 MONGO_URI Loaded: {uri[:25]}...")
else:
    print("⚠️ MONGO_URI is MISSING. App will try localhost (and likely fail).")
print("------------------------------------------------")


def create_app():
    app = Flask(__name__)
    
    # --- 1. CONFIGURATION ---
    app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "dev_secret")
    app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY", "jwt_secret")
    app.config['MONGO_URI'] = os.getenv("MONGO_URI")

    # --- 2. DEFINE ALLOWED ORIGINS ---
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://final-backend-bsn2.onrender.com",
        "https://final-nowkqafnm-dilums-projects-d5e83860.vercel.app", 
        "https://final-nowkqafnm.vercel.app",
        "https://final-inky-iota.vercel.app",
        "https://final-inky-iota.vercel.app/"
    ]

    # --- 3. INITIALIZE PLUGINS ---
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}}, supports_credentials=True)

    bcrypt.init_app(app)
    jwt.init_app(app)
    socketio.init_app(app, cors_allowed_origins=allowed_origins)

    # --- 4. ROUTES ---
    @app.route('/api/health')
    def health():
        return jsonify({
            "status": "healthy", 
            "message": "Modular Backend Running!", 
            "mongo_connected": bool(app.config['MONGO_URI'])
        })

    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(sales_bp, url_prefix='/api')
    app.register_blueprint(dashboard_bp, url_prefix='/api')

    return app