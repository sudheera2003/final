from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.extensions import db, bcrypt, socketio
from bson import ObjectId

auth_bp = Blueprint('auth', __name__)

# --- LOGIN ROUTE ---
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    # Find user by email
    user = db.users.find_one({"email": email})

    if user and bcrypt.check_password_hash(user['password'], password):
        # Create token with email as identity
        access_token = create_access_token(identity=email)
        
        return jsonify({
            "token": access_token, 
            "email": email,
            "name": user.get("name", "User") 
        }), 200
    
    return jsonify({"error": "Invalid credentials"}), 401


# --- UPDATE PROFILE ROUTE (With WebSocket) ---
@auth_bp.route('/update-profile', methods=['PUT'])
@jwt_required()
def update_profile():
    current_email = get_jwt_identity()
    data = request.get_json()
    new_name = data.get('name')
    
    if not new_name:
        return jsonify({"error": "Name is required"}), 400

    result = db.users.update_one(
        {"email": current_email},
        {"$set": {"name": new_name}}
    )

    if result.modified_count > 0:
        # Emit event so the Sidebar updates instantly
        socketio.emit('profile_updated', {
            'email': current_email,
            'name': new_name
        })
        return jsonify({"message": "Success", "name": new_name}), 200
    
    return jsonify({"message": "No changes made"}), 200


# --- REGISTER / ADD USER ROUTE (With WebSocket) ---
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    name = data.get('name', 'New User')
    role = data.get('role', 'user')

    # Basic Validation
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    if db.users.find_one({"email": email}):
        return jsonify({"error": "User already exists"}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    
    # Insert User
    result = db.users.insert_one({
        "email": email, 
        "password": hashed_password,
        "name": name,
        "role": role
    })

    # --- WEBSOCKET EMIT: Tell frontend a new user exists ---
    # This updates the Admin Table instantly!
    socketio.emit('user_created', {
        "_id": str(result.inserted_id),
        "name": name,
        "email": email,
        "role": role
    })

    return jsonify({"message": "User created successfully"}), 201


# --- GET ALL USERS ---
@auth_bp.route('/users', methods=['GET'])
def get_users():
    users = list(db.users.find({}, {"password": 0})) # Exclude passwords
    
    # Convert ObjectId to string
    for user in users:
        user['_id'] = str(user['_id'])
    
    return jsonify(users), 200


# --- DELETE USER ROUTE (With WebSocket) ---
@auth_bp.route('/users/<user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    current_email = get_jwt_identity()
    
    # Check if user exists
    user_to_delete = db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user_to_delete:
        return jsonify({"error": "User not found"}), 404

    # Prevent deleting yourself
    if user_to_delete['email'] == current_email:
         return jsonify({"error": "You cannot delete your own account."}), 403

    # Delete User
    result = db.users.delete_one({"_id": ObjectId(user_id)})
    
    if result.deleted_count > 0:
        # --- WEBSOCKET EMIT: Tell frontend to remove this row ---
        socketio.emit('user_deleted', {"_id": user_id})
        return jsonify({"message": "User deleted successfully"}), 200
    
    return jsonify({"error": "Failed to delete user"}), 500