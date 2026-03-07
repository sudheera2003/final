import os
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

# Connect
client = MongoClient(os.getenv("MONGO_URI"))
db = client.get_database("final_project")

# 1. Clear existing data (to avoid duplicates)
db.products.delete_many({})
db.inventory.delete_many({})

now = datetime.now()

# 2. Create Ingredients (Inventory)
# Added new fields to match the frontend Shadcn UI Data Table
inventory_items = [
    { 
        "_id": "inv_bun", 
        "name": "Burger Bun", 
        "category": "Bakery",
        "status": "In Stock",
        "stock": 100, 
        "unit": "count",
        "unit_price": 0.50,
        "supplier": "Daily Bread Bakery",
        "low_stock_threshold": 20,
        "lastUpdated": now
    },
    { 
        "_id": "inv_patty", 
        "name": "Chicken Patty", 
        "category": "Meat",
        "status": "In Stock",
        "stock": 50, 
        "unit": "count",
        "unit_price": 2.00,
        "supplier": "Premium Meats Co.",
        "low_stock_threshold": 20,
        "lastUpdated": now
    },
    { 
        "_id": "inv_lettuce", 
        "name": "Lettuce", 
        "category": "Vegetables",
        "status": "In Stock",
        "stock": 1000, 
        "unit": "grams",
        "unit_price": 0.05,
        "supplier": "Green Farm",
        "low_stock_threshold": 200,
        "lastUpdated": now
    },
    { 
        "_id": "inv_sauce", 
        "name": "Secret Sauce", 
        "category": "Condiments",
        "status": "In Stock",
        "stock": 5000, 
        "unit": "ml",
        "unit_price": 0.02,
        "supplier": "In-house Kitchen",
        "low_stock_threshold": 500,
        "lastUpdated": now
    }
]

db.inventory.insert_many(inventory_items)
print("Inventory Created with dynamic low stock thresholds!")

# 3. Create Products (Menu Items with Recipes)
# This perfectly maps to the inventory _id fields for your BOM/Recipe logic
products = [
    {
        "_id": "prod_burger",
        "name": "Chicken Burger",
        "price": 850,
        "recipe": [
            { "ingredient_id": "inv_bun", "qty": 1 },     # Uses 1 bun
            { "ingredient_id": "inv_patty", "qty": 1 },   # Uses 1 patty
            { "ingredient_id": "inv_lettuce", "qty": 20 } # Uses 20g lettuce
        ]
    },
    {
        "_id": "prod_salad",
        "name": "Green Salad",
        "price": 600,
        "recipe": [
             { "ingredient_id": "inv_lettuce", "qty": 100 }, # Uses 100g lettuce
             { "ingredient_id": "inv_sauce", "qty": 30 }     # Uses 30ml sauce
        ]
    }
]

db.products.insert_many(products)
print("Products & Recipes Created Successfully!")