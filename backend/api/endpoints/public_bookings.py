from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import SessionLocal
from models import Booking, Lead, BlockedDate
import logging
import os
import sys
from datetime import datetime, timedelta
from mailer import send_booking_notification, create_ics_event  # <-- added ICS generator

router = APIRouter()

# --- Setup File Logging ---
LOG_DIR = os.path.join(os.getcwd(), "logs")
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

logger = logging.getLogger("public_bookings")
logger.setLevel(logging.INFO)

# Prevent adding handlers multiple times in FastAPI
if not logger.handlers:
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    # Save to file
    file_handler = logging.FileHandler(os.path.join(LOG_DIR, "public_bookings.log"), encoding='utf-8')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    
    # Print to console
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

# --- Database Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Pydantic Schema ---
class BookingCreate(BaseModel):
    building: str
    date: str
    time: str
    name: str
    email: str
    phone: str

# --- GET /blocked-dates (Tells the public form which days are unavailable) ---
@router.get("/blocked-dates")
def get_public_blocked_dates(db: Session = Depends(get_db)):
    """
    Returns a simple list of blocked dates (e.g., ["2026-03-05", "2026-03-10"])
    so the public frontend can disable them in the dropdown.
    """
    logger.info("📅 Public frontend requested blocked dates.")
    dates = db.query(BlockedDate.date).all()
    return [d[0] for d in dates]

# --- GET /taken (Checks hourly availability for the frontend) ---
@router.get("/taken")
def get_taken_slots(building: str, date: str, db: Session = Depends(get_db)):
    """
    Returns a list of times already booked for a specific building and day.
    """
    logger.info(f"🕒 Public frontend checking taken slots for {building} on {date}")
    taken = db.query(Booking.tour_time).filter(
        Booking.building == building,
        Booking.tour_date == date,
        Booking.status != "cancelled"
    ).all()
    
    return [slot[0] for slot in taken]

# --- POST / (Creates booking and merges with Lead) ---
@router.post("/")
def create_booking(booking_data: BookingCreate, db: Session = Depends(get_db)):
    """
    Main booking logic:
    1. Checks if a Lead exists by email or phone.
    2. If yes, uses existing lead. If no, creates new lead.
    3. Prevents duplicate bookings for the exact same slot.
    4. Creates a booking attached to that lead.
    5. Sends email notification with calendar invitation.
    """
    logger.info(f"🚀 New public booking request received for {booking_data.email} at {booking_data.building}")
    
    # Find or create lead
    if booking_data.phone and booking_data.phone.strip():
        existing_lead = db.query(Lead).filter(
            (Lead.email == booking_data.email) | 
            (Lead.phone == booking_data.phone)
        ).first()
    else:
        # If they left phone blank, ONLY search by email
        existing_lead = db.query(Lead).filter(Lead.email == booking_data.email).first()
    
    if existing_lead:
        target_lead = existing_lead
        logger.info(f"🔗 Existing lead found (ID: {target_lead.id}). Merging booking.")
    else:
        target_lead = Lead(
            prospect_name=booking_data.name,
            email=booking_data.email,
            phone=booking_data.phone,
            source="Website Booking",
            status="New"
        )
        db.add(target_lead)
        db.flush() 
        logger.info(f"👤 Created new lead (ID: {target_lead.id}) for {booking_data.email}")

    # --- RESTORED: Prevent Duplicate Bookings (The Button Mash Fix) ---
    existing_booking = db.query(Booking).filter(
        Booking.lead_id == target_lead.id,
        Booking.building == booking_data.building,
        Booking.tour_date == booking_data.date,
        Booking.tour_time == booking_data.time
    ).first()

    if existing_booking:
        logger.warning(f"⚠️ Duplicate booking prevented for Lead ID {target_lead.id} at {booking_data.time}")
        return {
            "status": "success", 
            "message": "Booking already exists",
            "booking_id": existing_booking.id, 
            "lead_id": target_lead.id
        }
    # ------------------------------------------------------------------

    # Create booking
    new_booking = Booking(
        lead_id=target_lead.id,
        building=booking_data.building,
        tour_date=booking_data.date,
        tour_time=booking_data.time,
        status="pending"
    )
    
    db.add(new_booking)
    
    try:
        db.commit()
        logger.info(f"💾 SAVED TO DB: New booking (ID: {new_booking.id}) for Lead ID {target_lead.id}")
    except Exception as e:
        db.rollback()
        logger.error(f"❌ DB Save Error during booking creation: {e}")
        raise HTTPException(status_code=500, detail="Booking could not be created")

    # Prepare booking data for email
    booking_info = {
        "id": new_booking.id,
        "name": booking_data.name,
        "email": booking_data.email,
        "phone": booking_data.phone,
        "building": booking_data.building,
        "date": booking_data.date,
        "time": booking_data.time,
        "status": "pending"
    }

    # Generate ICS attachment
    attachment_content = None
    attachment_name = None
    try:
        # Parse start datetime (assuming date format YYYY-MM-DD and time HH:MM)
        start_dt = datetime.strptime(f"{booking_data.date} {booking_data.time}", "%Y-%m-%d %H:%M")
        end_dt = start_dt + timedelta(hours=1)  # assume 1-hour tour

        ics_str = create_ics_event(
            summary=f"Tour at {booking_data.building}",
            description=f"Tour with {booking_data.name}",
            location=booking_data.building,
            start_dt=start_dt,
            end_dt=end_dt
        )
        attachment_content = ics_str.encode('utf-8')
        attachment_name = "invite.ics"
        logger.info(f"📅 ICS generated for booking {new_booking.id}")
    except Exception as e:
        logger.error(f"❌ Failed to generate ICS for booking {new_booking.id}: {e}")

    # Send email notification with attachment if available
    try:
        send_booking_notification(
            booking_info,
            is_update=False,
            attachment_content=attachment_content,
            attachment_name=attachment_name
        )
        logger.info(f"📧 Notification email successfully sent to {booking_data.email} for booking {new_booking.id}")
    except Exception as e:
        # Log but do not fail the booking
        logger.error(f"❌ Failed to send email for booking {new_booking.id}: {e}")
    
    logger.info(f"✅ Public booking process completed for ID: {new_booking.id}")
    return {"status": "success", "booking_id": new_booking.id, "lead_id": target_lead.id}