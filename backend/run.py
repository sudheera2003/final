import os
from app import create_app, socketio

app = create_app()

if __name__ == '__main__':
    # 1. Get the PORT from Environment (Render sets this automatically)
    # If not found (Local), default to 5000
    port = int(os.environ.get("PORT", 5000))
    
    print(f"Local server starting on port {port}...")
    
    # 2. Use 127.0.0.1 for clean Windows local development
    socketio.run(app, host='127.0.0.1', port=port, debug=True, use_reloader=False)