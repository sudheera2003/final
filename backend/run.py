import eventlet
eventlet.monkey_patch()

import os
from app import create_app, socketio

# Initialize the app
app = create_app()

if __name__ == '__main__':
    # LOCAL RUN LOGIC
    port = int(os.environ.get("PORT", 5000))
    print(f"Local Server starting on port {port}...")
    socketio.run(app, host='0.0.0.0', port=port, debug=True, use_reloader=False)