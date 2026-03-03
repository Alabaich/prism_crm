#!/usr/bin/env python3
"""
Test script to send an email via Microsoft Graph API using the existing token.
Place this in backend/scripts/test_send_mail.py
Run from inside the Docker container:
    docker exec -it prism_backend python /code/scripts/test_send_mail.py
"""

import os
import sys
import json
import requests
from datetime import datetime, timedelta

# Adjust path so we can import from the workers (or directly reuse token logic)
# Assuming the script is in backend/scripts/, backend root is one level up
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import token helpers from one of the workers (they are identical)
# You can also copy the functions directly if you prefer.
from workers.appartements_worker import get_token_data, refresh_access_token, save_token_data, logger

# Configure logging (optional, but helpful)
import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("SendTest")

def send_test_email():
    """Send a test email to two addresses."""
    token_data = get_token_data()
    if not token_data:
        logger.error("❌ No token data found.")
        return

    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")

    # Recipients
    to_emails = [
        "enjoyable.design@gmail.com",
        "customercare@prismpm.ca"
    ]

    # Build the email message
    email_msg = {
        "message": {
            "subject": "Test Email from Prism CRM",
            "body": {
                "contentType": "Text",
                "content": "This is a test email sent to verify that the Mail.Send scope is working correctly.\n\nIf you receive this, the token has the proper permissions."
            },
            "toRecipients": [{"emailAddress": {"address": email}} for email in to_emails]
        },
        "saveToSentItems": "true"
    }

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    # Send the email
    response = requests.post(
        "https://graph.microsoft.com/v1.0/me/sendMail",
        headers=headers,
        json=email_msg,
        timeout=30
    )

    if response.status_code == 202:
        logger.info("✅ Test email sent successfully to both recipients!")
    elif response.status_code == 401:
        logger.warning("⚠️ Token expired. Attempting to refresh...")
        new_token = refresh_access_token(refresh_token)
        if new_token:
            save_token_data(new_token)
            logger.info("✅ Token refreshed. Please re-run the script.")
        else:
            logger.error("❌ Token refresh failed. You may need to re-authenticate.")
    else:
        logger.error(f"❌ Failed to send email. Status {response.status_code}: {response.text}")

if __name__ == "__main__":
    send_test_email()