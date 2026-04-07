import os
from app import create_app, socketio
from app.extensions import db  # <-- Import your db instance

app = create_app()

# --- DATABASE CONNECTION CHECK ---
def check_db_connection():
    try:
        # Send a lightweight 'ping' command to the database
        db.command('ping')
        print("\n" + "="*50)
        print("SUCCESS: Connected to MongoDB database!")
        print("="*50 + "\n")
    except Exception as e:
        print("\n" + "="*50)
        print("ERROR: Failed to connect to MongoDB!")
        print(f"Details: {e}")
        print("="*50 + "\n")

if __name__ == '__main__':
    # 0. Check the database connection inside the app context
    with app.app_context():
        check_db_connection()

    # 1. Get the PORT from Environment (Render sets this automatically)
    # If not found (Local), default to 5000
    port = int(os.environ.get("PORT", 5000))
    
    print(f"🚀 Server starting on port {port}...")
    
    # 2. Use 127.0.0.1 for clean Windows local development
    socketio.run(app, host='127.0.0.1', port=port, debug=True, use_reloader=False)