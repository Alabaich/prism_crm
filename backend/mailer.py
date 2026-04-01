"""
Mailer module for sending booking notifications via SMTP.
Uses environment variables for SMTP configuration.
Includes ICS calendar invitation generation and polished HTML templates.
"""

import os
import logging
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

logger = logging.getLogger("Mailer")

# Load SMTP settings from environment
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))  # default to 587 if not set
SMTP_SECURE = os.getenv("SMTP_SECURE", "").lower() == "true"  # true => use SSL
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)  # fallback to SMTP_USER
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "customercare@prismpm.ca")

# --- Helper: Generate ICS file ---
def create_ics_event(
    summary: str,
    description: str,
    location: str,
    start_dt: datetime,
    end_dt: datetime
) -> str:
    """Generate a simple iCalendar (.ics) string for a single event."""
    uid = f"{start_dt.strftime('%Y%m%d%H%M%S')}@{location.replace(' ', '')}.prism"
    ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Prism CRM//Booking System//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:{uid}
DTSTAMP:{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}
DTSTART:{start_dt.strftime('%Y%m%dT%H%M%S')}
DTEND:{end_dt.strftime('%Y%m%dT%H%M%S')}
SUMMARY:{summary}
DESCRIPTION:{description}
LOCATION:{location}
END:VEVENT
END:VCALENDAR"""
    return ics_content

# --- Core email sender with attachment support ---
def send_email_smtp(
    to_recipients: List[str],
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
    attachment_content: Optional[bytes] = None,
    attachment_name: Optional[str] = None
) -> bool:
    """Send an email using the configured SMTP server. Optionally attach a file."""
    if not all([SMTP_HOST, SMTP_USER, SMTP_PASS]):
        logger.error("SMTP_HOST, SMTP_USER, or SMTP_PASS not set in environment")
        return False

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = SMTP_FROM
    msg['To'] = ", ".join(to_recipients)

    if text_body:
        msg.attach(MIMEText(text_body, 'plain'))
    msg.attach(MIMEText(html_body, 'html'))

    if attachment_content and attachment_name:
        part = MIMEApplication(attachment_content, Name=attachment_name)
        part['Content-Disposition'] = f'attachment; filename="{attachment_name}"'
        msg.attach(part)

    try:
        if SMTP_SECURE:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT)
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
            server.starttls(context=ssl.create_default_context())

        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_FROM, to_recipients, msg.as_string())
        server.quit()
        logger.info(f"Email sent successfully to {to_recipients}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False

# --- Public function for booking notifications ---
def send_booking_notification(
    booking: Dict[str, Any],
    is_update: bool = False,
    attachment_content: Optional[bytes] = None,
    attachment_name: Optional[str] = None,
    agent_email: Optional[str] = None
) -> bool:
    """
    Send an email notification for a booking.
    booking: dict with keys: id, name, email, phone, building, date, time, status
    is_update: if True, this is a status update notification.
    attachment_content: optional bytes of file to attach (e.g., .ics)
    attachment_name: filename for the attachment
    """
    recipient = booking.get("email")
    if not recipient:
        logger.error("No recipient email in booking data.")
        return False

    recipients = [recipient, ADMIN_EMAIL]
    if agent_email and agent_email != ADMIN_EMAIL and agent_email != recipient:
        recipients.append(agent_email)

    # --- Helper to get badge style based on status ---
    def get_badge_style(status: str) -> str:
        status_lower = status.lower()
        if status_lower == "confirmed":
            return "background-color: #e8f5e9; color: #2e7d32;"
        elif status_lower == "cancelled":
            return "background-color: #ffebee; color: #c62828;"
        else:  # pending or others
            return "background-color: #fff3e0; color: #bf360c;"

    # --- Beautiful HTML templates ---
    if is_update:
        subject = f"Booking Status Update: {booking['building']} on {booking['date']}"
        badge_style = get_badge_style(booking['status'])
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f7; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }}
                .header {{ background: #1a1a1a; padding: 24px; text-align: center; }}
                .header h1 {{ margin: 0; color: #ffffff; font-size: 24px; font-weight: 500; }}
                .content {{ padding: 32px; }}
                .details-card {{ background: #f9f9fc; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #eaeef5; }}
                .detail-row {{ display: flex; padding: 8px 0; border-bottom: 1px solid #eaeef5; }}
                .detail-label {{ width: 100px; color: #64748b; }}
                .detail-value {{ flex: 1; font-weight: 500; color: #0f172a; }}
                .footer {{ text-align: center; padding: 24px; font-size: 14px; color: #94a3b8; border-top: 1px solid #eaeef5; }}
                .button {{ display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Prism · Tour Status Update</h1>
                </div>
                <div class="content">
                    <p style="font-size: 18px; margin-top: 0;">Hello {booking['name']},</p>
                    <p>Your tour booking status has been updated.</p>
                    <div style="text-align: center; margin: 24px 0;">
                        <span style="display: inline-block; padding: 8px 16px; border-radius: 30px; font-size: 14px; font-weight: 600; text-transform: uppercase; {badge_style}">
                            {booking['status'].upper()}
                        </span>
                    </div>
                    <div class="details-card">
                        <div class="detail-row"><span class="detail-label">Building</span><span class="detail-value">{booking['building']}</span></div>
                        <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">{booking['date']}</span></div>
                        <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">{booking['time']}</span></div>
                        <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">{booking['name']}</span></div>
                        <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">{booking['email']}</span></div>
                        <div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">{booking.get('phone', 'N/A')}</span></div>
                    </div>
                    <p>If you have any questions, feel free to reply to this email.</p>
                    <p style="margin-bottom: 0;">Best regards,<br>The Prism Team</p>
                </div>
                <div class="footer">
                    © {datetime.now().year} Prism. All rights reserved.
                </div>
            </div>
        </body>
        </html>
        """
        text_content = f"""
Your booking status has been updated.
Name: {booking['name']}
Email: {booking['email']}
Phone: {booking.get('phone', 'N/A')}
Building: {booking['building']}
Date: {booking['date']}
Time: {booking['time']}
New Status: {booking['status']}
        """
    else:
        subject = f"Booking Confirmation: {booking['building']} on {booking['date']}"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f7; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }}
                .header {{ background: #1a1a1a; padding: 24px; text-align: center; }}
                .header h1 {{ margin: 0; color: #ffffff; font-size: 24px; font-weight: 500; }}
                .content {{ padding: 32px; }}
                .badge {{ display: inline-block; padding: 6px 12px; border-radius: 30px; font-size: 13px; font-weight: 500; background: #e2e8f0; color: #334155; margin-bottom: 16px; }}
                .details-card {{ background: #f9f9fc; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #eaeef5; }}
                .detail-row {{ display: flex; padding: 8px 0; border-bottom: 1px solid #eaeef5; }}
                .detail-label {{ width: 100px; color: #64748b; }}
                .detail-value {{ flex: 1; font-weight: 500; color: #0f172a; }}
                .footer {{ text-align: center; padding: 24px; font-size: 14px; color: #94a3b8; border-top: 1px solid #eaeef5; }}
                .calendar-note {{ background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 24px 0; font-size: 14px; color: #475569; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Prism · Tour Confirmed</h1>
                </div>
                <div class="content">
                    <p style="font-size: 18px; margin-top: 0;">Hello {booking['name']},</p>
                    <p>Thank you for booking a tour with Prism! Your request has been received and is pending confirmation.</p>
                    <div class="badge">STATUS: PENDING</div>
                    <div class="details-card">
                        <div class="detail-row"><span class="detail-label">Building</span><span class="detail-value">{booking['building']}</span></div>
                        <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">{booking['date']}</span></div>
                        <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">{booking['time']}</span></div>
                        <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">{booking['name']}</span></div>
                        <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">{booking['email']}</span></div>
                        <div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">{booking.get('phone', 'N/A')}</span></div>
                    </div>
                    <div class="calendar-note">
                        📅 A calendar invitation (<strong>invite.ics</strong>) is attached to this email. You can open it to add the tour to your calendar.
                    </div>
                    <p>We'll review your request and send a confirmation as soon as possible.</p>
                    <p style="margin-bottom: 0;">Best regards,<br>The Prism Team</p>
                </div>
                <div class="footer">
                    © {datetime.now().year} Prism. All rights reserved.
                </div>
            </div>
        </body>
        </html>
        """
        text_content = f"""
Thank you for your booking!
Name: {booking['name']}
Email: {booking['email']}
Phone: {booking.get('phone', 'N/A')}
Building: {booking['building']}
Date: {booking['date']}
Time: {booking['time']}
Status: {booking['status']}
We will review your request and confirm shortly.
        """

    return send_email_smtp(
        recipients,
        subject,
        html_content,
        text_content,
        attachment_content,
        attachment_name
    )

# --- NEW: Public function for daily reminders ---
def send_reminder_notification(booking: Dict[str, Any]) -> bool:
    """
    Send a day-of reminder email to the customer ONLY.
    """
    recipient = booking.get("email")
    if not recipient:
        logger.error("No recipient email in booking data for reminder.")
        return False

    # Only sending to customer, NO admin email
    recipients = [recipient]

    subject = f"Reminder: Your Tour Today at {booking['building']}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{ font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f7; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }}
            .header {{ background: #1a1a1a; padding: 24px; text-align: center; }}
            .header h1 {{ margin: 0; color: #ffffff; font-size: 24px; font-weight: 500; }}
            .content {{ padding: 32px; }}
            .details-card {{ background: #f9f9fc; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #eaeef5; }}
            .detail-row {{ display: flex; padding: 8px 0; border-bottom: 1px solid #eaeef5; }}
            .detail-label {{ width: 100px; color: #64748b; }}
            .detail-value {{ flex: 1; font-weight: 500; color: #0f172a; }}
            .footer {{ text-align: center; padding: 24px; font-size: 14px; color: #94a3b8; border-top: 1px solid #eaeef5; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Prism · Tour Reminder</h1>
            </div>
            <div class="content">
                <p style="font-size: 18px; margin-top: 0;">Good morning {booking['name']},</p>
                <p>This is a friendly reminder that you have a tour scheduled for <strong>today</strong>.</p>
                <div class="details-card">
                    <div class="detail-row"><span class="detail-label">Building</span><span class="detail-value">{booking['building']}</span></div>
                    <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">{booking['time']}</span></div>
                </div>
                <p>We look forward to seeing you! If you need to reschedule, please reply directly to this email.</p>
                <p style="margin-bottom: 0;">Best regards,<br>The Prism Team</p>
            </div>
            <div class="footer">
                © {datetime.now().year} Prism. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """

    text_content = f"""
Good morning {booking['name']},

This is a friendly reminder that you have a tour scheduled for today.

Building: {booking['building']}
Time: {booking['time']}

We look forward to seeing you! If you need to reschedule, please reply directly to this email.

Best regards,
The Prism Team
    """

    return send_email_smtp(recipients, subject, html_content, text_content)


# --- Application reminder: 48 hours ---
def send_application_reminder_48h(signer_name: str, signer_email: str, token: str, building: Optional[str]) -> bool:
    """Send a friendly 48-hour nudge to an applicant who hasn't completed their application."""
    BASE_URL = os.getenv("FRONTEND_URL", "https://prismpm.cloud")
    signing_url = f"{BASE_URL}/pub_apply/{token}"
    building_line = f" for <strong>{building}</strong>" if building else ""

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{ font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f7; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }}
            .header {{ background: #1a1a1a; padding: 24px; text-align: center; }}
            .header h1 {{ margin: 0; color: #ffffff; font-size: 24px; font-weight: 500; }}
            .content {{ padding: 32px; }}
            .cta-button {{ display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 24px 0; }}
            .footer {{ text-align: center; padding: 24px; font-size: 14px; color: #94a3b8; border-top: 1px solid #eaeef5; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Prism · Application Reminder</h1>
            </div>
            <div class="content">
                <p style="font-size: 18px; margin-top: 0;">Hi {signer_name},</p>
                <p>Just a friendly reminder — your rental application{building_line} is still waiting to be completed.</p>
                <p>It only takes a few minutes. Click the button below to pick up right where you left off.</p>
                <div style="text-align: center;">
                    <a href="{signing_url}" class="cta-button">Complete My Application</a>
                </div>
                <p style="font-size: 13px; color: #94a3b8;">If the button doesn't work, copy and paste this link into your browser:<br>{signing_url}</p>
                <p style="margin-bottom: 0;">Best regards,<br><strong>Prism Property Management</strong></p>
            </div>
            <div class="footer">
                <p>© {datetime.now().year} Prism Property Management. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

    text = f"""Hi {signer_name},

Just a friendly reminder — your rental application{' for ' + building if building else ''} is still waiting to be completed.

Complete your application here:
{signing_url}

Best regards,
Prism Property Management
"""
    return send_email_smtp(
        to_recipients=[signer_email],
        subject="Reminder: Your application is still waiting",
        html_body=html,
        text_body=text
    )


# --- Application reminder: 96 hours ---
def send_application_reminder_96h(signer_name: str, signer_email: str, token: str, building: Optional[str]) -> bool:
    """Send a final-reminder 96-hour nudge to an applicant who hasn't completed their application."""
    BASE_URL = os.getenv("FRONTEND_URL", "https://prismpm.cloud")
    signing_url = f"{BASE_URL}/pub_apply/{token}"
    building_line = f" for <strong>{building}</strong>" if building else ""

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{ font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f7; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }}
            .header {{ background: #1a1a1a; padding: 24px; text-align: center; }}
            .header h1 {{ margin: 0; color: #ffffff; font-size: 24px; font-weight: 500; }}
            .content {{ padding: 32px; }}
            .cta-button {{ display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 24px 0; }}
            .notice {{ background: #fff8ed; border: 1px solid #f5d98b; border-radius: 10px; padding: 16px 20px; margin: 24px 0; font-size: 14px; color: #7a4f00; }}
            .footer {{ text-align: center; padding: 24px; font-size: 14px; color: #94a3b8; border-top: 1px solid #eaeef5; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Prism · Final Reminder</h1>
            </div>
            <div class="content">
                <p style="font-size: 18px; margin-top: 0;">Hi {signer_name},</p>
                <p>This is your final reminder — your rental application{building_line} is still incomplete.</p>
                <div class="notice">
                    ⚠️ Your application link will expire soon. Please complete it as soon as possible to keep your spot.
                </div>
                <div style="text-align: center;">
                    <a href="{signing_url}" class="cta-button">Complete My Application</a>
                </div>
                <p style="font-size: 13px; color: #94a3b8;">If the button doesn't work, copy and paste this link into your browser:<br>{signing_url}</p>
                <p>If you have any questions or need help, just reply to this email.</p>
                <p style="margin-bottom: 0;">Best regards,<br><strong>Prism Property Management</strong></p>
            </div>
            <div class="footer">
                <p>© {datetime.now().year} Prism Property Management. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

    text = f"""Hi {signer_name},

This is your final reminder — your rental application{' for ' + building if building else ''} is still incomplete.

Your application link will expire soon. Please complete it as soon as possible to keep your spot.

Complete your application here:
{signing_url}

If you have any questions, just reply to this email.

Best regards,
Prism Property Management
"""
    return send_email_smtp(
        to_recipients=[signer_email],
        subject="Final reminder: Your application link expires soon",
        html_body=html,
        text_body=text
    )

# Example usage (for testing)
if __name__ == "__main__":
    test_booking = {
        "id": 123,
        "name": "John Doe",
        "email": "enjoyable.design@gmail.com",
        "phone": "555-1234",
        "building": "80 Bond",
        "date": "2026-03-15",
        "time": "10:00",
        "status": "pending"
    }
    start = datetime.strptime(f"{test_booking['date']} {test_booking['time']}", "%Y-%m-%d %H:%M")
    end = start + timedelta(hours=1)
    ics = create_ics_event(
        summary=f"Tour at {test_booking['building']}",
        description=f"Tour with {test_booking['name']}",
        location=test_booking['building'],
        start_dt=start,
        end_dt=end
    ).encode('utf-8')
    
    # Test standard notification
    send_booking_notification(test_booking, is_update=False, attachment_content=ics, attachment_name="invite.ics")
    
    # Test reminder notification
    # send_reminder_notification(test_booking)