import os
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_socketio import SocketIO
from pymongo import MongoClient
from dotenv import load_dotenv
import certifi

# load environment variables
load_dotenv()

# initialize extensions
socketio = SocketIO(cors_allowed_origins="*")
bcrypt = Bcrypt()
jwt = JWTManager()

# database connection
mongo_uri = os.getenv("MONGO_URI")
# using certifi to handle SSL issues
client = MongoClient(mongo_uri, tlsCAFile=certifi.where())
db = client.get_database("final_project")