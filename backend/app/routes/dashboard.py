from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/dashboard-stats', methods=['GET'])
# @jwt_required() # Uncomment this once your frontend sends tokens!
def get_dashboard_stats():
    try:
        # 1. Revenue
        pipeline = [{"$group": {"_id": None, "totalRevenue": {"$sum": "$revenue"}}}]
        revenue_result = list(db.sales.aggregate(pipeline))
        total_revenue = revenue_result[0]['totalRevenue'] if revenue_result else 0

        # 2. Low Stock (Assuming items < 20 are low)
        low_stock_count = db.inventory.count_documents({"stock": {"$lt": 20}})
        
        # 3. Active Items
        active_items = db.inventory.count_documents({})

        return jsonify({
            "revenue": total_revenue,
            "low_stock": low_stock_count,
            "active_items": active_items
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500