import logging
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
import pandas as pd
from prophet import Prophet
from app.extensions import db
from datetime import datetime, timedelta
from bson.objectid import ObjectId

# Suppress Prophet logging so it doesn't spam your terminal
logging.getLogger("cmdstanpy").setLevel(logging.WARNING)

predict_bp = Blueprint('predict', __name__)

@predict_bp.route('/<target>', methods=['GET'])
@jwt_required()
def get_prediction(target):
    try:
        if target == 'all':
            sales_cursor = db.sales.find({}, {"timestamp": 1, "total_price": 1})
            df = pd.DataFrame(list(sales_cursor))
            if df.empty:
                return jsonify({"error": "No sales data available."}), 400
            
            df['timestamp'] = pd.to_datetime(df['timestamp']).dt.date
            daily_data = df.groupby('timestamp')['total_price'].sum().reset_index()
        else:
            sales_cursor = db.sales.find({"product_id": target}, {"timestamp": 1, "quantity": 1})
            df = pd.DataFrame(list(sales_cursor))
            if df.empty:
                return jsonify({"error": "No sales data available for this product."}), 400
            
            df['timestamp'] = pd.to_datetime(df['timestamp']).dt.date
            daily_data = df.groupby('timestamp')['quantity'].sum().reset_index()

        prophet_df = daily_data.rename(columns={'timestamp': 'ds', daily_data.columns[1]: 'y'})
        m = Prophet(yearly_seasonality=False, daily_seasonality=False, weekly_seasonality=True) 
        m.fit(prophet_df)

        future = m.make_future_dataframe(periods=7)
        forecast = m.predict(future)

        result = []
        actuals_dict = dict(zip(prophet_df['ds'].astype(str), prophet_df['y']))

        for index, row in forecast.iterrows():
            date_str = row['ds'].strftime('%Y-%m-%d')
            predicted_val = max(0, round(row['yhat'], 2)) 
            data_point = {"date": date_str, "predicted": predicted_val}
            
            if date_str in actuals_dict:
                data_point["actual"] = round(actuals_dict[date_str], 2)
            else:
                data_point["actual"] = None 
            result.append(data_point)

        return jsonify(result[-37:]), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@predict_bp.route('/insights', methods=['GET'])
@jwt_required()
def get_insights():
    try:
        # 1. Get Top 3 Trending Products (Past 7 Days ONLY)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        
        pipeline = [
            {"$match": {"timestamp": {"$gte": start_date, "$lte": end_date}}},
            {"$group": {"_id": "$product_name", "total_sold": {"$sum": "$quantity"}}},
            {"$sort": {"total_sold": -1}},
            {"$limit": 3}
        ]
        top_products = [{"name": p["_id"], "sold_last_7_days": p["total_sold"]} 
                        for p in db.sales.aggregate(pipeline) if p["_id"]]

        # 2. Predict TOMORROW'S orders for ALL products
        ninety_days_ago = end_date - timedelta(days=90)
        sales_cursor = db.sales.find(
            {"timestamp": {"$gte": ninety_days_ago}}, 
            {"product_name": 1, "timestamp": 1, "quantity": 1}
        )
        df_all = pd.DataFrame(list(sales_cursor))

        predicted_products = []
        prep_list_dict = {}

        if not df_all.empty:
            df_all['timestamp'] = pd.to_datetime(df_all['timestamp']).dt.date
            
            for prod_name, group in df_all.groupby('product_name'):
                daily_data = group.groupby('timestamp')['quantity'].sum().reset_index()
                
                if len(daily_data) < 5: 
                    continue
                
                prophet_df = daily_data.rename(columns={'timestamp': 'ds', 'quantity': 'y'})
                m = Prophet(yearly_seasonality=False, daily_seasonality=False, weekly_seasonality=True)
                m.fit(prophet_df)
                
                future = m.make_future_dataframe(periods=1)
                forecast = m.predict(future)
                
                predicted_qty = max(0, int(round(forecast.iloc[-1]['yhat'])))

                if predicted_qty > 0:
                    predicted_products.append({"name": prod_name, "qty": predicted_qty})

                    # 3. BULLETPROOF INGREDIENT LOOKUP
                    product_docs = list(db.products.find({"$or": [{"name": prod_name}, {"product_name": prod_name}]}))
                    
                    for p_doc in product_docs:
                        ingredients_to_process = []
                        
                        # Gather all required ingredients regardless of DB structure
                        if "recipe" in p_doc and isinstance(p_doc["recipe"], list):
                            for req in p_doc["recipe"]:
                                ident = req.get("ingredient_name") or req.get("ingredient_id")
                                q = float(req.get("qty", 0)) * predicted_qty
                                if ident and q > 0:
                                    ingredients_to_process.append((ident, q))
                                    
                        elif "ingredient_name" in p_doc or "ingredient_id" in p_doc:
                            ident = p_doc.get("ingredient_name") or p_doc.get("ingredient_id")
                            q = float(p_doc.get("qty", 0)) * predicted_qty
                            if ident and q > 0:
                                ingredients_to_process.append((ident, q))
                                
                        # Look up each ingredient to get its REAL name and unit
                        for ident, req_qty in ingredients_to_process:
                            inv_doc = None
                            
                            # A. Try checking if it's a valid MongoDB ObjectId
                            if isinstance(ident, str) and len(ident) == 24:
                                try:
                                    inv_doc = db.inventory.find_one({"_id": ObjectId(ident)})
                                except:
                                    pass
                            
                            # B. If not an ID, try matching by exact name
                            if not inv_doc:
                                inv_doc = db.inventory.find_one({"name": ident})
                                
                            # C. Extract the true name and unit!
                            real_name = inv_doc.get("name") if inv_doc else str(ident)
                            real_unit = inv_doc.get("unit", "units") if inv_doc else "units"
                            
                            if real_name not in prep_list_dict:
                                prep_list_dict[real_name] = {"qty": 0, "unit": real_unit}
                            prep_list_dict[real_name]["qty"] += req_qty

        # Sort the lists so the highest numbers are at the top
        predicted_products = sorted(predicted_products, key=lambda x: x["qty"], reverse=True)
        prep_array = [{"ingredient": k, "qty": round(v["qty"], 2), "unit": v["unit"]} for k, v in prep_list_dict.items()]
        prep_array = sorted(prep_array, key=lambda x: x["qty"], reverse=True)

        return jsonify({
            "top_products": top_products,
            "predicted_products": predicted_products,
            "prep_list": prep_array
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500