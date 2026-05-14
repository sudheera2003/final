import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from flask_caching import Cache  
from app.extensions import socketio, bcrypt, jwt

#load environment variables
load_dotenv()

# define cache first
cache = Cache(config={'CACHE_TYPE': 'SimpleCache', 'CACHE_DEFAULT_TIMEOUT': 3600})

# import routes
from app.routes.auth import auth_bp
from app.routes.dashboard import dashboard_bp
from app.routes.inventory import inventory_bp
from app.routes.products import products_bp
from app.routes.sales import sales_bp
from app.routes.predict import predict_bp
from app.routes.chat import chat_bp
from app.routes.tickets import tickets_bp


def create_app():
    app = Flask(__name__)
    
    # configuration
    app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "dev_secret")
    app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY", "jwt_secret")
    app.config['MONGO_URI'] = os.getenv("MONGO_URI")

    # allowed urls
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://final-backend-bsn2.onrender.com",
        "https://final-nowkqafnm-dilums-projects-d5e83860.vercel.app", 
        "https://final-nowkqafnm.vercel.app",
        "https://final-inky-iota.vercel.app",
        "https://final-inky-iota.vercel.app/"
    ]

    CORS(app, resources={r"/api/*": {"origins": allowed_origins}}, supports_credentials=True)

    bcrypt.init_app(app)
    jwt.init_app(app)
    socketio.init_app(app, cors_allowed_origins=allowed_origins)

    # bind the cache to flask app
    cache.init_app(app)

    # routes
    @app.route('/api/health')
    def health():
        return jsonify({
            "status": "healthy", 
            "message": "Modular Backend Running!", 
            "env": "production" if os.getenv("RENDER") else "development"
        })

    # register Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(sales_bp, url_prefix='/api/sales')
    app.register_blueprint(dashboard_bp, url_prefix='/api')
    app.register_blueprint(inventory_bp, url_prefix='/api/inventory')
    app.register_blueprint(products_bp, url_prefix='/api/products')
    app.register_blueprint(predict_bp, url_prefix='/api/predict')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    app.register_blueprint(tickets_bp, url_prefix='/api/tickets')

    return app