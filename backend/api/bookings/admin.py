from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import SessionLocal
from models import Booking, Lead, BlockedDate, Tenant
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

logger = logging.getLogger("admin_bookings")
logger.setLevel(logging.INFO)

if not logger.handlers:
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    file_handler = logging.FileHandler(os.path.join(LOG_DIR, "admin_bookings.log"), encoding='utf-8')
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


# --- Pydantic Schemas ---
class StatusUpdate(BaseModel):
    status: str

class OutcomeUpdate(BaseModel):
    tour_outcome: str

class BlockedDateCreate(BaseModel):
    date: str
    reason: str | None = None
    admin_user_id: int | None = None


# --- GET / ---
@router.get("/")
def get_all_bookings(admin_id: int = None, db: Session = Depends(get_db)):
    logger.info(f"📊 Admin dashboard requested bookings. Filter admin_id={admin_id}")
    query = (
        db.query(Booking, Lead)
        .outerjoin(Lead, Booking.lead_id == Lead.id)
    )
    if admin_id:
        query = query.filter(Booking.assigned_admin_id == admin_id)
    results = query.order_by(Booking.tour_date.desc(), Booking.tour_time.desc()).all()

    formatted_bookings = []
    for booking, lead in results:
        formatted_bookings.append({
            "id": booking.id,
            "building": booking.building,
            "date": booking.tour_date,
            "time": booking.tour_time,
            "status": booking.status,
            "tour_outcome": booking.tour_outcome,
            "booking_type": booking.booking_type or "tour",  # fallback for old rows
            "created_at": booking.created_at,
            "name": lead.prospect_name if lead else "MISSING LEAD INFO",
            "email": lead.email if lead else "no-email@error.com",
            "phone": lead.phone if lead else "N/A",
            "source": lead.source if lead else "Unknown",
            "assigned_admin_id": booking.assigned_admin_id,
        })

    return formatted_bookings


# --- PUT /{id}/status ---
@router.put("/{booking_id}/status")
def update_booking_status(booking_id: int, payload: StatusUpdate, db: Session = Depends(get_db)):
    logger.info(f"🔄 Admin updating status for booking {booking_id} to '{payload.status}'")
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    valid_statuses = ["pending", "confirmed", "cancelled", "Scheduled", "Cancelled", "Completed"]
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")

    old_status = booking.status
    booking.status = payload.status

    if old_status != payload.status and payload.status in ["confirmed", "cancelled"]:
        lead = db.query(Lead).filter(Lead.id == booking.lead_id).first()
        if not lead:
            logger.error(f"❌ Cannot send email for booking {booking_id}. Lead missing.")
            db.commit()
            return {"message": f"Status updated to {payload.status}, but no email sent (Lead info missing)."}

        booking_info = {
            "id": booking.id,
            "name": lead.prospect_name,
            "email": lead.email,
            "phone": lead.phone,
            "building": booking.building,
            "date": booking.tour_date,
            "time": booking.tour_time,
            "status": payload.status,
            "booking_type": booking.booking_type or "tour",
        }

        attachment_content = None
        attachment_name = None
        if payload.status == "confirmed":
            try:
                start_dt = datetime.strptime(f"{booking.tour_date} {booking.tour_time}", "%Y-%m-%d %H:%M")
                end_dt = start_dt + timedelta(hours=1)
                label = "Meeting" if (booking.booking_type == "meeting") else "Tour"
                ics_str = create_ics_event(
                    summary=f"{label} at {booking.building}",
                    description=f"{label} with {lead.prospect_name}",
                    location=booking.building,
                    start_dt=start_dt,
                    end_dt=end_dt
                )
                attachment_content = ics_str.encode('utf-8')
                attachment_name = "invite.ics"
            except Exception as e:
                logger.error(f"❌ Failed to generate ICS: {e}")

        try:
            send_booking_notification(booking_info, is_update=True,
                                      attachment_content=attachment_content,
                                      attachment_name=attachment_name)
        except Exception as e:
            logger.error(f"❌ Failed to send email for booking {booking_id}: {e}")

    db.commit()
    logger.info(f"✅ Booking {booking_id} status updated to '{payload.status}'")
    return {"status": "success", "message": f"Booking status updated to {payload.status}"}


# --- PUT /{id}/outcome ---
@router.put("/{booking_id}/outcome")
def update_booking_outcome(booking_id: int, payload: OutcomeUpdate, db: Session = Depends(get_db)):
    logger.info(f"🎯 Admin updating outcome for booking {booking_id} to '{payload.tour_outcome}'")
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.tour_outcome = payload.tour_outcome
    booking.status = "Completed"

    if payload.tour_outcome == "Converted to Tenant":
        lead = db.query(Lead).filter(Lead.id == booking.lead_id).first()
        if lead:
            lead.status = "Tenant"
            existing_tenant = db.query(Tenant).filter(Tenant.lead_id == lead.id).first()
            if not existing_tenant:
                new_tenant = Tenant(lead_id=lead.id, lease_status="Pending Signature")
                db.add(new_tenant)
                logger.info(f"🏠 Lead {lead.id} converted to Tenant.")

    db.commit()
    logger.info(f"✅ Booking {booking_id} outcome: '{payload.tour_outcome}'")
    return {"status": "success", "message": f"Booking outcome marked as {payload.tour_outcome}"}


# --- BLOCKED DATES ---


@router.get("/blocked-dates")
def get_blocked_dates(admin_user_id: int = None, db: Session = Depends(get_db)):
    query = db.query(BlockedDate)
    if admin_user_id:
        query = query.filter(BlockedDate.admin_user_id == admin_user_id)
    return query.all()

@router.post("/blocked-dates")
def block_date(payload: BlockedDateCreate, db: Session = Depends(get_db)):
    existing = db.query(BlockedDate).filter(
        BlockedDate.date == payload.date,
        BlockedDate.admin_user_id == payload.admin_user_id
    ).first()
    if existing:
        return {"message": "Date is already blocked"}
    db.add(BlockedDate(date=payload.date, reason=payload.reason, admin_user_id=payload.admin_user_id))
    db.commit()
    logger.info(f"🔒 Blocked date: {payload.date}")
    return {"status": "success", "message": f"Blocked {payload.date}"}

@router.delete("/blocked-dates/{date}")
def unblock_date(date: str, admin_user_id: int = None, db: Session = Depends(get_db)):
    query = db.query(BlockedDate).filter(BlockedDate.date == date)
    if admin_user_id:
        query = query.filter(BlockedDate.admin_user_id == admin_user_id)
    blocked = query.first()
    if blocked:
        db.delete(blocked)
        db.commit()
        logger.info(f"🔓 Unblocked date: {date}")
    return {"status": "success", "message": f"Unblocked {date}"}