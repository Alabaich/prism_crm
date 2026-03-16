from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import SessionLocal
from models import Booking, Lead, BlockedDate
import logging
import os
import sys
from datetime import datetime, timedelta
from mailer import send_booking_notification, create_ics_event

router = APIRouter()

# --- Setup File Logging ---
LOG_DIR = os.path.join(os.getcwd(), "logs")
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

logger = logging.getLogger("public_bookings")
logger.setLevel(logging.INFO)

if not logger.handlers:
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    file_handler = logging.FileHandler(os.path.join(LOG_DIR, "public_bookings.log"), encoding='utf-8')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
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
    booking_type: Optional[str] = "tour"  # 'tour' or 'meeting'


# --- GET /blocked-dates ---
@router.get("/blocked-dates")
def get_public_blocked_dates(db: Session = Depends(get_db)):
    logger.info("📅 Public frontend requested blocked dates.")
    dates = db.query(BlockedDate.date).all()
    return [d[0] for d in dates]


# --- GET /taken ---
# Returns taken slots regardless of booking_type — tours and meetings both block time
@router.get("/taken")
def get_taken_slots(building: str, date: str, db: Session = Depends(get_db)):
    logger.info(f"🕒 Checking taken slots for {building} on {date}")
    taken = db.query(Booking.tour_time).filter(
        Booking.building == building,
        Booking.tour_date == date,
        Booking.status != "cancelled"
    ).all()
    return [slot[0] for slot in taken]


# --- POST / ---
@router.post("/")
def create_booking(booking_data: BookingCreate, db: Session = Depends(get_db)):
    booking_type = booking_data.booking_type if booking_data.booking_type in ("tour", "meeting") else "tour"

    logger.info(f"🚀 New {booking_type} booking request from {booking_data.email} at {booking_data.building}")

    # Find or create lead
    if booking_data.phone and booking_data.phone.strip():
        existing_lead = db.query(Lead).filter(
            (Lead.email == booking_data.email) |
            (Lead.phone == booking_data.phone)
        ).first()
    else:
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

    # Prevent duplicate bookings
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

    # Create booking
    new_booking = Booking(
        lead_id=target_lead.id,
        building=booking_data.building,
        tour_date=booking_data.date,
        tour_time=booking_data.time,
        status="pending",
        booking_type=booking_type,
    )

    db.add(new_booking)

    try:
        db.commit()
        logger.info(f"💾 SAVED: {booking_type} booking (ID: {new_booking.id}) for Lead ID {target_lead.id}")
    except Exception as e:
        db.rollback()
        logger.error(f"❌ DB Save Error: {e}")
        raise HTTPException(status_code=500, detail="Booking could not be created")

    # Prepare email
    booking_info = {
        "id": new_booking.id,
        "name": booking_data.name,
        "email": booking_data.email,
        "phone": booking_data.phone,
        "building": booking_data.building,
        "date": booking_data.date,
        "time": booking_data.time,
        "status": "pending",
        "booking_type": booking_type,
    }

    # Generate ICS
    attachment_content = None
    attachment_name = None
    try:
        start_dt = datetime.strptime(f"{booking_data.date} {booking_data.time}", "%Y-%m-%d %H:%M")
        end_dt = start_dt + timedelta(hours=1)
        label = "Tour" if booking_type == "tour" else "Meeting"
        ics_str = create_ics_event(
            summary=f"{label} at {booking_data.building}",
            description=f"{label} with {booking_data.name}",
            location=booking_data.building,
            start_dt=start_dt,
            end_dt=end_dt
        )
        attachment_content = ics_str.encode('utf-8')
        attachment_name = "invite.ics"
        logger.info(f"📅 ICS generated for booking {new_booking.id}")
    except Exception as e:
        logger.error(f"❌ Failed to generate ICS: {e}")

    # Send notification
    try:
        send_booking_notification(
            booking_info,
            is_update=False,
            attachment_content=attachment_content,
            attachment_name=attachment_name
        )
        logger.info(f"📧 Notification sent to {booking_data.email} for booking {new_booking.id}")
    except Exception as e:
        logger.error(f"❌ Failed to send email for booking {new_booking.id}: {e}")

    logger.info(f"✅ {booking_type} booking completed for ID: {new_booking.id}")
    return {"status": "success", "booking_id": new_booking.id, "lead_id": target_lead.id}