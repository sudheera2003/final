import os
import uuid # <-- NEW: Used to generate unique IDs for new chats
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from datetime import datetime, timedelta
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

chat_bp = Blueprint('chat', __name__)

gemini_api_key = os.getenv("GEMINI_API_KEY")
if gemini_api_key:
    genai.configure(api_key=gemini_api_key)

# ─── 1. NEW: GET ALL CHAT SESSIONS FOR SIDEBAR ─────────────────────────────────
@chat_bp.route('/sessions', methods=['GET'])
@jwt_required()
def get_sessions():
    try:
        current_user_email = get_jwt_identity()
        
        # Aggregate MongoDB to group messages by session_id to build the sidebar list
        pipeline = [
            # Only match messages from this user that HAVE a session_id
            {"$match": {"user_email": current_user_email, "sender": "user", "session_id": {"$exists": True}}},
            {"$sort": {"timestamp": 1}}, # Oldest first so we can grab the first message as the title
            {"$group": {
                "_id": "$session_id",
                "title": {"$first": "$text"}, # Use their first message as the chat title
                "last_updated": {"$last": "$timestamp"}
            }},
            {"$sort": {"last_updated": -1}} # Newest chats at the top of the sidebar
        ]
        
        sessions = list(db.chat_history.aggregate(pipeline))
        
        # Format the data cleanly for the frontend
        formatted_sessions = []
        for s in sessions:
            title = s['title']
            # Truncate title if it's too long
            short_title = title[:30] + '...' if len(title) > 30 else title
            formatted_sessions.append({
                "id": s["_id"],
                "title": short_title,
                "updated_at": s["last_updated"].isoformat() if s["last_updated"] else None
            })
            
        return jsonify(formatted_sessions), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── 2. UPDATED: GET HISTORY FOR A SPECIFIC SESSION ────────────────────────────
@chat_bp.route('/history/<session_id>', methods=['GET'])
@jwt_required()
def get_history(session_id):
    try:
        current_user_email = get_jwt_identity()
        
        # Find messages only for this specific chat thread
        history_cursor = db.chat_history.find(
            {"user_email": current_user_email, "session_id": session_id}, 
            {"_id": 0}
        ).sort("timestamp", 1)
        
        return jsonify(list(history_cursor)), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── 3. NEW: DELETE A CHAT SESSION ─────────────────────────────────────────────
@chat_bp.route('/<session_id>', methods=['DELETE'])
@jwt_required()
def delete_session(session_id):
    try:
        current_user_email = get_jwt_identity()
        # Delete all messages associated with this session
        db.chat_history.delete_many({"user_email": current_user_email, "session_id": session_id})
        return jsonify({"message": "Chat deleted successfully."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── 4. UPDATED: LIVE CHAT ROUTE (NOW HANDLES SESSION IDs) ─────────────────────
@chat_bp.route('', methods=['POST'], strict_slashes=False)
@jwt_required()
def chat_with_ai():
    try:
        current_user_email = get_jwt_identity()
        data = request.get_json()
        user_message = data.get("message")
        session_id = data.get("session_id") # <-- Check if frontend sent an ID

        if not user_message:
            return jsonify({"error": "Message is required"}), 400

        # If this is a brand new chat, generate a new unique ID!
        if not session_id:
            session_id = str(uuid.uuid4())

        # Save User Message with Session ID
        db.chat_history.insert_one({
            "user_email": current_user_email,
            "session_id": session_id,
            "sender": "user",
            "text": user_message,
            "timestamp": datetime.now()
        })
            
        current_key = os.getenv("GEMINI_API_KEY")
        if not current_key:
            return jsonify({"error": "AI configuration missing."}), 500

        # GATHER LIVE MONGODB CONTEXT
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

        full_prompt = f"""
        System: You are 'RestoAI', the management assistant for Lady Hill Hotel. 
        Use LKR for currency. Use Markdown formatting. Keep answers concise.
        
        Current Data:
        - Low Stock: {low_stock_text}
        - 7-Day Revenue: LKR {total_7d_revenue:,.2f}
        - Top Items: {top_items_text}
        
        User Question: {user_message}
        """

        genai.configure(api_key=current_key)
        available_models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest']
        
        ai_reply = None
        for model_name in available_models:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(full_prompt)
                if response and hasattr(response, 'text'):
                    ai_reply = response.text
                    break 
            except Exception as e:
                continue 

        if ai_reply:
            # Save AI Response with Session ID
            db.chat_history.insert_one({
                "user_email": current_user_email,
                "session_id": session_id,
                "sender": "ai",
                "text": ai_reply,
                "timestamp": datetime.now()
            })
            
            # <-- Return the session_id back to the frontend so it knows what chat it is in!
            return jsonify({"reply": ai_reply, "session_id": session_id}), 200
        else:
            return jsonify({"error": "AI models unavailable."}), 500

    except Exception as e:
        return jsonify({"error": "Failed to communicate with AI."}), 500