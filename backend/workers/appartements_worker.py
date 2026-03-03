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
PROCESSED_IDS_FILE = os.path.join(LOG_DIR, "processed_apartments_emails.json")

# --- Setup Logging ---
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

sys.stdout.reconfigure(encoding='utf-8')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIR, "appartements_worker.log"), encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("AppartementsWorker")

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

def parse_apartments_email(html_content):
    """Parses HTML content for Apartments.com lead data."""
    data = {"source": "Apartments.com", "status": "New"}

    name_match = re.search(r"Name:\s*(.*?)\s*<br>", html_content, re.IGNORECASE)
    data["prospect_name"] = name_match.group(1).strip() if name_match else "Unknown"

    email_match = re.search(r'href="mailto:(.*?)"', html_content, re.IGNORECASE)
    data["email"] = email_match.group(1).strip() if email_match else None

    phone_match = re.search(r'href="tel:(.*?)"', html_content, re.IGNORECASE)
    data["phone"] = phone_match.group(1).strip() if phone_match else ""

    prop_match = re.search(r'To:\s*<a[^>]*>(.*?)</a>', html_content, re.IGNORECASE | re.DOTALL)
    if prop_match:
        data["property_name"] = prop_match.group(1).strip()
    else:
        addr_match = re.search(r'Property Address 1:\s*<a[^>]*>(.*?)</a>', html_content, re.IGNORECASE | re.DOTALL)
        data["property_name"] = addr_match.group(1).strip() if addr_match else "Unknown Property"

    date_match = re.search(r"Move Date:\s*(.*?)\s*<br>", html_content, re.IGNORECASE)
    if date_match:
        try:
            dt = datetime.strptime(date_match.group(1).strip(), "%m/%d/%Y")
            data["move_in_date"] = dt.strftime("%Y-%m-%d")
        except:
            data["move_in_date"] = None
    else:
        data["move_in_date"] = None

    rent_match = re.search(r"Max Rent:\s*(.*?)\s*<br>", html_content, re.IGNORECASE)
    beds_match = re.search(r"Beds/Baths:\s*(.*?)\s*<br>", html_content, re.IGNORECASE)
    
    comments_match = re.search(r"Comments:\s*(.*?)\s*<span", html_content, re.IGNORECASE | re.DOTALL)
    raw_comments = comments_match.group(1).strip() if comments_match else ""
    clean_comments = re.sub(r'<br\s*/?>', '\n', raw_comments)
    clean_comments = re.sub(r'<[^>]+>', '', clean_comments)

    data["debug_1"] = f"Rent: {rent_match.group(1) if rent_match else 'N/A'} | Beds: {beds_match.group(1) if beds_match else 'N/A'}"
    data["message"] = clean_comments
    return data

def save_lead_to_db(lead_data, email_id, received_dt):
    """Saves the parsed lead to the database with the correct timestamp."""
    if not DB_AVAILABLE:
        logger.info(f"🚫 DB Not Available. Would save: {lead_data['prospect_name']}")
        return True

    db = SessionLocal()
    try:
        # Combine message into debug_1 since DB model lacks 'message' column
        safe_msg = (lead_data["message"] or "").replace('\n', ' ').strip()
        combined_debug_1 = f"{lead_data['debug_1']} | Msg: {safe_msg}"
        combined_debug_1 = combined_debug_1[:500] 

        received_str = received_dt.strftime("%Y-%m-%d %H:%M:%S")

        new_lead = Lead(
            prospect_name=lead_data["prospect_name"],
            email=lead_data["email"],
            phone=lead_data["phone"],
            source=lead_data["source"],
            integration_source="Email Scraper", 
            property_name=lead_data["property_name"],
            move_in_date=lead_data["move_in_date"],
            debug_1=combined_debug_1,
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
        logger.info(f"💾 SAVED TO DB: {lead_data['prospect_name']} ({lead_data['property_name']}) at {received_str}")
        return True
    except Exception as e:
        logger.error(f"❌ DB Save Error: {e}")
        db.rollback()
        return False
    finally:
        db.close()

# --- Main Worker Logic ---
def process_mailbox():
    logger.info("🚀 Starting Appartements Mailbox Scan Job...")
    
    token_data = get_token_data()
    if not token_data: 
        logger.error("❌ No token data found. Aborting scan.")
        return

    access_token = token_data.get("access_token")
    processed_ids = load_processed_ids()
    
    # Filter: Last 30 Days
    days_back = 30
    date_threshold = (datetime.utcnow() - timedelta(days=days_back)).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    endpoint = "https://graph.microsoft.com/v1.0/me/messages"
    
    params = {
        "$select": "id,subject,from,receivedDateTime,body",
        "$top": 50,
        "$orderby": "receivedDateTime desc",
        "$filter": f"receivedDateTime ge {date_threshold}"
    }

    logger.info(f"📅 Scanning emails since {date_threshold}...")
    
    emails_processed_count = 0
    new_leads_count = 0
    
    while endpoint:
        headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
        
        try:
            if "skip" in endpoint or "skiptoken" in endpoint:
                response = requests.get(endpoint, headers=headers)
            else:
                response = requests.get(endpoint, headers=headers, params=params)

            if response.status_code == 401:
                logger.warning("⚠️ Access token expired. Attempting to refresh...")
                new_token_data = refresh_access_token(token_data.get("refresh_token"))
                
                if new_token_data:
                    token_data.update(new_token_data)
                    save_token_data(token_data)
                    access_token = token_data.get("access_token")
                    continue
                else:
                    logger.error("❌ Token refresh failed. Manual intervention required.")
                    return # Stop processing

            if response.status_code != 200:
                logger.error(f"❌ API Error: {response.status_code} - {response.text}")
                break

            data = response.json()
            emails = data.get("value", [])
            
            if not emails:
                break

            for msg in emails:
                msg_id = msg.get("id")
                if msg_id in processed_ids:
                    continue

                sender_obj = msg.get("from", {}).get("emailAddress", {})
                sender_addr = (sender_obj.get("address") or "").lower()
                subject = (msg.get("subject") or "").lower()

                if "apartments.com" in sender_addr and ("lead" in subject or "network" in subject):
                    body_content = msg.get("body", {}).get("content", "")
                    received_str = msg.get("receivedDateTime")
                    
                    logger.info(f"🔎 Found new lead email: {subject} (Received: {received_str})")
                    
                    lead_data = parse_apartments_email(body_content)
                    received_dt = parse_graph_date(received_str)

                    if save_lead_to_db(lead_data, msg_id, received_dt):
                        save_processed_id(msg_id)
                        processed_ids.add(msg_id)
                        new_leads_count += 1
                
                emails_processed_count += 1

            endpoint = data.get("@odata.nextLink")
            if not endpoint:
                logger.info("✅ Page loop finished.")

        except Exception as e:
            logger.error(f"❌ Error in process loop: {e}")
            break

    logger.info(f"🏁 Job Finished. Checked {emails_processed_count} emails. Saved {new_leads_count} new leads.")

# Allow running standalone for testing or via orchestrator
if __name__ == "__main__":
    process_mailbox()