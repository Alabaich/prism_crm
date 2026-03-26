from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import SessionLocal
from models import Booking, Lead, BlockedDate, Building, AdminUser
import logging
import os
import sys
from datetime import datetime, timedelta
from mailer import send_booking_notification, create_ics_event

router = APIRouter()

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


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class BookingCreate(BaseModel):
    building: str
    date: str
    time: str
    name: str
    email: str
    phone: str
    booking_type: Optional[str] = "tour"


class MeetingCreate(BaseModel):
    date: str
    time: str
    name: str
    email: str
    phone: str


# --- Shared helpers ---

def find_or_create_lead(booking_data, db: Session):
    if booking_data.phone and booking_data.phone.strip():
        existing = db.query(Lead).filter(
            (Lead.email == booking_data.email) |
            (Lead.phone == booking_data.phone)
        ).first()
    else:
        existing = db.query(Lead).filter(Lead.email == booking_data.email).first()

    if existing:
        logger.info(f"🔗 Existing lead found (ID: {existing.id}). Merging booking.")
        return existing

    lead = Lead(
        prospect_name=booking_data.name,
        email=booking_data.email,
        phone=booking_data.phone,
        source="Website Booking",
        status="New"
    )
    db.add(lead)
    db.flush()
    logger.info(f"👤 Created new lead (ID: {lead.id}) for {booking_data.email}")
    return lead


def build_and_send_notification(booking_data, new_booking, booking_type, agent_email=None):
    booking_info = {
        "id": new_booking.id,
        "name": booking_data.name,
        "email": booking_data.email,
        "phone": booking_data.phone,
        "building": getattr(booking_data, 'building', 'Meeting'),
        "date": booking_data.date,
        "time": booking_data.time,
        "status": "pending",
        "booking_type": booking_type,
    }

    attachment_content = None
    attachment_name = None
    try:
        start_dt = datetime.strptime(f"{booking_data.date} {booking_data.time}", "%Y-%m-%d %H:%M")
        end_dt = start_dt + timedelta(hours=1)
        label = "Tour" if booking_type == "tour" else "Meeting"
        building_label = getattr(booking_data, 'building', 'Meeting')
        ics_str = create_ics_event(
            summary=f"{label} at {building_label}",
            description=f"{label} with {booking_data.name}",
            location=building_label,
            start_dt=start_dt,
            end_dt=end_dt
        )
        attachment_content = ics_str.encode('utf-8')
        attachment_name = "invite.ics"
    except Exception as e:
        logger.error(f"❌ Failed to generate ICS: {e}")

    try:
        send_booking_notification(
            booking_info,
            is_update=False,
            attachment_content=attachment_content,
            attachment_name=attachment_name,
            agent_email=agent_email
        )
    except Exception as e:
        logger.error(f"❌ Failed to send email for booking {new_booking.id}: {e}")



# --- GET /buildings ---
@router.get("/buildings")
def get_public_buildings(db: Session = Depends(get_db)):
    logger.info("🏢 Public frontend requested available buildings.")
    # Return just a flat list of building names for the frontend dropdown
    buildings = db.query(Building.name).all()
    return [b[0] for b in buildings]
    
# --- GET /blocked-dates ---
@router.get("/blocked-dates")
def get_public_blocked_dates(db: Session = Depends(get_db)):
    logger.info("📅 Public frontend requested blocked dates.")
    dates = db.query(BlockedDate.date).all()
    return [d[0] for d in dates]


# --- GET /taken ---
# Now agent-scoped: checks if the agent is busy at that time across all bookings
@router.get("/taken")
def get_taken_slots(building: str, date: str, db: Session = Depends(get_db)):
    logger.info(f"🕒 Checking taken slots for {building} on {date}")

    # Find which admin owns this building
    building_obj = db.query(Building).filter(Building.name == building).first()

    if building_obj and building_obj.assigned_admin_id:
        # Agent-scoped: any booking by this agent on this date blocks the slot
        taken = db.query(Booking.tour_time).filter(
            Booking.assigned_admin_id == building_obj.assigned_admin_id,
            Booking.tour_date == date,
            Booking.status != "cancelled"
        ).all()
    else:
        # Fallback: building-scoped (old behaviour)
        taken = db.query(Booking.tour_time).filter(
            Booking.building == building,
            Booking.tour_date == date,
            Booking.status != "cancelled"
        ).all()

    return [slot[0] for slot in taken]


# --- GET /meeting-info/{token} ---
@router.get("/meeting-info/{token}")
def get_meeting_info(token: str, db: Session = Depends(get_db)):
    admin = db.query(AdminUser).filter(AdminUser.booking_token == token).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Invalid meeting link")
    return {
        "agent_name": admin.username,
        "agent_id": admin.id,
    }


