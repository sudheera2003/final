import pandas as pd

# ==========================================
# 1. INVENTORY DATA (40+ Diverse Ingredients)
# ==========================================
inventory_data = [
    # Italian / Pizza
    ("Pizza Dough", "Bakery", 100, "balls", 0.80, "Italian Supplies"),
    ("Pizza Sauce", "Condiments", 20, "liters", 3.00, "Italian Supplies"),
    ("Mozzarella Cheese", "Dairy", 30, "kg", 4.50, "Farm Fresh Dairy"),
    ("Fresh Basil", "Vegetables", 2, "kg", 12.00, "Green Farm"),
    ("Pepperoni", "Meat", 15, "kg", 8.00, "Premium Meats"),
    ("Pasta", "Pantry", 50, "kg", 1.50, "Wholesale Mart"),
    ("Parmesan Cheese", "Dairy", 10, "kg", 15.00, "Farm Fresh Dairy"),
    
    # Steaks & Seafood
    ("Ribeye Steak", "Meat", 40, "steaks", 6.50, "Premium Meats"),
    ("Pork Ribs", "Meat", 30, "racks", 5.00, "Premium Meats"),
    ("Salmon Fillet", "Seafood", 25, "fillets", 4.00, "Ocean Catch"),
    ("Fish Fillet", "Seafood", 40, "fillets", 2.50, "Ocean Catch"),
    ("Garlic", "Vegetables", 10, "kg", 3.00, "Green Farm"),
    ("Rosemary", "Vegetables", 2, "kg", 18.00, "Green Farm"),
    ("Lemon", "Vegetables", 100, "count", 0.20, "Green Farm"),
    
    # Mexican
    ("Taco Shells", "Pantry", 200, "shells", 0.15, "MexiFoods"),
    ("Tortilla", "Bakery", 150, "wraps", 0.20, "MexiFoods"),
    ("Ground Beef", "Meat", 40, "kg", 5.50, "Premium Meats"),
    ("Nacho Chips", "Pantry", 20, "kg", 2.00, "MexiFoods"),
    ("Jalapenos", "Vegetables", 5, "kg", 2.50, "Green Farm"),
    ("Avocado", "Vegetables", 50, "count", 0.80, "Green Farm"),
    
    # Breakfast & Baking
    ("Eggs", "Dairy", 300, "count", 0.15, "Farm Fresh Dairy"),
    ("Milk", "Dairy", 40, "liters", 1.20, "Farm Fresh Dairy"),
    ("Flour", "Pantry", 50, "kg", 0.90, "Wholesale Mart"),
    ("Sugar", "Pantry", 40, "kg", 0.80, "Wholesale Mart"),
    ("Butter", "Dairy", 20, "kg", 4.00, "Farm Fresh Dairy"),
    ("Bread", "Bakery", 40, "loaves", 1.50, "Daily Bread Bakery"),
    ("Maple Syrup", "Condiments", 10, "liters", 8.00, "Wholesale Mart"),
    
    # Desserts & Drinks
    ("Cocoa Powder", "Pantry", 5, "kg", 6.00, "Wholesale Mart"),
    ("Cream Cheese", "Dairy", 15, "kg", 5.00, "Farm Fresh Dairy"),
    ("Vanilla Extract", "Pantry", 2, "liters", 25.00, "Wholesale Mart"),
    ("Ice Cream", "Frozen", 20, "tubs", 5.00, "Frozen Foods Co"),
    ("Coffee Beans", "Pantry", 10, "kg", 12.00, "Wholesale Mart"),
    ("Tea Leaves", "Pantry", 5, "kg", 8.00, "Wholesale Mart"),
]

# Create Inventory DataFrame
inv_rows = []
for name, cat, stock, unit, price, supplier in inventory_data:
    inv_rows.append({"name": name, "category": cat, "stock": stock, "unit": unit, "unit_price": price, "supplier": supplier, "low_stock_threshold": 10})

pd.DataFrame(inv_rows).to_excel("1_master_inventory.xlsx", index=False)


