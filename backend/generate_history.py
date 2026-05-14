import os
import random
from datetime import datetime, timedelta, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

# load environment variables
load_dotenv()

# get mongo uri
mongo_uri = os.getenv("MONGO_URI")

if not mongo_uri:
    print("Error: MONGO_URI not found in .env file.")
    exit()

print("Connecting to database...")
client = MongoClient(mongo_uri)

# connect database
db = client['final_project']

def generate_historical_sales(days_back=180):
    products = list(db.products.find())
    
    if not products:
        print("Error: No products found in the database. Please upload products first.")
        return

    # clear old data
    print("Clearing old sales data to prevent duplicates...")
    db.sales.delete_many({})

    sales_to_insert = []
    
    # create a timezone object for Sri Lanka (UTC+05:30)
    sl_tz = timezone(timedelta(hours=5, minutes=30))
    
    # generate the end date using the explicit timezone
    end_date = datetime.now(sl_tz).replace(hour=23, minute=59, second=59)
    start_date = end_date - timedelta(days=days_back)

    print(f"Generating {days_back} days of historical sales data...")

    current_date = start_date
    while current_date <= end_date:
        # determine if it's a weekend (Friday=4, Saturday=5, Sunday=6)
        is_weekend = current_date.weekday() in [4, 5, 6]
        
        # simulate 15 to 40 orders per day (busier on weekends)
        daily_orders = random.randint(25, 50) if is_weekend else random.randint(10, 25)

        for _ in range(daily_orders):
            # pick a random product
            product = random.choice(products)
            
            # simulate quantity (usually 1, sometimes 2 or 3)
            qty = random.choices([1, 2, 3, 4], weights=[70, 20, 7, 3])[0]
            
            total_price = float(product.get("price", 0)) * qty

            # add a random time during operating hours
            # mongodb will safely convert 10 PM to 4:30 PM UTC, preventing the rollover
            sale_time = current_date.replace(
                hour=random.randint(11, 22),
                minute=random.randint(0, 59),
                second=random.randint(0, 59)
            )

            sales_to_insert.append({
                "product_id": str(product["_id"]),
                "product_name": product.get("name"),
                "category": product.get("category", "General"),
                "quantity": qty,
                "total_price": total_price,
                "timestamp": sale_time
            })

        # move to the next day
        current_date += timedelta(days=1)

    # insert into database
    if sales_to_insert:
        db.sales.insert_many(sales_to_insert)
        print(f"Successfully inserted {len(sales_to_insert)} historical sales records!")
    else:
        print("Failed to generate sales.")

if __name__ == "__main__":
    generate_historical_sales()