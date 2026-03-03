import os
import json
import logging
import requests
import sys
import time
import re
from datetime import datetime, timedelta
from dotenv import load_dotenv

# --- PATH CONFIGURATION (UPDATED FOR NEW STRUCTURE) ---
WORKER_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(WORKER_DIR)

if BACKEND_ROOT not in sys.path:
    sys.path.append(BACKEND_ROOT)

# --- Import DB ---
try:
    from database import SessionLocal
    from models import Lead
    DB_AVAILABLE = True
except ImportError as e:
    DB_AVAILABLE = False
    print(f"⚠️ Warning: Could not import database. Error: {e}")

# --- Load Environment Variables ---
load_dotenv() 
load_dotenv(os.path.join(BACKEND_ROOT, '.env'))

CLIENT_ID = os.getenv("AZURE_CLIENT_ID")
TENANT_ID = os.getenv("AZURE_TENANT_ID")
TOKEN_ENDPOINT = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"

# --- File Paths ---
LOG_DIR = os.path.join(BACKEND_ROOT, "logs")
TOKEN_FILE = os.path.join(BACKEND_ROOT, "token.json")
PROCESSED_IDS_FILE = os.path.join(LOG_DIR, "processed_emails_rhenti.json")

# --- Setup Logging ---
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

sys.stdout.reconfigure(encoding='utf-8')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIR, "email_worker_rhenti.log"), encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("RhentiWorker")

# --- Helper Functions ---
def get_token_data():
    if not os.path.exists(TOKEN_FILE):
        logger.error(f"❌ Error: {TOKEN_FILE} not found.")
        return None
    try:
        with open(TOKEN_FILE, "r") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"❌ Error reading token file: {e}")
        return None

def save_token_data(data):
    try:
        with open(TOKEN_FILE, "w") as f:
            json.dump(data, f, indent=4)
        logger.info("💾 Token refreshed and saved.")
    except Exception as e:
        logger.error(f"❌ Error saving token file: {e}")

def refresh_access_token(refresh_token):
    if not refresh_token: return None
    payload = {
        "client_id": CLIENT_ID,
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "scope": "Mail.Read offline_access"
    }
    try:
        response = requests.post(TOKEN_ENDPOINT, data=payload)
        if response.status_code != 200: return None
        return response.json()
    except Exception: return None

def load_processed_ids():
    if not os.path.exists(PROCESSED_IDS_FILE):
        return set()
    try:
        with open(PROCESSED_IDS_FILE, "r") as f:
            data = json.load(f)
            return set(data)
    except Exception:
        return set()

def save_processed_id(email_id):
    current_ids = load_processed_ids()
    current_ids.add(email_id)
    try:
        with open(PROCESSED_IDS_FILE, "w") as f:
            json.dump(list(current_ids), f)
    except Exception as e:
        logger.error(f"❌ Error saving processed IDs: {e}")

def parse_graph_date(date_str):
    if not date_str: return datetime.utcnow()
    try:
        if date_str.endswith('Z'): date_str = date_str[:-1]
        if '.' in date_str:
            return datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%S.%f")
        else:
            return datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%S")
    except Exception:
        return datetime.utcnow()

def clean_html(raw_html):
    clean = re.sub(r'<[^>]+>', '', raw_html)
    return clean.strip()

