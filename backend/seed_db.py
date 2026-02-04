import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# Connect
client = MongoClient(os.getenv("MONGO_URI"))
db = client.get_database("final_project")

# 1. Clear existing data (to avoid duplicates)
db.products.delete_many({})
db.inventory.delete_many({})

# 2. Create Ingredients (Inventory)
inventory_items = [
    { "_id": "inv_bun", "name": "Burger Bun", "stock": 100, "unit": "count" },
    { "_id": "inv_patty", "name": "Chicken Patty", "stock": 50, "unit": "count" },
    { "_id": "inv_lettuce", "name": "Lettuce", "stock": 1000, "unit": "grams" },
    { "_id": "inv_sauce", "name": "Secret Sauce", "stock": 5000, "unit": "ml" }
]
db.inventory.insert_many(inventory_items)
print("Inventory Created")

# 3. Create Products (Menu Items with Recipes)
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
print("Products & Recipes Created")