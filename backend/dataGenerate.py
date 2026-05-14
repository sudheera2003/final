import pandas as pd

# inventory data

inventory_data = [
    # Italian / Pizza
    ("Pizza Dough", "Bakery", 100, "balls", 150.00, "Italian Supplies", 25),
    ("Pizza Sauce", "Condiments", 20, "liters", 1200.00, "Italian Supplies", 5),
    ("Mozzarella Cheese", "Dairy", 30, "kg", 3500.00, "Farm Fresh Dairy", 10),
    ("Fresh Basil", "Vegetables", 2, "kg", 2000.00, "Green Farm", 0.5),
    ("Pepperoni", "Meat", 15, "kg", 4500.00, "Premium Meats", 5),
    ("Pasta", "Pantry", 50, "kg", 800.00, "Wholesale Mart", 15),
    ("Parmesan Cheese", "Dairy", 10, "kg", 7000.00, "Farm Fresh Dairy", 3),
    
    # Steaks & Seafood
    ("Ribeye Steak", "Meat", 40, "steaks", 3000.00, "Premium Meats", 10),
    ("Pork Ribs", "Meat", 30, "racks", 4000.00, "Premium Meats", 10),
    ("Salmon Fillet", "Seafood", 25, "fillets", 2500.00, "Ocean Catch", 10),
    ("Fish Fillet", "Seafood", 40, "fillets", 1200.00, "Ocean Catch", 15),
    ("Garlic", "Vegetables", 10, "kg", 1000.00, "Green Farm", 2),
    ("Rosemary", "Vegetables", 2, "kg", 3000.00, "Green Farm", 0.5),
    ("Lemon", "Vegetables", 100, "count", 50.00, "Green Farm", 20),
    
    # Mexican
    ("Taco Shells", "Pantry", 200, "shells", 80.00, "MexiFoods", 50),
    ("Tortilla", "Bakery", 150, "wraps", 100.00, "MexiFoods", 40),
    ("Ground Beef", "Meat", 40, "kg", 2800.00, "Premium Meats", 15),
    ("Nacho Chips", "Pantry", 20, "kg", 1500.00, "MexiFoods", 5),
    ("Jalapenos", "Vegetables", 5, "kg", 1800.00, "Green Farm", 1),
    ("Avocado", "Vegetables", 50, "count", 150.00, "Green Farm", 15),
    
    # Breakfast & Baking
    ("Eggs", "Dairy", 300, "count", 50.00, "Farm Fresh Dairy", 50),
    ("Milk", "Dairy", 40, "liters", 450.00, "Farm Fresh Dairy", 10),
    ("Flour", "Pantry", 50, "kg", 250.00, "Wholesale Mart", 15),
    ("Sugar", "Pantry", 40, "kg", 300.00, "Wholesale Mart", 10),
    ("Butter", "Dairy", 20, "kg", 3500.00, "Farm Fresh Dairy", 5),
    ("Bread", "Bakery", 40, "loaves", 250.00, "Daily Bread Bakery", 10),
    ("Maple Syrup", "Condiments", 10, "liters", 4000.00, "Wholesale Mart", 2),
    
    # Desserts & Drinks
    ("Cocoa Powder", "Pantry", 5, "kg", 2500.00, "Wholesale Mart", 1.5),
    ("Cream Cheese", "Dairy", 15, "kg", 3800.00, "Farm Fresh Dairy", 4),
    ("Vanilla Extract", "Pantry", 2, "liters", 8000.00, "Wholesale Mart", 0.5),
    ("Ice Cream", "Frozen", 20, "tubs", 1500.00, "Frozen Foods Co", 5),
    ("Coffee Beans", "Pantry", 10, "kg", 4500.00, "Wholesale Mart", 3),
    ("Tea Leaves", "Pantry", 5, "kg", 1500.00, "Wholesale Mart", 1.5),
]

# create inventory dataframe
inv_rows = []
for name, cat, stock, unit, price, supplier, threshold in inventory_data:
    inv_rows.append({
        "name": name, 
        "category": cat, 
        "stock": stock, 
        "unit": unit, 
        "unit_price": price, 
        "supplier": supplier, 
        "low_stock_threshold": threshold 
    })

pd.DataFrame(inv_rows).to_excel("1_master_inventory.xlsx", index=False)


# products and recipe data

