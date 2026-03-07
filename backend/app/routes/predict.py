from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
import pandas as pd
from prophet import Prophet
from app.extensions import db

predict_bp = Blueprint('predict', __name__)

@predict_bp.route('/<target>', methods=['GET'])
@jwt_required()
def get_prediction(target):
    try:
        # 1. Fetch data from MongoDB based on what the user wants to predict
        if target == 'all':
            # Predict TOTAL REVENUE (Overall Business Health)
            sales_cursor = db.sales.find({}, {"timestamp": 1, "total_price": 1})
            df = pd.DataFrame(list(sales_cursor))
            if df.empty:
                return jsonify({"error": "No sales data available."}), 400
            
            # Format dates and group by day to get daily total revenue
            df['timestamp'] = pd.to_datetime(df['timestamp']).dt.date
            daily_data = df.groupby('timestamp')['total_price'].sum().reset_index()
        else:
            # Predict QUANTITY SOLD for a specific product (For Inventory/Prep)
            sales_cursor = db.sales.find({"product_id": target}, {"timestamp": 1, "quantity": 1})
            df = pd.DataFrame(list(sales_cursor))
            if df.empty:
                return jsonify({"error": "No sales data available for this product."}), 400
            
            # Format dates and group by day to get daily quantity sold
            df['timestamp'] = pd.to_datetime(df['timestamp']).dt.date
            daily_data = df.groupby('timestamp')['quantity'].sum().reset_index()

        # 2. Format Data for Prophet (Prophet strictly requires 'ds' and 'y' columns)
        prophet_df = daily_data.rename(columns={'timestamp': 'ds', daily_data.columns[1]: 'y'})

        # 3. Train the Prophet Model
        # We enable weekly_seasonality so it learns that weekends are busier!
        m = Prophet(yearly_seasonality=False, daily_seasonality=False, weekly_seasonality=True) 
        m.fit(prophet_df)

        # 4. Predict the next 7 days
        future = m.make_future_dataframe(periods=7)
        forecast = m.predict(future)

        # 5. Format the data perfectly for Recharts (Your React Frontend)
        result = []
        
        # Convert actual historical data to a dictionary for easy lookup
        actuals_dict = dict(zip(prophet_df['ds'].astype(str), prophet_df['y']))

        for index, row in forecast.iterrows():
            date_str = row['ds'].strftime('%Y-%m-%d')
            
            # Prophet can sometimes predict negative numbers for low-volume items. We floor it at 0.
            predicted_val = max(0, round(row['yhat'], 2)) 

            data_point = {
                "date": date_str,
                "predicted": predicted_val
            }
            
            # If it's a past date, attach the real actual data so the chart can draw both lines
            if date_str in actuals_dict:
                data_point["actual"] = round(actuals_dict[date_str], 2)
            else:
                data_point["actual"] = None # Future dates only have 'predicted' values

            result.append(data_point)

        # Return the last 30 days of history + the 7 days of future predictions (37 days total)
        # Sending all 180 days would make the chart too squeezed!
        return jsonify(result[-37:]), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500