# --- GET /meeting-taken/{token} ---
# Availability check for meeting booking page — agent-scoped, no building
@router.get("/meeting-taken/{token}")
def get_meeting_taken_slots(token: str, date: str, db: Session = Depends(get_db)):
    admin = db.query(AdminUser).filter(AdminUser.booking_token == token).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Invalid meeting link")

    taken = db.query(Booking.tour_time).filter(
        Booking.assigned_admin_id == admin.id,
        Booking.tour_date == date,
        Booking.status != "cancelled"
    ).all()
    return [slot[0] for slot in taken]


# --- POST / --- (tour booking — unchanged URL)
@router.post("/")
def create_booking(booking_data: BookingCreate, db: Session = Depends(get_db)):
    booking_type = booking_data.booking_type if booking_data.booking_type in ("tour", "meeting") else "tour"
    logger.info(f"🚀 New {booking_type} booking from {booking_data.email} at {booking_data.building}")

    # Resolve building + assigned admin
    building_obj = db.query(Building).filter(Building.name == booking_data.building).first()
    assigned_admin_id = building_obj.assigned_admin_id if building_obj else None
    agent_email = None
    if assigned_admin_id:
        admin = db.query(AdminUser).filter(AdminUser.id == assigned_admin_id).first()
        agent_email = admin.email if admin else None

    target_lead = find_or_create_lead(booking_data, db)

    # Prevent duplicate
    existing_booking = db.query(Booking).filter(
        Booking.lead_id == target_lead.id,
        Booking.building == booking_data.building,
        Booking.tour_date == booking_data.date,
        Booking.tour_time == booking_data.time
    ).first()

    if existing_booking:
        logger.warning(f"⚠️ Duplicate booking prevented for Lead ID {target_lead.id}")
        return {
            "status": "success",
            "message": "Booking already exists",
            "booking_id": existing_booking.id,
            "lead_id": target_lead.id
        }

    new_booking = Booking(
        lead_id=target_lead.id,
        building=booking_data.building,
        building_id=building_obj.id if building_obj else None,
        tour_date=booking_data.date,
        tour_time=booking_data.time,
        status="pending",
        booking_type=booking_type,
        assigned_admin_id=assigned_admin_id,
    )
    db.add(new_booking)

    try:
        db.commit()
        logger.info(f"💾 SAVED: booking {new_booking.id} → admin {assigned_admin_id}")
    except Exception as e:
        db.rollback()
        logger.error(f"❌ DB Save Error: {e}")
        raise HTTPException(status_code=500, detail="Booking could not be created")

    build_and_send_notification(booking_data, new_booking, booking_type, agent_email)

    return {"status": "success", "booking_id": new_booking.id, "lead_id": target_lead.id}


# --- POST /meeting/{token} ---
@router.post("/meeting/{token}")
def create_meeting_booking(token: str, booking_data: MeetingCreate, db: Session = Depends(get_db)):
    logger.info(f"🚀 New meeting booking from {booking_data.email} via token {token}")

    admin = db.query(AdminUser).filter(AdminUser.booking_token == token).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Invalid meeting link")

    target_lead = find_or_create_lead(booking_data, db)

    # Prevent duplicate
    existing_booking = db.query(Booking).filter(
        Booking.lead_id == target_lead.id,
        Booking.assigned_admin_id == admin.id,
        Booking.tour_date == booking_data.date,
        Booking.tour_time == booking_data.time,
        Booking.booking_type == "meeting"
    ).first()

    if existing_booking:
        logger.warning(f"⚠️ Duplicate meeting prevented for Lead ID {target_lead.id}")
        return {
            "status": "success",
            "message": "Booking already exists",
            "booking_id": existing_booking.id,
            "lead_id": target_lead.id
        }

    new_booking = Booking(
        lead_id=target_lead.id,
        building="Meeting",
        tour_date=booking_data.date,
        tour_time=booking_data.time,
        status="pending",
        booking_type="meeting",
        assigned_admin_id=admin.id,
    )
    db.add(new_booking)

    try:
        db.commit()
        logger.info(f"💾 SAVED: meeting {new_booking.id} → admin {admin.id} ({admin.username})")
    except Exception as e:
        db.rollback()
        logger.error(f"❌ DB Save Error: {e}")
        raise HTTPException(status_code=500, detail="Meeting could not be created")

    build_and_send_notification(booking_data, new_booking, "meeting", admin.email)

    return {"status": "success", "booking_id": new_booking.id, "lead_id": target_lead.id}