def parse_rhenti_email(html_content, subject):
    data = {
        "source": "Rhenti", 
        "status": "New", 
        "debug_1": "", 
        "property_name": "Unknown Property", 
        "move_in_date": None,
        "prospect_name": "Unknown",
        "email": None,
        "phone": None
    }
    
    if "New Lead from" in subject:
        prop_match = re.search(r"inquiring about\s*<b><a[^>]*>(.*?)</a></b>", html_content, re.IGNORECASE | re.DOTALL)
        data["property_name"] = prop_match.group(1).strip() if prop_match else subject.replace("New Lead from Contact Form -", "").strip()
        
        name_match = re.search(r"Renter:\s*(.*?)\s*<br>", html_content, re.IGNORECASE)
        email_match = re.search(r"Email:\s*(.*?)\s*<br>", html_content, re.IGNORECASE)
        phone_match = re.search(r"Phone:\s*(.*?)\s*<br>", html_content, re.IGNORECASE)
        date_match = re.search(r"Move In Date:\s*(.*?)\s*<br>", html_content, re.IGNORECASE)
        budget_match = re.search(r"Budget:\s*(.*?)\s*<br>", html_content, re.IGNORECASE)

        data["prospect_name"] = name_match.group(1).strip() if name_match else "Unknown"
        data["email"] = email_match.group(1).strip() if email_match else None
        data["phone"] = phone_match.group(1).strip() if phone_match else ""
        data["move_in_date"] = date_match.group(1).strip() if date_match else None
        
        budget = budget_match.group(1).strip() if budget_match else "N/A"
        data["debug_1"] = f"Type: Contact Form | Budget: {budget}"

    elif "Viewing request" in subject:
        info_block_match = re.search(
            r"Renter info:</span>\s*<br>\s*<span[^>]*>(.*?)</span>\s*<br>\s*<span[^>]*>(.*?)</span>\s*<br>\s*<span[^>]*>(.*?)</span>", 
            html_content, 
            re.IGNORECASE | re.DOTALL
        )
        
        if info_block_match:
            data["prospect_name"] = info_block_match.group(1).strip()
            data["phone"] = info_block_match.group(2).strip()
            data["email"] = info_block_match.group(3).strip()
        else:
            data["prospect_name"] = "Unknown (Viewing Request)"
            data["email"] = None
        
        if " - " in subject:
            parts = subject.split(" - ")
            if len(parts) >= 3:
                 data["property_name"] = parts[-1].strip()
            else:
                 data["property_name"] = subject
        data["debug_1"] = f"Type: Viewing Request"

    elif "renter inquiry" in subject.lower():
        prop_match = re.search(r"inquiring about\s*<b><a[^>]*>(.*?)</a></b>", html_content, re.IGNORECASE | re.DOTALL)
        data["property_name"] = prop_match.group(1).strip() if prop_match else "Unknown Property"

        name_match = re.search(r"Renter:\s*(.*?)\s*<br>", html_content, re.IGNORECASE)
        email_match = re.search(r"Email:\s*(.*?)\s*<br>", html_content, re.IGNORECASE)
        phone_match = re.search(r"Phone:\s*(.*?)\s*<br>", html_content, re.IGNORECASE)
        
        msg_match = re.search(r"padding-left:20px; word-break:break-word\">(.*?)</div>", html_content, re.IGNORECASE | re.DOTALL)
        message = msg_match.group(1).strip() if msg_match else ""

        data["prospect_name"] = name_match.group(1).strip() if name_match else "Unknown"
        data["email"] = email_match.group(1).strip() if email_match else None
        
        raw_phone = phone_match.group(1).strip() if phone_match else ""
        data["phone"] = "" if "Not available" in raw_phone else raw_phone
        data["debug_1"] = f"Type: Renter Inquiry | Msg: {message[:200]}"
    
    elif "new messages from" in subject.lower():
        name_match = re.search(r"new messages from\s*(.*?)(?:from|$)", subject, re.IGNORECASE)
        if name_match:
            data["prospect_name"] = name_match.group(1).strip()
        else:
            data["prospect_name"] = "Unknown Chat User"
        data["debug_1"] = f"Type: Chat Notification"
    else:
        data["debug_1"] = f"Type: Unknown Format | Subj: {subject}"
        data["prospect_name"] = "Unknown Rhenti Lead"

    return data

