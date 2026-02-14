from app import create_app, socketio

app = create_app()

if __name__ == '__main__':
    # Using socketio.run for WebSocket support
    socketio.run(app, debug=True, port=5000)