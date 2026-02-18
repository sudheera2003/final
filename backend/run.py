from gevent import monkey
monkey.patch_all()

import os
from app import create_app, socketio

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print(f"🚀 Server starting on port {port}...")
    socketio.run(app, host='0.0.0.0', port=port, debug=True, use_reloader=False)