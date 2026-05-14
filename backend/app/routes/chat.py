import os
import uuid
import logging
import traceback
import pandas as pd
from prophet import Prophet
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from datetime import datetime, timedelta
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

logging.getLogger("cmdstanpy").setLevel(logging.WARNING)

chat_bp = Blueprint('chat', __name__)

gemini_api_key = os.getenv("GEMINI_API_KEY")
if gemini_api_key:
    genai.configure(api_key=gemini_api_key)

# get all chat sessions
@chat_bp.route('/sessions', methods=['GET', 'OPTIONS'], strict_slashes=False)
@jwt_required()
def get_sessions():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    try:
        current_user_email = get_jwt_identity()
        pipeline = [
            {"$match": {"user_email": current_user_email, "sender": "user", "session_id": {"$exists": True}}},
            {"$sort": {"timestamp": 1}}, 
            {"$group": {
                "_id": "$session_id",
                "title": {"$first": "$text"}, 
                "last_updated": {"$last": "$timestamp"}
            }},
            {"$sort": {"last_updated": -1}} 
        ]
        sessions = list(db.chat_history.aggregate(pipeline))
        formatted_sessions = []
        for s in sessions:
            title = s['title']
            formatted_sessions.append({
                "id": s["_id"],
                "title": title[:30] + '...' if len(title) > 30 else title,
                "updated_at": s["last_updated"].isoformat() if s["last_updated"] else None
            })
        return jsonify(formatted_sessions), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# set history for selected session
@chat_bp.route('/history/<session_id>', methods=['GET', 'OPTIONS'], strict_slashes=False)
@jwt_required()
def get_history(session_id):
    if request.method == "OPTIONS":
        return jsonify({}), 200
    try:
        current_user_email = get_jwt_identity()
        history_cursor = db.chat_history.find(
            {"user_email": current_user_email, "session_id": session_id}, 
            {"_id": 0}
        ).sort("timestamp", 1)
        return jsonify(list(history_cursor)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# delete chat
@chat_bp.route('/<session_id>', methods=['DELETE', 'OPTIONS'], strict_slashes=False)
@jwt_required()
def delete_session(session_id):
    if request.method == "OPTIONS":
        return jsonify({}), 200
    try:
        current_user_email = get_jwt_identity()
        db.chat_history.delete_many({"user_email": current_user_email, "session_id": session_id})
        return jsonify({"message": "Chat deleted successfully."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# live chat route
@chat_bp.route('', methods=['POST', 'OPTIONS'], strict_slashes=False)
@jwt_required()
def chat_with_ai():
    if request.method == "OPTIONS":
        return jsonify({}), 200
        
    try:
        current_user_email = get_jwt_identity()
        data = request.get_json()
        user_message = data.get("message")
        session_id = data.get("session_id")

        if not user_message:
            return jsonify({"error": "Message is required"}), 400

        if not session_id:
            session_id = str(uuid.uuid4())

        db.chat_history.insert_one({
            "user_email": current_user_email,
            "session_id": session_id,
            "sender": "user",
            "text": user_message,
            "timestamp": datetime.now()
        })
            
        current_key = os.getenv("GEMINI_API_KEY")
        if not current_key:
            print(" ERROR: Gemini API key is missing from .env")
            return jsonify({"error": "AI configuration missing."}), 500

        print(f" Processing chat for: {user_message[:50]}...")

        # get live inventory
        low_stock_items = []
        for item in db.inventory.find():
            stock = float(item.get('stock', 0))
            threshold = float(item.get('low_stock_threshold', 10))
            if stock <= threshold:
                low_stock_items.append(f"{item.get('name', 'Unknown')} ({stock} {item.get('unit', 'units')} left)")
        
        low_stock_text = ", ".join(low_stock_items) if low_stock_items else "All inventory levels are healthy."

        # get sales data
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

        # get tomorrow forecast
        tomorrow_forecast_text = "Forecast unavailable."
        try:
            sales_cursor = db.sales.find({}, {"timestamp": 1, "total_price": 1})
            df = pd.DataFrame(list(sales_cursor))
            if not df.empty:
                df['timestamp'] = pd.to_datetime(df['timestamp']).dt.date
                daily_data = df.groupby('timestamp')['total_price'].sum().reset_index()
                
                prophet_df = daily_data.rename(columns={'timestamp': 'ds', daily_data.columns[1]: 'y'})
                m = Prophet(yearly_seasonality=False, daily_seasonality=False, weekly_seasonality=True)
                m.fit(prophet_df)
                
                future = m.make_future_dataframe(periods=7)
                forecast = m.predict(future)
                
                tomorrow_date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
                tomorrow_row = forecast[forecast['ds'].dt.strftime('%Y-%m-%d') == tomorrow_date]
                
                if not tomorrow_row.empty:
                    tomorrow_predicted_val = max(0, round(tomorrow_row.iloc[0]['yhat'], 2))
                    tomorrow_forecast_text = f"LKR {tomorrow_predicted_val:,.2f}"
        except Exception as e:
            print(" Warning: Prophet ML failed inside chat route:", str(e))

        # inject into gemini
        full_prompt = f"""
        System: You are 'RestoAI', the management assistant for Lady Hill Hotel. 
        Use LKR for currency. Use Markdown formatting. Keep answers concise.
        
        Current Live Data:
        - Low Stock Alerts: {low_stock_text}
        - 7-Day Revenue: LKR {total_7d_revenue:,.2f}
        - Top Selling Items (7 Days): {top_items_text}
        - Tomorrow's Machine Learning Forecast (Prophet): {tomorrow_forecast_text}
        
        CRITICAL INSTRUCTION: If the user asks for tomorrow's forecast, expected revenue, or sales predictions, you MUST use the exact Machine Learning Forecast provided above. Do NOT calculate your own averages.
        
        User Question: {user_message}
        """

        genai.configure(api_key=current_key)
        available_models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest']
        
        ai_reply = None
        for model_name in available_models:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(full_prompt)
                if response and hasattr(response, 'text'):
                    ai_reply = response.text
                    print(f"Success using model: {model_name}")
                    break 
            except Exception as e:
                print(f" Gemini model {model_name} failed: {e}")
                continue 

        if ai_reply:
            db.chat_history.insert_one({
                "user_email": current_user_email,
                "session_id": session_id,
                "sender": "ai",
                "text": ai_reply,
                "timestamp": datetime.now()
            })
            return jsonify({"reply": ai_reply, "session_id": session_id}), 200
        else:
            print("error: All gemini AI models failed to respond.")
            return jsonify({"error": "AI models unavailable."}), 500

    except Exception as e:
        print("\n critical chat error:")
        traceback.print_exc() # Prints the exact line number of the crash
        return jsonify({"error": f"Backend error: {str(e)}"}), 500