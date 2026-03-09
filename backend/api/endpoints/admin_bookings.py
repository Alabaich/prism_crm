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

# Prevent adding handlers multiple times in FastAPI
if not logger.handlers:
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    # Save to file
    file_handler = logging.FileHandler(os.path.join(LOG_DIR, "admin_bookings.log"), encoding='utf-8')
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

# --- Pydantic Schemas ---
class StatusUpdate(BaseModel):
    status: str

# NEW: Schema for the outcome of the tour
class OutcomeUpdate(BaseModel):
    tour_outcome: str

class BlockedDateCreate(BaseModel):
    date: str
    reason: str | None = None

# --- GET / (Reads all bookings for the Admin Dashboard) ---
@router.get("/")
def get_all_bookings(db: Session = Depends(get_db)):
    """
    Fetches all bookings using an OUTER JOIN.
    This ensures that even if a Lead is missing, the booking still shows up 
    on the dashboard so it can be fixed manually.
    """
    logger.info("📊 Admin dashboard requested all bookings.")
    results = (
        db.query(Booking, Lead)
        .outerjoin(Lead, Booking.lead_id == Lead.id)
        .order_by(Booking.tour_date.desc(), Booking.tour_time.desc())
        .all()
    )
    
    formatted_bookings = []
    for booking, lead in results:
        formatted_bookings.append({
            "id": booking.id,
            "building": booking.building,
            "date": booking.tour_date,
            "time": booking.tour_time,
            "status": booking.status,
            "tour_outcome": booking.tour_outcome,
            "created_at": booking.created_at,
            # If lead is missing (due to a deletion error), we provide fallbacks
            "name": lead.prospect_name if lead else "MISSING LEAD INFO",
            "email": lead.email if lead else "no-email@error.com",
            "phone": lead.phone if lead else "N/A",
            "source": lead.source if lead else "Unknown"
        })
        
    return formatted_bookings

# --- PUT /{id}/status (Updates status from Admin Dashboard) ---
@router.put("/{booking_id}/status")
def update_booking_status(booking_id: int, payload: StatusUpdate, db: Session = Depends(get_db)):
    """
    Updates the status of a specific booking and sends email notification.
    """
    logger.info(f"🔄 Admin updating status for booking {booking_id} to '{payload.status}'")
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        logger.warning(f"⚠️ Booking {booking_id} not found for status update.")
        raise HTTPException(status_code=404, detail="Booking not found")
    
    valid_statuses = ["pending", "confirmed", "cancelled", "Scheduled", "Cancelled", "Completed"]
    if payload.status not in valid_statuses:
        logger.warning(f"⚠️ Invalid status '{payload.status}' requested for booking {booking_id}.")
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")
    
    # Store old status to detect change
    old_status = booking.status
    booking.status = payload.status
    
    # If status actually changed to a final state (confirmed/cancelled), send email
    if old_status != payload.status and payload.status in ["confirmed", "cancelled"]:
        # Fetch the associated lead
        lead = db.query(Lead).filter(Lead.id == booking.lead_id).first()
        
        # LOGIC CHECK: We cannot send an email if the Lead record is missing 
        # because the Booking table doesn't store the email address itself.
        if not lead:
            logger.error(f"❌ CRITICAL: Cannot send email for booking {booking_id}. Lead record is missing from DB.")
            db.commit() # Save the status anyway
            return {"message": f"Status updated to {payload.status}, but no email sent (Lead info missing)."}
        
        # Prepare booking info dict
        booking_info = {
            "id": booking.id,
            "name": lead.prospect_name,
            "email": lead.email,
            "phone": lead.phone,
            "building": booking.building,
            "date": booking.tour_date,
            "time": booking.tour_time,
            "status": booking.status
        }
        
        attachment_content = None
        attachment_name = None
        
        # If confirmed, generate ICS attachment
        if payload.status == "confirmed":
            try:
                start_dt = datetime.strptime(f"{booking.tour_date} {booking.tour_time}", "%Y-%m-%d %H:%M")
                end_dt = start_dt + timedelta(hours=1)
                ics_str = create_ics_event(
                    summary=f"Tour at {booking.building}",
                    description=f"Tour with {lead.prospect_name}",
                    location=booking.building,
                    start_dt=start_dt,
                    end_dt=end_dt
                )
                attachment_content = ics_str.encode('utf-8')
                attachment_name = "invite.ics"
                logger.info(f"📅 ICS generated for booking {booking.id}")
            except Exception as e:
                logger.error(f"❌ Failed to generate ICS for booking {booking.id}: {e}")
        
        # Send email notification
        try:
            send_booking_notification(
                booking_info,
                is_update=True,
                attachment_content=attachment_content,
                attachment_name=attachment_name
            )
            logger.info(f"📧 Status update email sent for booking {booking.id}")
        except Exception as e:
            logger.error(f"❌ Failed to send status update email for booking {booking.id}: {e}")
    
    # Commit at the end to keep the session alive during lead lookup
    db.commit()
    logger.info(f"✅ Booking {booking_id} status successfully updated to {payload.status}")
    return {"message": f"Booking {booking_id} status updated to {payload.status}"}