def save_lead_to_db(lead_data, email_id, received_dt):
    if not DB_AVAILABLE:
        logger.info(f"🚫 DB Not Available. Would save: {lead_data['prospect_name']}")
        return True

    db = SessionLocal()
    try:
        received_str = received_dt.strftime("%Y-%m-%d %H:%M:%S")
        prop_name = (lead_data["property_name"] or "Unknown")[:250]
        
        new_lead = Lead(
            prospect_name=lead_data["prospect_name"],
            email=lead_data["email"],
            phone=lead_data["phone"],
            source="Rhenti", 
            integration_source="",  
            property_name=prop_name,
            move_in_date=lead_data.get("move_in_date"),
            debug_1=lead_data["debug_1"],
            debug_2=f"EmailID: {email_id} | Received: {received_str}", 
            status="New"
        )
        
        # Safe addition of created_at based on model compatibility
        try:
            new_lead.created_at = received_dt
        except Exception:
            pass

        db.add(new_lead)
        db.commit()
        logger.info(f"💾 SAVED TO DB: {lead_data['prospect_name']} ({prop_name})")
        return True

    except Exception as e:
        logger.error(f"❌ DB Save Error: {e}")
        db.rollback()
        return False
    finally:
        db.close()

# --- Main Worker Logic ---
def process_rhenti_mailbox():
    logger.info("🚀 Starting Rhenti Mailbox Scan (Last 30 Days)...")
    
    token_data = get_token_data()
    if not token_data: return

    access_token = token_data.get("access_token")
    processed_ids = load_processed_ids()
    
    days_back = 30
    date_threshold = (datetime.utcnow() - timedelta(days=days_back)).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    endpoint = "https://graph.microsoft.com/v1.0/me/messages"
    
    params = {
        "$select": "id,subject,from,receivedDateTime,body",
        "$top": 50, 
        "$orderby": "receivedDateTime desc",
        "$filter": f"receivedDateTime ge {date_threshold}"
    }

    emails_scanned = 0
    new_leads_count = 0

    while endpoint:
        headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
        
        try:
            if "skip" in endpoint or "skiptoken" in endpoint:
                response = requests.get(endpoint, headers=headers)
            else:
                response = requests.get(endpoint, headers=headers, params=params)

            if response.status_code == 401:
                logger.warning("⚠️ Token expired. Refreshing...")
                new_token = refresh_access_token(token_data.get("refresh_token"))
                if new_token:
                    save_token_data(new_token)
                    access_token = new_token['access_token']
                    continue 
                else:
                    return

            if response.status_code != 200:
                logger.error(f"❌ API Error: {response.text}")
                return

            data = response.json()
            emails = data.get("value", [])
            
            if not emails:
                logger.info("✅ No more emails in range.")
                break

            for email in emails:
                emails_scanned += 1
                msg_id = email.get("id")
                if msg_id in processed_ids:
                    continue

                sender_data = email.get("from", {}).get("emailAddress", {})
                sender_address = sender_data.get("address", "").lower()
                sender_name = sender_data.get("name", "")

                if sender_address != "contact@rhenti.com":
                    continue
                
                if "80 Bond" not in sender_name and "100 Bond" not in sender_name:
                    continue

                subject = email.get("subject", "")
                received_str = email.get("receivedDateTime")
                body_content = email.get("body", {}).get("content", "")

                logger.info(f"🔎 Processing Rhenti Lead: {subject} from {sender_name}")
                
                lead_data = parse_rhenti_email(body_content, subject)
                received_dt = parse_graph_date(received_str)

                if save_lead_to_db(lead_data, msg_id, received_dt):
                    save_processed_id(msg_id)
                    processed_ids.add(msg_id)
                    new_leads_count += 1
            
            endpoint = data.get("@odata.nextLink")
        
        except Exception as e:
            logger.error(f"❌ Error in process loop: {e}")
            break

    logger.info(f"🏁 Job Finished. Checked {emails_scanned} emails. Saved {new_leads_count} new leads.")

# Allow running standalone for testing
if __name__ == "__main__":
    process_rhenti_mailbox()