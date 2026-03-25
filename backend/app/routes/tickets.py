import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.routes.auth import requires_permission
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from datetime import datetime
from bson import ObjectId

tickets_bp = Blueprint('tickets', __name__)

# --- 1. SUBMIT A TICKET ---
@tickets_bp.route('', methods=['POST', 'OPTIONS'], strict_slashes=False)
@jwt_required()
def submit_ticket():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    try:
        current_user = get_jwt_identity() 
        data = request.get_json()
        
        issue_type = data.get('issue_type')
        description = data.get('description')

        if not issue_type or not description:
            return jsonify({"error": "Missing required fields"}), 400

        # 1. Save to database
        now = datetime.now()
        ticket = {
            "user_email": current_user,
            "issue_type": issue_type,
            "description": description,
            "status": "Open",
            "timestamp": now
        }
        result = db.tickets.insert_one(ticket)
        
        # 2. Format variables for the email
        # Create a professional looking Ticket ID using the date and the last 4 chars of the MongoDB ID
        ticket_id = f"#TKT-{now.strftime('%Y%m%d')}-{str(result.inserted_id)[-4:].upper()}"
        date_str = now.strftime("%b %d, %Y")
        time_str = now.strftime("%I:%M %p")
        
        # 3. Prepare Email
        sender_email = os.getenv("MAIL_USERNAME")
        sender_password = os.getenv("MAIL_PASSWORD")
        receiver_email = os.getenv("ADMIN_EMAIL")

        if sender_email and sender_password and receiver_email:
            msg = MIMEMultipart()
            msg['From'] = f"RestoAI System <{sender_email}>"
            msg['To'] = receiver_email
            msg['Subject'] = f"RestoAI Support Ticket: {issue_type}"

            # 4. The HTML Template
            html_template = """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
              <title>RestoAI Support Ticket</title>
              <style>
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@700&display=swap');

                * { margin: 0; padding: 0; box-sizing: border-box; }

                body {
                  background-color: #f5f0eb;
                  font-family: 'DM Sans', sans-serif;
                  padding: 40px 20px;
                  color: #1a1a1a;
                }

                .email-wrapper {
                  max-width: 600px;
                  margin: 0 auto;
                }

                /* ─── HEADER ─── */
                .header {
                  background: #1c1917;
                  border-radius: 16px 16px 0 0;
                  padding: 36px 40px 28px;
                  position: relative;
                  overflow: hidden;
                }

                .header::before {
                  content: '';
                  position: absolute;
                  top: -40px; right: -40px;
                  width: 200px; height: 200px;
                  background: radial-gradient(circle, rgba(234,88,12,0.25) 0%, transparent 70%);
                  border-radius: 50%;
                }

                .header::after {
                  content: '';
                  position: absolute;
                  bottom: -20px; left: 30px;
                  width: 120px; height: 120px;
                  background: radial-gradient(circle, rgba(234,88,12,0.12) 0%, transparent 70%);
                  border-radius: 50%;
                }

                .brand {
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  margin-bottom: 24px;
                }

                .brand-icon {
                  width: 42px; height: 42px;
                  background: linear-gradient(135deg, #ea580c, #c2410c);
                  border-radius: 10px;
                  display: flex; align-items: center; justify-content: center;
                  font-size: 20px;
                  flex-shrink: 0;
                }

                .brand-name {
                  font-family: 'Playfair Display', serif;
                  font-size: 22px;
                  color: #fff;
                  letter-spacing: -0.3px;
                }

                .brand-name span {
                  color: #ea580c;
                }

                .header-title {
                  font-size: 13px;
                  font-weight: 500;
                  letter-spacing: 0.12em;
                  text-transform: uppercase;
                  color: #a8a29e;
                  margin-bottom: 8px;
                }

                .header-subtitle {
                  font-family: 'Playfair Display', serif;
                  font-size: 26px;
                  color: #fff;
                  line-height: 1.3;
                }

                /* ─── BODY ─── */
                .body {
                  background: #fffdfa;
                  padding: 40px 40px 32px;
                }

                .greeting {
                  font-size: 15px;
                  color: #78716c;
                  margin-bottom: 8px;
                }

                .greeting strong {
                  color: #1c1917;
                  font-weight: 600;
                }

                .intro {
                  font-size: 14px;
                  color: #57534e;
                  line-height: 1.65;
                  margin-bottom: 32px;
                  padding-bottom: 28px;
                  border-bottom: 1px dashed #e7e5e4;
                }

                /* ─── TICKET DETAILS CARD ─── */
                .details-card {
                  background: #fafaf9;
                  border: 1px solid #e7e5e4;
                  border-left: 3px solid #ea580c;
                  border-radius: 10px;
                  padding: 24px 28px;
                  margin-bottom: 28px;
                }

                .details-title {
                  font-size: 11px;
                  font-weight: 600;
                  letter-spacing: 0.12em;
                  text-transform: uppercase;
                  color: #a8a29e;
                  margin-bottom: 18px;
                }

                .detail-row {
                  display: flex;
                  align-items: flex-start;
                  gap: 16px;
                  padding: 10px 0;
                  border-bottom: 1px solid #f5f5f4;
                }

                .detail-row:last-child {
                  border-bottom: none;
                  padding-bottom: 0;
                }

                .detail-label {
                  font-size: 11px;
                  font-weight: 600;
                  letter-spacing: 0.08em;
                  text-transform: uppercase;
                  color: #a8a29e;
                  width: 100px;
                  flex-shrink: 0;
                  padding-top: 2px;
                }

                .detail-value {
                  font-size: 14px;
                  color: #1c1917;
                  font-weight: 400;
                  line-height: 1.5;
                  flex: 1;
                }

                .detail-value a {
                  color: #ea580c;
                  text-decoration: none;
                }

                .issue-type-badge {
                  display: inline-block;
                  background: #fff7ed;
                  border: 1px solid #fed7aa;
                  color: #c2410c;
                  font-size: 12px;
                  font-weight: 600;
                  padding: 3px 10px;
                  border-radius: 6px;
                }

                .description-box {
                  background: #f5f0eb;
                  border-radius: 8px;
                  padding: 14px 16px;
                  font-size: 14px;
                  color: #44403c;
                  line-height: 1.65;
                  font-style: italic;
                  white-space: pre-wrap;
                }

                /* ─── INFO PILLS ─── */
                .info-row {
                  display: flex;
                  gap: 12px;
                  flex-wrap: wrap;
                  margin-bottom: 28px;
                }

                .info-pill {
                  flex: 1;
                  min-width: 140px;
                  background: #fafaf9;
                  border: 1px solid #e7e5e4;
                  border-radius: 10px;
                  padding: 14px 16px;
                  text-align: center;
                }

                .info-pill .emoji {
                  font-size: 20px;
                  display: block;
                  margin-bottom: 6px;
                }

                .info-pill .pill-label {
                  font-size: 10px;
                  font-weight: 600;
                  letter-spacing: 0.1em;
                  text-transform: uppercase;
                  color: #a8a29e;
                  display: block;
                  margin-bottom: 3px;
                }

                .info-pill .pill-value {
                  font-size: 13px;
                  font-weight: 600;
                  color: #1c1917;
                }

                /* ─── FOOTER ─── */
                .footer {
                  background: #1c1917;
                  border-radius: 0 0 16px 16px;
                  padding: 28px 40px;
                }

                .footer-top {
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  flex-wrap: wrap;
                  gap: 16px;
                  padding-bottom: 20px;
                  margin-bottom: 20px;
                  border-bottom: 1px solid #292524;
                }

                .footer-brand {
                  font-family: 'Playfair Display', serif;
                  font-size: 16px;
                  color: #fff;
                }

                .footer-brand span { color: #ea580c; }

                .footer-copy {
                  font-size: 11.5px;
                  color: #57534e;
                  line-height: 1.7;
                  text-align: center;
                }

              </style>
            </head>
            <body>

            <div class="email-wrapper">

              <div class="header">
                <div class="brand">
                  <div class="brand-name">Resto<span>AI</span></div>
                </div>
                <div class="header-title">Support Center</div>
                <div class="header-subtitle">New Support Ticket<br>Received</div>
              </div>

              <div class="body">

                <p class="greeting">Hello, <strong>Admin</strong></p>
                <p class="intro">
                  A new support ticket has been submitted through your RestoAI platform. 
                  Please review the details below and respond at your earliest convenience.
                </p>

                <div class="info-row">
                  <div class="info-pill">
                    <span class="emoji">📅</span>
                    <span class="pill-label">Submitted</span>
                    <span class="pill-value">{{DATE}}</span>
                  </div>
                  <div class="info-pill">
                    <span class="emoji">🕐</span>
                    <span class="pill-label">Time</span>
                    <span class="pill-value">{{TIME}}</span>
                  </div>
                </div>

                <div class="details-card">
                  <div class="details-title">Ticket Details</div>

                  <div class="detail-row">
                    <div class="detail-label">Issue Type</div>
                    <div class="detail-value">
                      <span class="issue-type-badge">{{ISSUE_TYPE}}</span>
                    </div>
                  </div>

                  <div class="detail-row">
                    <div class="detail-label">Description</div>
                    <div class="detail-value">
                      <div class="description-box">{{DESCRIPTION}}</div>
                    </div>
                  </div>
                </div>

                <p style="font-size:13px; color:#78716c; line-height:1.65; text-align:center;">
                  This notification was sent automatically by the RestoAI system.<br>
                  Please do not reply to this email directly — use the dashboard to respond.
                </p>

              </div>

              <div class="footer">
                <div class="footer-top">
                  <div class="footer-brand">Resto<span>AI</span> · Support</div>
                </div>
                <p class="footer-copy">
                  © 2025 RestoAI — Restaurant Sales Prediction & Inventory Tracking.<br>
                  You're receiving this because you're an admin of a RestoAI workspace.<br>
                </p>
              </div>

            </div>

            </body>
            </html>
            """

            # 5. Inject the real data into the HTML string safely
            html_content = html_template.replace("{{TICKET_ID}}", ticket_id) \
                                        .replace("{{DATE}}", date_str) \
                                        .replace("{{TIME}}", time_str) \
                                        .replace("{{ISSUE_TYPE}}", issue_type) \
                                        .replace("{{DESCRIPTION}}", description)

            # Change from 'plain' to 'html'
            msg.attach(MIMEText(html_content, 'html'))

            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls() 
            server.login(sender_email, sender_password)
            text = msg.as_string()
            server.sendmail(sender_email, receiver_email, text)
            server.quit()

        return jsonify({"message": "Ticket submitted!"}), 201

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": "Failed to submit ticket."}), 500


