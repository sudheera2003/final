import os
from app import create_app, socketio
from app.extensions import db
from app.extensions import db

app = create_app()


def watch_user_changes():
    """
    Background task to watch MongoDB for changes in 'users' collection.
    """
    with app.app_context():
        try:
            # Watch for any 'update' operation on the users collection
            pipeline = [{"$match": {"operationType": "update"}}]
            
            # This loop blocks and waits for changes
            with db.users.watch(pipeline) as stream:
                print("👀 Watching for user profile changes in MongoDB...")
                for change in stream:
                    # Get the ID of the updated user
                    user_id = change['documentKey']['_id']
                    
                    # Fetch the latest data for this user
                    updated_user = db.users.find_one({"_id": user_id})
                    
                    if updated_user:
                        print(f"🔄 Database changed for user: {updated_user.get('email')}")
                        
                        # Emit the event to the Frontend
                        socketio.emit('profile_updated', {
                            'email': updated_user.get('email'),
                            'name': updated_user.get('name')
                        })
        except Exception as e:
            # On standard MongoDB (not Replica Set), this might fail gracefully
            print(f"⚠️ Change Stream not active (requires Replica Set): {e}")

if __name__ == '__main__':
    # 1. Get the PORT from Environment (Render sets this automatically)
    # If not found (Local), default to 5000
    port = int(os.environ.get("PORT", 5000))
    
    socketio.start_background_task(target=watch_user_changes)
    print(f"🚀 Server starting on port {port}...")
    socketio.run(app, host='0.0.0.0', port=port, debug=True, use_reloader=False)