# ==========================================
# 2. PRODUCTS & RECIPES DATA (30 Diverse Items)
# ==========================================
menu_data = [
    # --- PIZZAS ---
    ("Margherita Pizza", "Pizza", 12.00, [("Pizza Dough", 1), ("Pizza Sauce", 0.15), ("Mozzarella Cheese", 0.2), ("Fresh Basil", 0.02)]),
    ("Pepperoni Pizza", "Pizza", 14.50, [("Pizza Dough", 1), ("Pizza Sauce", 0.15), ("Mozzarella Cheese", 0.2), ("Pepperoni", 0.15)]),
    ("Spicy Beef Pizza", "Pizza", 15.00, [("Pizza Dough", 1), ("Pizza Sauce", 0.15), ("Mozzarella Cheese", 0.2), ("Ground Beef", 0.15), ("Jalapenos", 0.05)]),
    
    # --- PASTAS ---
    ("Spaghetti Bolognese", "Pasta", 13.50, [("Pasta", 0.2), ("Ground Beef", 0.15), ("Pizza Sauce", 0.1), ("Garlic", 0.02), ("Parmesan Cheese", 0.03)]),
    ("Mac and Cheese", "Pasta", 11.00, [("Pasta", 0.2), ("Milk", 0.1), ("Butter", 0.02)]),
    ("Garlic Butter Pasta", "Pasta", 9.50, [("Pasta", 0.2), ("Butter", 0.05), ("Garlic", 0.03), ("Parmesan Cheese", 0.02)]),

    # --- MAINS & SEAFOOD ---
    ("Grilled Ribeye Steak", "Mains", 28.00, [("Ribeye Steak", 1), ("Butter", 0.03), ("Garlic", 0.02), ("Rosemary", 0.01)]),
    ("BBQ Pork Ribs", "Mains", 22.00, [("Pork Ribs", 1), ("Garlic", 0.02)]),
    ("Grilled Salmon", "Seafood", 24.00, [("Salmon Fillet", 1), ("Lemon", 0.5), ("Butter", 0.02), ("Garlic", 0.01)]),
    ("Fish and Chips", "Seafood", 16.50, [("Fish Fillet", 1), ("Lemon", 0.5)]),
    
    # --- MEXICAN ---
    ("Beef Tacos (3x)", "Mexican", 11.00, [("Taco Shells", 3), ("Ground Beef", 0.2), ("Jalapenos", 0.02)]),
    ("Beef Burrito", "Mexican", 12.50, [("Tortilla", 1), ("Ground Beef", 0.25)]),
    ("Cheese Quesadilla", "Mexican", 9.00, [("Tortilla", 1), ("Mozzarella Cheese", 0.15), ("Butter", 0.02)]),
    ("Nachos Supreme", "Mexican", 13.00, [("Nacho Chips", 0.3), ("Ground Beef", 0.15), ("Jalapenos", 0.05)]),

    # --- BREAKFAST ---
    ("Pancakes with Syrup", "Breakfast", 8.50, [("Flour", 0.15), ("Milk", 0.1), ("Eggs", 2), ("Butter", 0.03), ("Maple Syrup", 0.08)]),
    ("Avocado Toast", "Breakfast", 9.00, [("Bread", 0.1), ("Avocado", 1), ("Lemon", 0.2)]),
    ("Classic Omelette", "Breakfast", 7.50, [("Eggs", 3), ("Butter", 0.02)]),
    ("French Toast", "Breakfast", 8.00, [("Bread", 0.15), ("Eggs", 2), ("Milk", 0.05), ("Maple Syrup", 0.05)]),

    # --- DESSERTS ---
    ("Chocolate Brownie", "Desserts", 6.50, [("Flour", 0.05), ("Sugar", 0.05), ("Cocoa Powder", 0.03), ("Butter", 0.04), ("Eggs", 1)]),
    ("Classic Cheesecake", "Desserts", 7.50, [("Cream Cheese", 0.15), ("Sugar", 0.05), ("Eggs", 1), ("Vanilla Extract", 0.005)]),
    ("Vanilla Ice Cream", "Desserts", 4.50, [("Ice Cream", 0.2)]),
    ("Tiramisu", "Desserts", 8.00, [("Coffee Beans", 0.02), ("Cream Cheese", 0.1), ("Cocoa Powder", 0.01), ("Sugar", 0.03)]),

    # --- BEVERAGES ---
    ("Iced Lemon Tea", "Beverages", 3.50, [("Tea Leaves", 0.01), ("Sugar", 0.02), ("Lemon", 0.5)]),
    ("Fresh Lemonade", "Beverages", 4.00, [("Lemon", 1.5), ("Sugar", 0.04)]),
    ("Black Coffee", "Beverages", 3.00, [("Coffee Beans", 0.02)]),
    ("Latte", "Beverages", 4.50, [("Coffee Beans", 0.02), ("Milk", 0.2)]),
    ("Chocolate Milkshake", "Beverages", 6.00, [("Milk", 0.2), ("Ice Cream", 0.15), ("Cocoa Powder", 0.02)]),
    ("Vanilla Milkshake", "Beverages", 5.50, [("Milk", 0.2), ("Ice Cream", 0.2), ("Vanilla Extract", 0.01)]),

    # --- SIDES ---
    ("Garlic Bread", "Sides", 5.00, [("Bread", 0.1), ("Butter", 0.03), ("Garlic", 0.02), ("Rosemary", 0.005)]),
    ("Cheesy Garlic Bread", "Sides", 6.50, [("Bread", 0.1), ("Butter", 0.03), ("Garlic", 0.02), ("Mozzarella Cheese", 0.05)])
]

# Create Products DataFrame
prod_rows = []
for product_name, category, price, ingredients in menu_data:
    for ing_name, qty in ingredients:
        prod_rows.append({"product_name": product_name, "category": category, "price": price, "ingredient_name": ing_name, "qty": qty})

pd.DataFrame(prod_rows).to_excel("2_master_products.xlsx", index=False)

print("SUCCESS! Created '1_master_inventory.xlsx' and '2_master_products.xlsx'.")