# --- 2. GET ALL TICKETS (For Admins) ---
@tickets_bp.route('', methods=['GET', 'OPTIONS'], strict_slashes=False)
@jwt_required()
@requires_permission('manage_tickets')
def get_tickets():
    if request.method == "OPTIONS":
        return jsonify({}), 200
        
    try:
        # Sort by newest first
        tickets = list(db.tickets.find().sort("timestamp", -1))
        for t in tickets:
            t['_id'] = str(t['_id'])
        return jsonify(tickets), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch tickets"}), 500


# --- 3. UPDATE TICKET STATUS ---
@tickets_bp.route('/<ticket_id>/status', methods=['PUT', 'OPTIONS'], strict_slashes=False)
@jwt_required()
@requires_permission('edit_ticket_status')
def update_ticket_status(ticket_id):
    if request.method == "OPTIONS":
        return jsonify({}), 200
        
    try:
        data = request.get_json()
        new_status = data.get("status")
        
        if not new_status:
            return jsonify({"error": "Status is required"}), 400

        result = db.tickets.update_one(
            {"_id": ObjectId(ticket_id)},
            {"$set": {"status": new_status}}
        )

        if result.matched_count > 0:
            return jsonify({"message": "Status updated successfully"}), 200
        return jsonify({"error": "Ticket not found"}), 404
        
    except Exception as e:
        return jsonify({"error": "Failed to update status"}), 500
    
# --- 4. DELETE TICKET ---
@tickets_bp.route('/<ticket_id>', methods=['DELETE', 'OPTIONS'], strict_slashes=False)
@jwt_required()
@requires_permission('delete_tickets')
def delete_ticket(ticket_id):
    if request.method == "OPTIONS":
        return jsonify({}), 200
        
    try:
        result = db.tickets.delete_one({"_id": ObjectId(ticket_id)})
        if result.deleted_count > 0:
            return jsonify({"message": "Ticket deleted successfully"}), 200
        return jsonify({"error": "Ticket not found"}), 404
    except Exception as e:
        return jsonify({"error": "Failed to delete ticket"}), 500