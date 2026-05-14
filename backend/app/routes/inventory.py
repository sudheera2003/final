import os
import tempfile
import pandas as pd
from app.routes.auth import requires_permission
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from pymongo import UpdateOne
from datetime import datetime
from app.extensions import db, socketio
from bson import ObjectId

inventory_bp = Blueprint('inventory', __name__)

# get all ingredients
@inventory_bp.route('', methods=['GET'], strict_slashes=False)
@jwt_required()
@requires_permission('view_inventory')
def get_inventory():
    try:
        items = list(db.inventory.find())
        for item in items:
            item['_id'] = str(item['_id'])
        return jsonify(items), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# add single ingredient
@inventory_bp.route('/', methods=['POST'], strict_slashes=False)
@jwt_required()
@requires_permission('add_inventory')
def add_ingredient():
    data = request.get_json()
    if db.inventory.find_one({"name": data.get("name")}):
        return jsonify({"error": "Ingredient already exists"}), 400

    new_item = {
        "name": data.get("name"),
        "category": data.get("category", "General"),
        "status": data.get("status", "In Stock"),
        "stock": float(data.get("stock", 0)),
        "unit": data.get("unit", "pcs"),
        "unit_price": float(data.get("unit_price", 0)),
        "supplier": data.get("supplier", "Unknown"),
        "low_stock_threshold": float(data.get("low_stock_threshold", 10)), 
        "lastUpdated": datetime.now()
    }
    
    db.inventory.insert_one(new_item)
    socketio.emit('inventory_changed', {"message": "New item added"})
    return jsonify({"message": "Ingredient added successfully"}), 201


# bulk import
@inventory_bp.route('/bulk-import', methods=['POST'])
@jwt_required()
@requires_permission('add_inventory')
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

        if not {'name', 'stock'}.issubset(df.columns):
            return jsonify({"error": "Excel must contain 'name' and 'stock' columns"}), 400

        bulk_operations = []
        for _, row in df.iterrows():
            name = str(row['name']).strip()
            added_stock = float(row['stock'])
            
            bulk_operations.append(
                UpdateOne(
                    {"name": name},
                    {
                        "$inc": {"stock": added_stock},
                        "$set": {
                            "low_stock_threshold": float(row.get('low_stock_threshold', 10)),
                            "lastUpdated": datetime.now()
                        },
                        "$setOnInsert": {
                            "category": row.get('category', 'Imported'),
                            "status": "In Stock",
                            "unit": row.get('unit', 'pcs'),
                            "unit_price": float(row.get('unit_price', 0)),
                            "supplier": row.get('supplier', 'Excel Import')
                        }
                    },
                    upsert=True
                )
            )

        if bulk_operations:
            db.inventory.bulk_write(bulk_operations)
            socketio.emit('inventory_changed', {"message": "Bulk import completed"})

        return jsonify({"message": f"Successfully processed {len(bulk_operations)} items"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
            
            
# delete ingredient
@inventory_bp.route('/<item_id>', methods=['DELETE'])
@jwt_required()
@requires_permission('delete_inventory')
def delete_ingredient(item_id):
    try:
        result = db.inventory.delete_one({"_id": item_id})
        
        if result.deleted_count == 0:
            result = db.inventory.delete_one({"_id": ObjectId(item_id)})
            
        if result.deleted_count > 0:
            socketio.emit('inventory_changed', {"message": "Item deleted"})
            return jsonify({"message": "Item deleted successfully"}), 200
        else:
            return jsonify({"error": "Item not found"}), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    
# edit ingredient
@inventory_bp.route('/<item_id>', methods=['PUT'])
@jwt_required()
@requires_permission('edit_inventory')
def update_ingredient(item_id):
    data = request.get_json()
    
    update_fields = {
        "name": data.get("name"),
        "category": data.get("category"),
        "status": data.get("status", "In Stock"),
        "stock": float(data.get("stock", 0)),
        "unit": data.get("unit"),
        "unit_price": float(data.get("unit_price", 0)),
        "supplier": data.get("supplier"),
        "low_stock_threshold": float(data.get("low_stock_threshold", 10)),
        "lastUpdated": datetime.now()
    }

    try:
        result = db.inventory.update_one({"_id": item_id}, {"$set": update_fields})
        if result.matched_count == 0:
            result = db.inventory.update_one({"_id": ObjectId(item_id)}, {"$set": update_fields})

        if result.matched_count > 0:
            socketio.emit('inventory_changed', {"message": "Item updated"})
            return jsonify({"message": "Item updated successfully"}), 200
        else:
            return jsonify({"error": "Item not found"}), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500