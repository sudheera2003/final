import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["final_project"] 

#permissions
permissions_blueprint = [
    # Dashboard Group
    {"id": "view_dashboard", "label": "Dashboard Access", "parent_id": None, "description": "View the main dashboard"},
    {"id": "download_sales_files", "label": "Download Sales Files", "parent_id": "view_dashboard", "description": "Export sales reports"},
    
    # Sales Group
    {"id": "view_sales", "label": "Sales Access", "parent_id": None, "description": "Access the sales module"},
    {"id": "show_revenue", "label": "Show Revenue Data", "parent_id": "view_sales", "description": "View detailed revenue figures"},
    {"id": "show_profit_margins", "label": "Show Profit Margins", "parent_id": "view_sales", "description": "View profit margin breakdowns"},
    
    # Inventory Group
    {"id": "view_inventory", "label": "Inventory Access", "parent_id": None, "description": "View inventory records"},
    {"id": "add_inventory", "label": "Add Items", "parent_id": "view_inventory", "description": "Create new inventory entries"},
    {"id": "edit_inventory", "label": "Edit Items", "parent_id": "view_inventory", "description": "Modify existing inventory"},
    {"id": "delete_inventory", "label": "Delete Items", "parent_id": "view_inventory", "description": "Remove inventory permanently"},
    
    # Products Group
    {"id": "view_products", "label": "Products Access", "parent_id": None, "description": "View the products catalog"},
    {"id": "add_products", "label": "Add Products", "parent_id": "view_products", "description": "Create new products"},
    {"id": "edit_products", "label": "Edit Products", "parent_id": "view_products", "description": "Update product info"},
    {"id": "delete_products", "label": "Delete Products", "parent_id": "view_products", "description": "Remove products"},
    
    # Tickets Group
    {"id": "manage_tickets", "label": "Manage Support Tickets", "parent_id": None, "description": "Manage support tickets"},
    {"id": "edit_ticket_status", "label": "Edit Ticket Status", "parent_id": "manage_tickets", "description": "Update the status of support tickets"},
    {"id": "delete_tickets", "label": "Delete Support Tickets", "parent_id": "manage_tickets", "description": "Permanently remove support tickets"},
    
    # Standalone Groups
    {"id": "user_management", "label": "User Management", "parent_id": None, "description": "Manage staff accounts"},
    {"id": "manage_roles", "label": "Permission Management", "parent_id": None, "description": "Configure access control"}
]

super_admin_perms = [
    "view_dashboard", "download_sales_files",
    "view_sales", "show_revenue", "show_profit_margins",
    "view_inventory", "add_inventory", "edit_inventory", "delete_inventory",
    "view_products", "add_products", "edit_products", "delete_products",
    "user_management", "use_ai_chat", "manage_roles", "manage_tickets", "edit_ticket_status", "delete_tickets"
]

admin_perms = [
    "view_dashboard", "download_sales_files",
    "view_sales", "show_revenue", "show_profit_margins",
    "view_inventory", "add_inventory", "edit_inventory", "delete_inventory",
    "view_products", "add_products", "edit_products", "delete_products",
    "use_ai_chat"
]

staff_perms = [
    "view_sales", 
    "view_inventory", 
    "view_products",
    "use_ai_chat"
]

roles_data = [
    {"role_name": "super_admin", "label": "Super Admin", "permissions": super_admin_perms},
    {"role_name": "admin", "label": "Admin", "permissions": admin_perms},
    {"role_name": "user", "label": "Staff", "permissions": staff_perms}
]

print("Clearing old roles and permissions...")
db.roles.delete_many({}) 
db.permissions.delete_many({}) 

print("Seeding Dynamic Permissions and Roles...")
db.permissions.insert_many(permissions_blueprint)
db.roles.insert_many(roles_data)

print("Success! Roles and Permissions Blueprint seeded.")