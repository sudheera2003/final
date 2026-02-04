import os
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app) # Allow requests from Next.js

# Connect to MongoDB
mongo_uri = os.getenv("MONGO_URI")
client = MongoClient(mongo_uri)
db = client.get_database("final_project") # This will create the DB automatically

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "Backend is connected to MongoDB!"})

# --- CORE FEATURE: UPLOAD SALES EXCEL ---
@app.route('/api/upload-sales', methods=['POST'])
def upload_sales():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    try:
        # Read Excel using Pandas
        df = pd.read_excel(file)
        
        # REQUIRED COLUMNS CHECK
        # We expect the Excel to have 'ItemName' and 'QuantitySold'
        if not {'ItemName', 'QuantitySold'}.issubset(df.columns):
            return jsonify({"error": "Excel must have 'ItemName' and 'QuantitySold' columns"}), 400

        inventory_updates = []
        updates_log = []

        for index, row in df.iterrows():
            item_name = row['ItemName']
            qty_sold = row['QuantitySold']
            
            # Find the Product Recipe
            product = db.products.find_one({"name": item_name})
            
            if product:
                # Calculate Ingredient Usage
                recipe = product.get('recipe', [])
                for ingredient in recipe:
                    ing_id = ingredient['ingredient_id']
                    needed_per_item = ingredient['qty']
                    
                    total_deduction = -1 * (needed_per_item * qty_sold)
                    
                    # Add to bulk update list
                    inventory_updates.append(
                        UpdateOne(
                            {"_id": ing_id},
                            {"$inc": {"stock": total_deduction}}
                        )
                    )
                updates_log.append(f"Sold {qty_sold} x {item_name}")
            else:
                updates_log.append(f"Warning: Product '{item_name}' not found in database.")

        # Execute updates
        if inventory_updates:
            db.inventory.bulk_write(inventory_updates)
            return jsonify({"message": "Inventory updated successfully!", "log": updates_log})
        else:
            return jsonify({"message": "No matching products found to update.", "log": updates_log})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)