import os
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_socketio import SocketIO
from pymongo import MongoClient
from dotenv import load_dotenv
import certifi

# Load Environment Variables
load_dotenv()

# Initialize Extensions (Unbound)
socketio = SocketIO(cors_allowed_origins="*")
bcrypt = Bcrypt()
jwt = JWTManager()

# Database Connection (Centralized)
mongo_uri = os.getenv("MONGO_URI")
# Using certifi to handle SSL issues automatically
client = MongoClient(mongo_uri, tlsCAFile=certifi.where())
db = client.get_database("final_project")