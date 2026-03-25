import os
import tempfile
import pandas as pd
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from bson import ObjectId
from datetime import datetime
from pymongo import UpdateOne
from app.extensions import db, socketio

# --- IMPORT THE PERMISSION DECORATOR ---
from app.routes.auth import requires_permission

sales_bp = Blueprint('sales', __name__)

# 1. GET ALL SALES (For the Data Table)
@sales_bp.route('/', methods=['GET'], strict_slashes=False)
@jwt_required()
@requires_permission('view_sales') # <-- Locked: View Only
def get_sales():
    try:
        # Sort by newest first
        sales = list(db.sales.find().sort("timestamp", -1))
        for sale in sales:
            sale['_id'] = str(sale['_id'])
            sale['product_id'] = str(sale.get('product_id', ''))
        return jsonify(sales), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 2. RECORD A SINGLE SALE (The Mini-POS)
@sales_bp.route('/', methods=['POST'], strict_slashes=False)
@jwt_required()
@requires_permission('view_sales') # <-- Using 'view_sales' here as per your initial hierarchy, though 'record_sales' might be better long-term!
def record_sale():
    data = request.get_json()
    product_id = data.get("product_id")
    quantity_sold = int(data.get("quantity", 1))

    try:
        # Check for ObjectId or String ID
        try:
            product = db.products.find_one({"_id": ObjectId(product_id)})
        except:
            product = db.products.find_one({"_id": product_id})

        if not product:
            return jsonify({"error": "Product not found"}), 404

        # Calculate Revenue
        total_price = float(product.get("price", 0)) * quantity_sold

        # Record Transaction
        new_sale = {
            "product_id": str(product["_id"]),
            "product_name": product.get("name"),
            "category": product.get("category"),
            "quantity": quantity_sold,
            "total_price": total_price,
            "timestamp": datetime.now()
        }
        db.sales.insert_one(new_sale)

        # THE MAGIC: Deduct from Inventory
        recipe = product.get("recipe", [])
        for item in recipe:
            ing_id = item.get("ingredient_id")
            qty_per_item = float(item.get("qty", 0))
            total_deduction = qty_per_item * quantity_sold

            # Deduct the stock
            try:
                db.inventory.update_one({"_id": ObjectId(ing_id)}, {"$inc": {"stock": -total_deduction}})
            except:
                db.inventory.update_one({"_id": ing_id}, {"$inc": {"stock": -total_deduction}})

        # Fire WebSockets to update UI instantly without refresh
        socketio.emit('sales_changed', {"message": "New sale recorded"})
        socketio.emit('inventory_changed', {"message": "Inventory deducted from sale"})

        return jsonify({"message": "Sale recorded and inventory updated!"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# 3. BULK UPLOAD SALES (End-of-day Excel File)
@sales_bp.route('/bulk-import', methods=['POST'])
@jwt_required()
@requires_permission('view_sales') # <-- Using 'view_sales' here too.
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

        if not {'product_name', 'quantity'}.issubset(df.columns):
            return jsonify({"error": "Missing columns. Required: product_name, quantity"}), 400

        sales_to_insert = []
        inventory_operations = []

        for _, row in df.iterrows():
            product_name = str(row['product_name']).strip()
            quantity = int(row['quantity'])

            # Look up product by name
            product = db.products.find_one({"name": {"$regex": f"^{product_name}$", "$options": "i"}})
            if not product:
                continue # Skip if product is misspelled in Excel

            total_price = float(product.get("price", 0)) * quantity

            sales_to_insert.append({
                "product_id": str(product["_id"]),
                "product_name": product.get("name"),
                "category": product.get("category"),
                "quantity": quantity,
                "total_price": total_price,
                "timestamp": datetime.now()
            })

            # Prepare inventory deductions
            for item in product.get("recipe", []):
                ing_id = item.get("ingredient_id")
                deduction = float(item.get("qty", 0)) * quantity
                
                try:
                    inventory_operations.append(UpdateOne({"_id": ObjectId(ing_id)}, {"$inc": {"stock": -deduction}}))
                except:
                    inventory_operations.append(UpdateOne({"_id": ing_id}, {"$inc": {"stock": -deduction}}))

        # Execute all updates at once for speed
        if sales_to_insert:
            db.sales.insert_many(sales_to_insert)
        if inventory_operations:
            db.inventory.bulk_write(inventory_operations, ordered=False)

        socketio.emit('sales_changed', {"message": "Bulk sales imported"})
        socketio.emit('inventory_changed', {"message": "Inventory updated from bulk sales"})

        return jsonify({"message": f"Successfully processed {len(sales_to_insert)} sales"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)