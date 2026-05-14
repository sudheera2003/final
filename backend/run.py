import os
from app import create_app, socketio
from app.extensions import db  # <-- Import your db instance

app = create_app()

# database connection check
def check_db_connection():
    try:
        # send a lightweight 'ping' command to the database
        db.command('ping')
        print("success: Connected to MongoDB database")
    except Exception as e:
        print("error: Failed to connect to MongoDB")
        print(f"Details: {e}")

if __name__ == '__main__':
    # check database connection inside app
    with app.app_context():
        check_db_connection()

    # get the port from environment variable
    port = int(os.environ.get("PORT", 5000))
    
    print(f"Server starting on port {port}...")
    
    # use 127.0.0.1 for clean Windows local development
    socketio.run(app, host='127.0.0.1', port=port, debug=True, use_reloader=False)