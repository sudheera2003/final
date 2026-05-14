from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db

# import permission decorator
from app.routes.auth import requires_permission

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/dashboard-stats', methods=['GET'])
@jwt_required()
@requires_permission('view_dashboard')
def get_dashboard_stats():
    try:
        # revenue
        pipeline = [{"$group": {"_id": None, "totalRevenue": {"$sum": "$total_price"}}}]
        revenue_result = list(db.sales.aggregate(pipeline))
        total_revenue = revenue_result[0]['totalRevenue'] if revenue_result else 0

        # low stock
        low_stock_count = db.inventory.count_documents({
            "$expr": {"$lte": ["$stock", "$low_stock_threshold"]}
        })
        
        # active items
        active_items = db.inventory.count_documents({})

        return jsonify({
            "revenue": total_revenue,
            "low_stock": low_stock_count,
            "active_items": active_items
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500