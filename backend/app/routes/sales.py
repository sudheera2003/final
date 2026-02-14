from flask import Blueprint, request, jsonify
from pymongo import UpdateOne
from datetime import datetime
import pandas as pd
from app.extensions import db, socketio

sales_bp = Blueprint('sales', __name__)

@sales_bp.route('/upload-sales', methods=['POST'])
def upload_sales():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    try:
        # Read Excel
        df = pd.read_excel(file)
        df.columns = df.columns.str.strip().str.lower()
        
        # Validation
        if not {'itemname', 'quantitysold'}.issubset(df.columns):
            return jsonify({"error": "Excel must have columns: itemname, quantitysold"}), 400

        inventory_updates = []
        sales_records = []
        updates_log = []

        # Process Rows
        for index, row in df.iterrows():
            item_name = row['itemname']
            qty_sold = row['quantitysold']
            
            product = db.products.find_one({"name": item_name})
            
            if product:
                # Deduct Inventory
                recipe = product.get('recipe', [])
                for ingredient in recipe:
                    ing_id = ingredient['ingredient_id']
                    needed = ingredient['qty']
                    inventory_updates.append(
                        UpdateOne({"_id": ing_id}, {"$inc": {"stock": -1 * (needed * qty_sold)}})
                    )
                
                # Record Sale
                sales_records.append({
                    "item_name": item_name,
                    "quantity": qty_sold,
                    "revenue": product.get('price', 0) * qty_sold,
                    "date": datetime.now()
                })
                updates_log.append(f"Sold {qty_sold} x {item_name}")

        # Execute DB Updates
        if inventory_updates:
            db.inventory.bulk_write(inventory_updates)
        if sales_records:
            db.sales.insert_many(sales_records)

        # Notify Frontend via SocketIO
        socketio.emit('inventory_update', {
            'message': 'New sales data processed', 
            'sales_count': len(sales_records)
        })

        return jsonify({"message": "Success", "log": updates_log})

    except Exception as e:
        return jsonify({"error": str(e)}), 500