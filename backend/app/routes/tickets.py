import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from datetime import datetime

tickets_bp = Blueprint('tickets', __name__)

@tickets_bp.route('', methods=['POST'], strict_slashes=False)
@jwt_required()
def submit_ticket():
    try:
        current_user = get_jwt_identity() 
        data = request.get_json()
        
        issue_type = data.get('issue_type')
        description = data.get('description')

        if not issue_type or not description:
            return jsonify({"error": "Missing required fields"}), 400

        # 1. Save to database (Keeps a record in MongoDB)
        ticket = {
            "user_email": current_user,
            "issue_type": issue_type,
            "description": description,
            "status": "Open",
            "timestamp": datetime.now()
        }
        db.tickets.insert_one(ticket)
        
        # 2. Send the actual email
        sender_email = os.getenv("MAIL_USERNAME")
        sender_password = os.getenv("MAIL_PASSWORD")
        receiver_email = os.getenv("ADMIN_EMAIL")

        if sender_email and sender_password and receiver_email:
            # Construct the email
            msg = MIMEMultipart()
            msg['From'] = f"RestoAI System <{sender_email}>"
            msg['To'] = receiver_email
            msg['Subject'] = f"RestoAI Support Ticket: {issue_type}"

            # The body of the email
            body = f"""
            Hello Admin,

            A new support ticket has been submitted from the RestoAI Dashboard.

            USER EMAIL: {current_user}
            ISSUE TYPE: {issue_type}
            
            DESCRIPTION:
            {description}
            
            ---
            Timestamp: {ticket['timestamp'].strftime('%Y-%m-%d %H:%M:%S')}
            """
            msg.attach(MIMEText(body, 'plain'))

            # Connect to Gmail's SMTP server and send
            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls() # Secure the connection
            server.login(sender_email, sender_password)
            text = msg.as_string()
            server.sendmail(sender_email, receiver_email, text)
            server.quit()
        else:
            print("Warning: Email credentials not found in .env. Saved to DB only.")

        return jsonify({"message": "Ticket submitted and email sent!"}), 201

    except Exception as e:
        print(f"Email/Ticket Error: {e}")
        return jsonify({"error": "Failed to submit ticket."}), 500