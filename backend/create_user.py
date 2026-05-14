from pymongo import MongoClient
from flask_bcrypt import Bcrypt
from flask import Flask
import os
from dotenv import load_dotenv
import certifi
from datetime import datetime

# load environment variables
load_dotenv()

# initialize flask & bcrypt
app = Flask(__name__)
bcrypt = Bcrypt(app)

# connect to mongodb
mongo_uri = os.getenv("MONGO_URI")
client = MongoClient(mongo_uri, tlsCAFile=certifi.where())
db = client.get_database("final_project")

def create_admin_user():
    # configs
    email = "sudheeradilum@gmail.com"
    password = "admin123"
    name = "S.Dilum"

    # check if user already exists
    if db.users.find_one({"email": email}):
        print(f"❌ User with email '{email}' already exists.")
        return

    # hash the password
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    # insert User
    db.users.insert_one({
        "email": email,
        "password": hashed_password,
        "name": name,
        "role": "super_admin",
        "createdAt": datetime.now()
    })

if __name__ == "__main__":
    create_admin_user()