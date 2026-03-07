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


# --- UPDATE PROFILE ROUTE (With WebSocket & Email Update) ---
@auth_bp.route('/update-profile', methods=['PUT'])
@jwt_required()
def update_profile():
    current_email = get_jwt_identity()
    data = request.get_json()
    
    new_name = data.get('name')
    new_email = data.get('email')
    
    if not new_name or not new_email:
        return jsonify({"error": "Name and email are required"}), 400

    # If the user is trying to change their email, check if it's already taken
    if new_email != current_email:
        existing_user = db.users.find_one({"email": new_email})
        if existing_user:
            return jsonify({"error": "Email is already in use by another account"}), 400

    # Update user in DB
    result = db.users.update_one(
        {"email": current_email},
        {"$set": {"name": new_name, "email": new_email}}
    )

    # If the email changed, we need to issue a new JWT token so future requests don't fail
    new_token = None
    if new_email != current_email:
        new_token = create_access_token(identity=new_email)

    # Emit event so the Sidebar updates instantly
    socketio.emit('profile_updated', {
        'email': new_email,
        'name': new_name
    })
    
    response_data = {"message": "Profile updated successfully", "name": new_name, "email": new_email}
    if new_token:
        response_data["token"] = new_token
        
    return jsonify(response_data), 200


# --- CHANGE PASSWORD ROUTE ---
@auth_bp.route('/password', methods=['PUT'])
@jwt_required()
def change_password():
    current_email = get_jwt_identity()
    data = request.get_json()
    
    current_password = data.get('currentPassword')
    new_password = data.get('newPassword')
    
    if not current_password or not new_password:
        return jsonify({"error": "Both current and new passwords are required"}), 400
        
    user = db.users.find_one({"email": current_email})
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    # Verify the old password is correct
    if not bcrypt.check_password_hash(user['password'], current_password):
        return jsonify({"error": "Incorrect current password"}), 401
        
    # Hash the new password and save it
    hashed_password = bcrypt.generate_password_hash(new_password).decode('utf-8')
    db.users.update_one(
        {"email": current_email},
        {"$set": {"password": hashed_password}}
    )
    
    return jsonify({"message": "Password changed successfully"}), 200


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

# --- GET CURRENT LOGGED IN USER ---
@auth_bp.route('/users/me', methods=['GET'])
@jwt_required()
def get_current_user():
    current_email = get_jwt_identity()
    
    # Find the user, excluding the password field for security
    user = db.users.find_one({"email": current_email}, {"password": 0})
    
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    user['_id'] = str(user['_id']) # Convert ObjectId to string
    return jsonify(user), 200

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