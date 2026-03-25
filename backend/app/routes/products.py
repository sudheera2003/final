from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from bson import ObjectId
from datetime import datetime
from app.extensions import db, socketio
import os
import tempfile
import pandas as pd
from pymongo import UpdateOne

# --- IMPORT THE PERMISSION DECORATOR ---
from app.routes.auth import requires_permission

products_bp = Blueprint('products', __name__)

# 1. GET ALL PRODUCTS
@products_bp.route('/', methods=['GET'], strict_slashes=False)
@jwt_required()
@requires_permission('view_products') # <-- Locked: View Only
def get_products():
    try:
        items = list(db.products.find())
        for item in items:
            item['_id'] = str(item['_id'])
        return jsonify(items), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 2. ADD PRODUCT & RECIPE
@products_bp.route('/', methods=['POST'], strict_slashes=False)
@jwt_required()
@requires_permission('add_products') # <-- Locked: Add Only
def add_product():
    data = request.get_json()
    
    if db.products.find_one({"name": data.get("name")}):
        return jsonify({"error": "Product already exists"}), 400

    new_product = {
        "name": data.get("name"),
        "category": data.get("category", "General"),
        "price": float(data.get("price", 0)),
        "recipe": data.get("recipe", []), # This holds the ingredients!
        "lastUpdated": datetime.now()
    }
    
    db.products.insert_one(new_product)
    socketio.emit('products_changed', {"message": "New product added"})
    return jsonify({"message": "Product added successfully"}), 201

# 3. UPDATE PRODUCT
@products_bp.route('/<product_id>', methods=['PUT'])
@jwt_required()
@requires_permission('edit_products') # <-- Locked: Edit Only
def update_product(product_id):
    data = request.get_json()
    
    update_fields = {
        "name": data.get("name"),
        "category": data.get("category"),
        "price": float(data.get("price", 0)),
        "recipe": data.get("recipe", []),
        "lastUpdated": datetime.now()
    }

    try:
        result = db.products.update_one({"_id": product_id}, {"$set": update_fields})
        if result.matched_count == 0:
            result = db.products.update_one({"_id": ObjectId(product_id)}, {"$set": update_fields})

        if result.matched_count > 0:
            socketio.emit('products_changed', {"message": "Product updated"})
            return jsonify({"message": "Product updated successfully"}), 200
        else:
            return jsonify({"error": "Product not found"}), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 4. DELETE PRODUCT
@products_bp.route('/<product_id>', methods=['DELETE'])
@jwt_required()
@requires_permission('delete_products') # <-- Locked: Delete Only
def delete_product(product_id):
    try:
        result = db.products.delete_one({"_id": product_id})
        if result.deleted_count == 0:
            result = db.products.delete_one({"_id": ObjectId(product_id)})
            
        if result.deleted_count > 0:
            socketio.emit('products_changed', {"message": "Product deleted"})
            return jsonify({"message": "Product deleted successfully"}), 200
        else:
            return jsonify({"error": "Product not found"}), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    
# 5. BULK IMPORT PRODUCTS & RECIPES VIA EXCEL
@products_bp.route('/bulk-import', methods=['POST'])
@jwt_required()
@requires_permission('add_products') # <-- Locked: Bulk Add
def bulk_import():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as temp:
            file.save(temp.name)
            temp_path = temp.name

        df = pd.read_excel(temp_path)
        df.columns = df.columns.str.strip().str.lower()

        # Check required columns
        required_cols = {'product_name', 'category', 'price', 'ingredient_name', 'qty'}
        if not required_cols.issubset(df.columns):
            return jsonify({"error": f"Missing columns. Required: {', '.join(required_cols)}"}), 400

        bulk_operations = []
        
        # Group the excel rows by product_name so we can build the recipe array
        grouped = df.groupby('product_name')

        for product_name, group in grouped:
            product_name = str(product_name).strip()
            category = str(group.iloc[0]['category']).strip()
            price = float(group.iloc[0]['price'])
            
            recipe = []
            
            # Loop through the rows for this specific product to get ingredients
            for _, row in group.iterrows():
                ing_name = str(row['ingredient_name']).strip()
                qty = float(row['qty'])
                
                # Look up the ingredient in the inventory collection by name (case-insensitive)
                inv_item = db.inventory.find_one({"name": {"$regex": f"^{ing_name}$", "$options": "i"}})
                
                if inv_item:
                    recipe.append({
                        "ingredient_id": str(inv_item['_id']),
                        "qty": qty
                    })
                # If ingredient isn't in inventory, we just skip it for now to avoid crashes
            
            # Upsert Product (Create if new, update if exists)
            bulk_operations.append(
                UpdateOne(
                    {"name": product_name},
                    {
                        "$set": {
                            "category": category,
                            "price": price,
                            "recipe": recipe,
                            "lastUpdated": datetime.now()
                        }
                    },
                    upsert=True
                )
            )

        if bulk_operations:
            db.products.bulk_write(bulk_operations)
            socketio.emit('products_changed', {"message": "Bulk import completed"})

        return jsonify({"message": f"Successfully processed {len(bulk_operations)} products"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)