menu_data = [
    #  PIZZAS
    ("Margherita Pizza", "Pizza", 2800.00, [("Pizza Dough", 1), ("Pizza Sauce", 0.15), ("Mozzarella Cheese", 0.2), ("Fresh Basil", 0.02)]),
    ("Pepperoni Pizza", "Pizza", 3500.00, [("Pizza Dough", 1), ("Pizza Sauce", 0.15), ("Mozzarella Cheese", 0.2), ("Pepperoni", 0.15)]),
    ("Spicy Beef Pizza", "Pizza", 3600.00, [("Pizza Dough", 1), ("Pizza Sauce", 0.15), ("Mozzarella Cheese", 0.2), ("Ground Beef", 0.15), ("Jalapenos", 0.05)]),
    
    #  PASTAS 
    ("Spaghetti Bolognese", "Pasta", 2500.00, [("Pasta", 0.2), ("Ground Beef", 0.15), ("Pizza Sauce", 0.1), ("Garlic", 0.02), ("Parmesan Cheese", 0.03)]),
    ("Mac and Cheese", "Pasta", 1800.00, [("Pasta", 0.2), ("Milk", 0.1), ("Butter", 0.02)]),
    ("Garlic Butter Pasta", "Pasta", 1600.00, [("Pasta", 0.2), ("Butter", 0.05), ("Garlic", 0.03), ("Parmesan Cheese", 0.02)]),

    #  MAINS & SEAFOOD
    ("Grilled Ribeye Steak", "Mains", 8500.00, [("Ribeye Steak", 1), ("Butter", 0.03), ("Garlic", 0.02), ("Rosemary", 0.01)]),
    ("BBQ Pork Ribs", "Mains", 6500.00, [("Pork Ribs", 1), ("Garlic", 0.02)]),
    ("Grilled Salmon", "Seafood", 5500.00, [("Salmon Fillet", 1), ("Lemon", 0.5), ("Butter", 0.02), ("Garlic", 0.01)]),
    ("Fish and Chips", "Seafood", 2800.00, [("Fish Fillet", 1), ("Lemon", 0.5)]),
    
    # MEXICAN
    ("Beef Tacos (3x)", "Mexican", 2200.00, [("Taco Shells", 3), ("Ground Beef", 0.2), ("Jalapenos", 0.02)]),
    ("Beef Burrito", "Mexican", 2400.00, [("Tortilla", 1), ("Ground Beef", 0.25)]),
    ("Cheese Quesadilla", "Mexican", 1800.00, [("Tortilla", 1), ("Mozzarella Cheese", 0.15), ("Butter", 0.02)]),
    ("Nachos Supreme", "Mexican", 2500.00, [("Nacho Chips", 0.3), ("Ground Beef", 0.15), ("Jalapenos", 0.05)]),

    # BREAKFAST
    ("Pancakes with Syrup", "Breakfast", 1500.00, [("Flour", 0.15), ("Milk", 0.1), ("Eggs", 2), ("Butter", 0.03), ("Maple Syrup", 0.08)]),
    ("Avocado Toast", "Breakfast", 1600.00, [("Bread", 0.1), ("Avocado", 1), ("Lemon", 0.2)]),
    ("Classic Omelette", "Breakfast", 1200.00, [("Eggs", 3), ("Butter", 0.02)]),
    ("French Toast", "Breakfast", 1400.00, [("Bread", 0.15), ("Eggs", 2), ("Milk", 0.05), ("Maple Syrup", 0.05)]),

    # DESSERTS
    ("Chocolate Brownie", "Desserts", 1200.00, [("Flour", 0.05), ("Sugar", 0.05), ("Cocoa Powder", 0.03), ("Butter", 0.04), ("Eggs", 1)]),
    ("Classic Cheesecake", "Desserts", 1500.00, [("Cream Cheese", 0.15), ("Sugar", 0.05), ("Eggs", 1), ("Vanilla Extract", 0.005)]),
    ("Vanilla Ice Cream", "Desserts", 800.00, [("Ice Cream", 0.2)]),
    ("Tiramisu", "Desserts", 1600.00, [("Coffee Beans", 0.02), ("Cream Cheese", 0.1), ("Cocoa Powder", 0.01), ("Sugar", 0.03)]),

    # BEVERAGES
    ("Iced Lemon Tea", "Beverages", 800.00, [("Tea Leaves", 0.01), ("Sugar", 0.02), ("Lemon", 0.5)]),
    ("Fresh Lemonade", "Beverages", 900.00, [("Lemon", 1.5), ("Sugar", 0.04)]),
    ("Black Coffee", "Beverages", 600.00, [("Coffee Beans", 0.02)]),
    ("Latte", "Beverages", 900.00, [("Coffee Beans", 0.02), ("Milk", 0.2)]),
    ("Chocolate Milkshake", "Beverages", 1200.00, [("Milk", 0.2), ("Ice Cream", 0.15), ("Cocoa Powder", 0.02)]),
    ("Vanilla Milkshake", "Beverages", 1100.00, [("Milk", 0.2), ("Ice Cream", 0.2), ("Vanilla Extract", 0.01)]),

    # SIDES
    ("Garlic Bread", "Sides", 900.00, [("Bread", 0.1), ("Butter", 0.03), ("Garlic", 0.02), ("Rosemary", 0.005)]),
    ("Cheesy Garlic Bread", "Sides", 1400.00, [("Bread", 0.1), ("Butter", 0.03), ("Garlic", 0.02), ("Mozzarella Cheese", 0.05)])
]

# create products dataframe
prod_rows = []
for product_name, category, price, ingredients in menu_data:
    for ing_name, qty in ingredients:
        prod_rows.append({"product_name": product_name, "category": category, "price": price, "ingredient_name": ing_name, "qty": qty})

pd.DataFrame(prod_rows).to_excel("2_master_products.xlsx", index=False)

print("success created '1_master_inventory.xlsx' and '2_master_products.xlsx'.")