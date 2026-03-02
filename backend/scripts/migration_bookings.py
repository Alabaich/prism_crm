import os
import sys
import requests 
from sqlalchemy.orm import Session
from datetime import datetime

# Add the parent directory to the path so we can import your FastAPI modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
# IMPORTANT: We now import BOTH Lead and Booking to handle the relationship
from models import Booking, Lead  

# ==========================================
# CONFIGURATION - APP 2 (Bookings)
# ==========================================
BOOKING_API_URL = "https://booking.enjob.ca/api/bookings"

def migrate_bookings_from_lite_sql(db: Session):
    print("--- Starting migration: LiteSQL API -> New Bookings Table ---")
    try:
        print(f"Fetching data from {BOOKING_API_URL}...")
        response = requests.get(BOOKING_API_URL, timeout=15)
        response.raise_for_status()
        bookings = response.json()

        print(f"Found {len(bookings)} bookings. Mapping to relational database structure...")

        inserted_count = 0
        for b in bookings:
            # Safely parse the datetime string from SQLite
            created_at_val = datetime.utcnow()
            if b.get('created_at'):
                try:
                    # Handle typical JS ISO strings ending with Z
                    created_at_val = datetime.fromisoformat(b['created_at'].replace('Z', '+00:00'))
                except ValueError:
                    pass

            # ========================================================
            # STEP 1: Smarter Find or Create Lead Logic
            # ========================================================
            email = b.get('email')
            phone = b.get('phone')
            name = b.get('name')
            
            lead = None
            
            # 1a. Try to match by Email first
            if email:
                lead = db.query(Lead).filter(Lead.email == email).first()
            
            # 1b. If no email match, try matching by Phone Number
            if not lead and phone:
                lead = db.query(Lead).filter(Lead.phone == phone).first()
            
            if lead:
                # 1c. WE FOUND THEM! Let's make sure we don't lose alternate data.
                # If they used a new phone number, save it to the debug_1 notes
                if phone and lead.phone != phone:
                    existing_notes = lead.debug_1 or ""
                    lead.debug_1 = f"[Booking used Alt Phone: {phone}] {existing_notes}"
                
                # If they spelled their name differently, save it to the debug_1 notes
                if name and lead.prospect_name != name:
                    existing_notes = lead.debug_1 or ""
                    lead.debug_1 = f"[Booking used Alt Name: {name}] {existing_notes}"
            else:
                # 1d. If they don't exist at all, create a new Lead entry
                lead = Lead(
                    prospect_name=name,
                    email=email,
                    phone=phone,
                    source="Tour Booking App",
                    created_at=created_at_val
                )
                db.add(lead)
                
            # Flush sends the insert/updates to the database to generate an ID, 
            # but doesn't permanently commit the transaction yet.
            db.flush() 

            # ========================================================
            # STEP 2: Create the Booking using the exact schema
            # ========================================================
            new_booking = Booking(
                lead_id=lead.id,                     # Relates to the Lead we just found/created
                building=b.get('building'),          
                tour_date=b.get('date'),             
                tour_time=b.get('time'),             
                status=b.get('status', 'pending'),
                created_at=created_at_val
            )
            
            db.add(new_booking)
            inserted_count += 1
        
        db.commit()
        print(f"✅ Successfully migrated {inserted_count} Bookings & synced relationships!\n")

    except requests.exceptions.RequestException as e:
        print(f"❌ Network error while fetching bookings: {e}")
    except Exception as e:
        print(f"❌ Error migrating Bookings: {e}")
        db.rollback()

if __name__ == "__main__":
    print("🚀 Starting Bookings Migration Script...")
    db_session = SessionLocal()
    try:
        migrate_bookings_from_lite_sql(db_session)
    finally:
        db_session.close()