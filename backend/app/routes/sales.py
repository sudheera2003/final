import os
import tempfile
import pandas as pd
from flask import Blueprint, request, jsonify
from pymongo import UpdateOne
from datetime import datetime
from app.extensions import db, socketio

sales_bp = Blueprint('sales', __name__)

@sales_bp.route('/upload-sales', methods=['POST'])
def upload_sales():
    # 1. Basic Validation
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    temp_path = None # To track the file for cleanup

    try:
        # 2. Save to a Temporary File (Safe for Hosted Apps)
        # We create a temp file so pandas can read it reliably without RAM issues
        with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as temp:
            file.save(temp.name)
            temp_path = temp.name

        # 3. Read Excel using the Temp File Path
        df = pd.read_excel(temp_path)
        
        # Clean column names (remove spaces, convert to lowercase)
        df.columns = df.columns.str.strip().str.lower()
        
        # Column Validation
        required_columns = {'itemname', 'quantitysold'}
        if not required_columns.issubset(df.columns):
            return jsonify({
                "error": f"Excel must contain columns: {', '.join(required_columns)}"
            }), 400

        inventory_updates = []
        sales_records = []
        updates_log = []

        # 4. Process Rows
        for index, row in df.iterrows():
            item_name = row['itemname']
            qty_sold = row['quantitysold']
            
            # Find the product to get its recipe
            product = db.products.find_one({"name": item_name})
            
            if product:
                # --- A. Prepare Inventory Deductions ---
                recipe = product.get('recipe', [])
                for ingredient in recipe:
                    ing_id = ingredient.get('ingredient_id')
                    needed_per_unit = ingredient.get('qty', 0)
                    
                    if ing_id:
                        total_needed = needed_per_unit * qty_sold
                        
                        # Add to the Bulk Write list (much faster than individual updates)
                        inventory_updates.append(
                            UpdateOne(
                                {"_id": ing_id}, 
                                {"$inc": {"stock": -1 * total_needed}}
                            )
                        )
                
                # --- B. Record the Sale ---
                sales_records.append({
                    "item_name": item_name,
                    "quantity": qty_sold,
                    "revenue": product.get('price', 0) * qty_sold,
                    "date": datetime.now()
                })
                updates_log.append(f"Sold {qty_sold} x {item_name}")
            else:
                updates_log.append(f"Skipped {item_name} (Not found in database)")

        # 5. Execute Database Updates
        if inventory_updates:
            db.inventory.bulk_write(inventory_updates)
            
        if sales_records:
            db.sales.insert_many(sales_records)

        # 6. Notify Frontend via SocketIO
        # This updates your Dashboard charts and Inventory table instantly!
        socketio.emit('inventory_update', {
            'message': 'New sales data processed', 
            'sales_count': len(sales_records),
            'timestamp': datetime.now().isoformat()
        })

        return jsonify({
            "message": "Success", 
            "processed": len(sales_records),
            "log": updates_log
        })

    except Exception as e:
        print(f"Error processing sales: {e}")
        return jsonify({"error": f"Processing failed: {str(e)}"}), 500

    finally:
        # 7. CLEANUP: Delete the temp file from the server
        # This is crucial for Render/Heroku to avoid filling up disk space
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)