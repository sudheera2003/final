import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from datetime import datetime, timedelta
import google.generativeai as genai
from dotenv import load_dotenv

# Force Python to read the .env file right now
load_dotenv()

chat_bp = Blueprint('chat', __name__)

# Explicitly grab the key and configure Gemini
gemini_api_key = os.getenv("GEMINI_API_KEY")
if gemini_api_key:
    genai.configure(api_key=gemini_api_key)

@chat_bp.route('', methods=['POST'], strict_slashes=False)
@jwt_required()
def chat_with_ai():
    try:
        data = request.get_json()
        user_message = data.get("message")

        if not user_message:
            return jsonify({"error": "Message is required"}), 400
            
        # Re-fetch the key inside the route to be 100% sure it's loaded
        current_key = os.getenv("GEMINI_API_KEY")
        if not current_key:
            return jsonify({"error": "AI configuration missing."}), 500

        # ATHER LIVE MONGODB CONTEXT (Same logic)
        low_stock_cursor = db.inventory.find({"$expr": {"$lte": ["$stock", "$low_stock_threshold"]}})
        low_stock_items = [f"{item['name']} ({item['stock']} {item.get('unit', 'units')} left)" for item in low_stock_cursor]
        low_stock_text = ", ".join(low_stock_items) if low_stock_items else "All inventory levels are healthy."

        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        pipeline = [
            {"$match": {"timestamp": {"$gte": start_date, "$lte": end_date}}},
            {"$group": {"_id": "$product_name", "total_sold": {"$sum": "$quantity"}, "revenue": {"$sum": "$total_price"}}},
            {"$sort": {"total_sold": -1}}
        ]
        recent_sales = list(db.sales.aggregate(pipeline))
        total_7d_revenue = sum(item["revenue"] for item in recent_sales)
        top_3_items = [f"{item['_id']} ({item['total_sold']} sold)" for item in recent_sales[:3]]
        top_items_text = ", ".join(top_3_items) if top_3_items else "No recent sales."

        # CONSTRUCT THE PROMPT
        # We combine system instructions and context into one clear prompt for the 'Flash' model
        full_prompt = f"""
        System: You are 'RestoAI', the management assistant for Lady Hill Hotel, Galle. 
        Use LKR for currency. Use Markdown formatting.
        
        Current Data:
        - Low Stock: {low_stock_text}
        - 7-Day Revenue: LKR {total_7d_revenue:,.2f}
        - Top Items: {top_items_text}
        
        User Question: {user_message}
        """

        # EXECUTE WITH STABLE CONFIG
        genai.configure(api_key=current_key)
        
        # Try a few different model variations to find the one available in your region
        available_models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest']
        
        ai_reply = None
        for model_name in available_models:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(full_prompt)
                if response and hasattr(response, 'text'):
                    ai_reply = response.text
                    break # Success! Exit the loop
            except Exception as e:
                print(f"Model {model_name} failed: {e}")
                continue # Try the next model in the list

        if ai_reply:
            return jsonify({"reply": ai_reply}), 200
        else:
            return jsonify({"error": "None of the AI models were available in your region."}), 500

    except Exception as e:
        # This will print the SPECIFIC Google error in your terminal
        print(f"--- GEMINI SYSTEM ERROR ---")
        print(str(e)) 
        return jsonify({"error": "Failed to communicate with AI."}), 500