from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt, verify_jwt_in_request
from app.extensions import db, bcrypt, socketio
from bson import ObjectId
from functools import wraps

auth_bp = Blueprint('auth', __name__)

# --- PERMISSION DECORATOR ---
def requires_permission(target_permission):
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            # 1. THE FIX: Catch the CORS Preflight and instantly approve it
            if request.method == "OPTIONS":
                return jsonify({}), 200

            # 2. Authenticate the user
            verify_jwt_in_request() 
            claims = get_jwt()
            user_permissions = claims.get("permissions", [])
            
            # 3. Check for the specific permission in their "Key Ring"
            if target_permission not in user_permissions:
                return jsonify({
                    "error": f"Access denied. You need the '{target_permission}' permission."
                }), 403
                
            return fn(*args, **kwargs)
        return decorator
    return wrapper


# --- LOGIN ROUTE ---
@auth_bp.route('/login', methods=['POST', 'OPTIONS'], strict_slashes=False)
def login():
    if request.method == "OPTIONS":
        return jsonify({}), 200
        
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = db.users.find_one({"email": email})

    if user and bcrypt.check_password_hash(user['password'], password):
        user_role_name = user.get("role", "user")
        
        role_data = db.roles.find_one({"role_name": user_role_name})
        permissions = role_data.get("permissions", []) if role_data else []

        access_token = create_access_token(
            identity=email,
            additional_claims={
                "role": user_role_name,
                "permissions": permissions 
            }
        )
        
        return jsonify({
            "token": access_token, 
            "email": email,
            "name": user.get("name", "User"),
            "role": user_role_name,
            "permissions": permissions 
        }), 200
    
    return jsonify({"error": "Invalid credentials"}), 401


# --- GET AVAILABLE ROLES ---
@auth_bp.route('/roles', methods=['GET'])
@jwt_required()
def get_roles():
    claims = get_jwt()
    current_role = claims.get('role', 'user')

    available_roles = [
        {"value": "admin", "label": "Admin"},
        {"value": "user", "label": "Staff (Normal User)"}
    ]

    if current_role == 'super_admin':
        available_roles.insert(0, {"value": "super_admin", "label": "Super Admin"})

    return jsonify(available_roles), 200


