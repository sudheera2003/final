from pymongo import MongoClient
from flask_bcrypt import Bcrypt
from flask import Flask
import os
from dotenv import load_dotenv
import certifi

# Load environment variables
load_dotenv()

# Initialize Flask & Bcrypt (needed for hashing)
app = Flask(__name__)
bcrypt = Bcrypt(app)

# Connect to MongoDB
mongo_uri = os.getenv("MONGO_URI")
client = MongoClient(mongo_uri, tlsCAFile=certifi.where())
db = client.get_database("final_project")

def create_admin_user():
    # --- CONFIGURATION ---
    email = "sudheeradilum@gmail.com"
    password = "admin123"
    name = "S.Dilum"
    # ---------------------

    # Check if user already exists
    if db.users.find_one({"email": email}):
        print(f"❌ User with email '{email}' already exists.")
        return

    # Hash the password
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    # Insert User
    db.users.insert_one({
        "email": email,
        "password": hashed_password,
        "name": name,
        "role": "admin"
    })

    print(f"✅ Successfully created user: {email}")
    print(f"🔑 Password: {password}")

if __name__ == "__main__":
    create_admin_user()