# --- NEW: THE TROJAN HORSE ENDPOINT ---
@router.put("/{booking_id}/outcome")
def update_booking_outcome(booking_id: int, payload: OutcomeUpdate, db: Session = Depends(get_db)):
    """
    Records the outcome of the tour.
    """
    logger.info(f"🎯 Admin updating outcome for booking {booking_id} to '{payload.tour_outcome}'")
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        logger.warning(f"⚠️ Booking {booking_id} not found for outcome update.")
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.tour_outcome = payload.tour_outcome
    booking.status = "Completed"

    if payload.tour_outcome == "Converted to Tenant":
        lead = db.query(Lead).filter(Lead.id == booking.lead_id).first()
        
        if lead:
            lead.status = "Tenant"
            existing_tenant = db.query(Tenant).filter(Tenant.lead_id == lead.id).first()
            if not existing_tenant:
                new_tenant = Tenant(
                    lead_id=lead.id,
                    lease_status="Pending Signature"
                )
                db.add(new_tenant)
                logger.info(f"🏠 Lead {lead.id} converted to Tenant. New Tenant record created.")
            else:
                logger.info(f"🏠 Lead {lead.id} converted to Tenant. Existing Tenant record found.")

    db.commit()
    logger.info(f"✅ Booking {booking_id} outcome successfully recorded as '{payload.tour_outcome}'")
    return {"status": "success", "message": f"Booking outcome marked as {payload.tour_outcome}"}


# --- BLOCKED DATES ADMIN ENDPOINTS ---

@router.get("/blocked-dates")
def get_blocked_dates(db: Session = Depends(get_db)):
    logger.info("📅 Admin requested blocked dates list.")
    return db.query(BlockedDate).all()

@router.post("/blocked-dates")
def block_date(payload: BlockedDateCreate, db: Session = Depends(get_db)):
    existing = db.query(BlockedDate).filter(BlockedDate.date == payload.date).first()
    if existing:
        logger.warning(f"⚠️ Attempted to block already blocked date: {payload.date}")
        return {"message": "Date is already blocked"}
    
    new_blocked = BlockedDate(date=payload.date, reason=payload.reason)
    db.add(new_blocked)
    db.commit()
    logger.info(f"🔒 Admin blocked date: {payload.date} (Reason: {payload.reason})")
    return {"status": "success", "message": f"Blocked {payload.date}"}

@router.delete("/blocked-dates/{date}")
def unblock_date(date: str, db: Session = Depends(get_db)):
    blocked = db.query(BlockedDate).filter(BlockedDate.date == date).first()
    if blocked:
        db.delete(blocked)
        db.commit()
        logger.info(f"🔓 Admin unblocked date: {date}")
    else:
        logger.warning(f"⚠️ Attempted to unblock non-existent date: {date}")
    return {"status": "success", "message": f"Unblocked {date}"}