# --- REGISTER / ADD USER ROUTE ---
@auth_bp.route('/register', methods=['POST', 'OPTIONS'], strict_slashes=False)
@requires_permission('user_management') # (No need for @jwt_required here anymore!)
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    name = data.get('name', 'New User')
    role = data.get('role', 'user')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    if db.users.find_one({"email": email}):
        return jsonify({"error": "User already exists"}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    
    result = db.users.insert_one({
        "email": email, 
        "password": hashed_password,
        "name": name,
        "role": role
    })

    socketio.emit('user_created', {
        "_id": str(result.inserted_id),
        "name": name,
        "email": email,
        "role": role
    })

    return jsonify({"message": "User created successfully"}), 201


# --- DELETE USER ROUTE ---
@auth_bp.route('/users/<user_id>', methods=['DELETE', 'OPTIONS'], strict_slashes=False)
@requires_permission('user_management')
def delete_user(user_id):
    current_email = get_jwt_identity()
    claims = get_jwt()
    current_role = claims.get('role')
    
    user_to_delete = db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user_to_delete:
        return jsonify({"error": "User not found"}), 404

    if user_to_delete['email'] == current_email:
         return jsonify({"error": "You cannot delete your own account."}), 403
         
    if user_to_delete.get('role') == 'super_admin' and current_role != 'super_admin':
        return jsonify({"error": "You do not have permission to delete a Super Admin."}), 403

    result = db.users.delete_one({"_id": ObjectId(user_id)})
    
    if result.deleted_count > 0:
        socketio.emit('user_deleted', {"_id": user_id})
        return jsonify({"message": "User deleted successfully"}), 200
    
    return jsonify({"error": "Failed to delete user"}), 500


# --- GET ALL USERS ---
@auth_bp.route('/users', methods=['GET', 'OPTIONS'], strict_slashes=False)
@jwt_required()
def get_users():
    if request.method == "OPTIONS":
        return jsonify({}), 200
        
    users = list(db.users.find({}, {"password": 0}))
    for user in users:
        user['_id'] = str(user['_id'])
    return jsonify(users), 200


# --- GET CURRENT LOGGED IN USER ---
@auth_bp.route('/users/me', methods=['GET'])
@jwt_required()
def get_current_user():
    current_email = get_jwt_identity()
    user = db.users.find_one({"email": current_email}, {"password": 0})
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    user['_id'] = str(user['_id'])
    return jsonify(user), 200


# --- UPDATE PROFILE ROUTE ---
@auth_bp.route('/update-profile', methods=['PUT', 'OPTIONS'], strict_slashes=False)
@jwt_required()
def update_profile():
    if request.method == "OPTIONS":
        return jsonify({}), 200
        
    current_email = get_jwt_identity()
    data = request.get_json()
    new_name = data.get('name')
    new_email = data.get('email')
    
    if not new_name or not new_email:
        return jsonify({"error": "Name and email are required"}), 400

    if new_email != current_email:
        existing_user = db.users.find_one({"email": new_email})
        if existing_user:
            return jsonify({"error": "Email is already in use by another account"}), 400

    db.users.update_one(
        {"email": current_email},
        {"$set": {"name": new_name, "email": new_email}}
    )

    new_token = None
    if new_email != current_email:
        claims = get_jwt()
        new_token = create_access_token(identity=new_email, additional_claims={"role": claims.get("role")})

    socketio.emit('profile_updated', {'email': new_email, 'name': new_name})
    
    response_data = {"message": "Profile updated successfully", "name": new_name, "email": new_email}
    if new_token:
        response_data["token"] = new_token
        
    return jsonify(response_data), 200


# --- CHANGE PASSWORD ROUTE ---
@auth_bp.route('/password', methods=['PUT', 'OPTIONS'], strict_slashes=False)
@jwt_required()
def change_password():
    if request.method == "OPTIONS":
        return jsonify({}), 200
        
    current_email = get_jwt_identity()
    data = request.get_json()
    
    current_password = data.get('currentPassword')
    new_password = data.get('newPassword')
    
    if not current_password or not new_password:
        return jsonify({"error": "Both current and new passwords are required"}), 400
        
    user = db.users.find_one({"email": current_email})
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    if not bcrypt.check_password_hash(user['password'], current_password):
        return jsonify({"error": "Incorrect current password"}), 401
        
    hashed_password = bcrypt.generate_password_hash(new_password).decode('utf-8')
    db.users.update_one(
        {"email": current_email},
        {"$set": {"password": hashed_password}}
    )
    
    return jsonify({"message": "Password changed successfully"}), 200


# --- UPDATE ROLE PERMISSIONS ---
@auth_bp.route('/roles/<role_name>/permissions', methods=['PUT', 'OPTIONS'], strict_slashes=False)
@requires_permission('manage_roles')
def update_role_permissions(role_name):
    data = request.get_json()
    new_permissions = data.get('permissions')

    if not isinstance(new_permissions, list):
        return jsonify({"error": "Permissions must be a list"}), 400

    result = db.roles.update_one(
        {"role_name": role_name},
        {"$set": {"permissions": new_permissions}}
    )

    if result.matched_count > 0:
        return jsonify({"message": f"Permissions for {role_name} updated successfully"}), 200
    
    return jsonify({"error": "Role not found"}), 404


# --- FETCH ALL ROLES AND PERMISSIONS ---
@auth_bp.route('/roles_full', methods=['GET', 'OPTIONS'], strict_slashes=False)
@requires_permission('manage_roles')
def get_roles_full():
    roles = list(db.roles.find({}, {"_id": 0}))
    return jsonify(roles), 200


# --- FETCH DYNAMIC PERMISSIONS BLUEPRINT ---
@auth_bp.route('/permissions_blueprint', methods=['GET', 'OPTIONS'], strict_slashes=False)
@requires_permission('manage_roles')
def get_permissions_blueprint():
    perms = list(db.permissions.find({}, {"_id": 0}))
    return jsonify(perms), 200