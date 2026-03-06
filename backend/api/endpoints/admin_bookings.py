from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import SessionLocal
from models import Booking, Lead, BlockedDate, Tenant # <-- Added Tenant here
import logging
from datetime import datetime, timedelta
from mailer import send_booking_notification, create_ics_event  # <-- import mailer and ICS generator

router = APIRouter()
logger = logging.getLogger("admin_bookings")

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
    Fetches all bookings and JOINs the Lead table to get the prospect's contact info.
    """
    results = (
        db.query(Booking, Lead)
        .join(Lead, Booking.lead_id == Lead.id)
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
            "tour_outcome": booking.tour_outcome, # NEW: Added this so frontend can show the conversion!
            "created_at": booking.created_at,
            "name": lead.prospect_name,
            "email": lead.email,
            "phone": lead.phone,
            "source": lead.source
        })
        
    return formatted_bookings

# --- PUT /{id}/status (Updates status from Admin Dashboard) ---
@router.put("/{booking_id}/status")
def update_booking_status(booking_id: int, payload: StatusUpdate, db: Session = Depends(get_db)):
    """
    Updates the status of a specific booking and sends email notification.
    For 'confirmed' status, a calendar invitation (.ics) is attached.
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    valid_statuses = ["pending", "confirmed", "cancelled", "Scheduled", "Cancelled", "Completed"]
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")
    
    # Store old status to detect change
    old_status = booking.status
    booking.status = payload.status
    db.commit()
    
    # If status actually changed to a final state (confirmed/cancelled), send email
    if old_status != payload.status and payload.status in ["confirmed", "cancelled"]:
        # Fetch the associated lead
        lead = db.query(Lead).filter(Lead.id == booking.lead_id).first()
        if not lead:
            logger.error(f"Lead not found for booking {booking_id}")
            return {"message": f"Booking {booking_id} status updated to {payload.status}"}
        
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
                end_dt = start_dt + timedelta(hours=1)  # assume 1-hour tour
                ics_str = create_ics_event(
                    summary=f"Tour at {booking.building}",
                    description=f"Tour with {lead.prospect_name}",
                    location=booking.building,
                    start_dt=start_dt,
                    end_dt=end_dt
                )
                attachment_content = ics_str.encode('utf-8')
                attachment_name = "invite.ics"
                logger.info(f"ICS generated for booking {booking.id}")
            except Exception as e:
                logger.error(f"Failed to generate ICS for booking {booking.id}: {e}")
        
        # Send email notification
        try:
            send_booking_notification(
                booking_info,
                is_update=True,
                attachment_content=attachment_content,
                attachment_name=attachment_name
            )
            logger.info(f"Status update email sent for booking {booking.id}")
        except Exception as e:
            logger.error(f"Failed to send status update email for booking {booking.id}: {e}")
    
    return {"message": f"Booking {booking_id} status updated to {payload.status}"}

# --- NEW: THE TROJAN HORSE ENDPOINT ---
@router.put("/{booking_id}/outcome")
def update_booking_outcome(booking_id: int, payload: OutcomeUpdate, db: Session = Depends(get_db)):
    """
    Records the outcome of the tour.
    If 'Converted to Tenant', it automatically creates a Tenant record for future portal use.
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # 1. Update the booking outcome (Boss gets his analytics)
    booking.tour_outcome = payload.tour_outcome
    booking.status = "Completed" # Naturally, if there's an outcome, the tour happened

    # 2. Check for the magic conversion word
    if payload.tour_outcome == "Converted to Tenant":
        lead = db.query(Lead).filter(Lead.id == booking.lead_id).first()
        
        if lead:
            # Update Lead Status
            lead.status = "Tenant"
            
            # 3. Create the Tenant Record (Your future-proof architecture)
            existing_tenant = db.query(Tenant).filter(Tenant.lead_id == lead.id).first()
            if not existing_tenant:
                new_tenant = Tenant(
                    lead_id=lead.id,
                    lease_status="Pending Signature"
                )
                db.add(new_tenant)

    db.commit()
    return {"status": "success", "message": f"Booking outcome marked as {payload.tour_outcome}"}


# --- BLOCKED DATES ADMIN ENDPOINTS ---

@router.get("/blocked-dates")
def get_blocked_dates(db: Session = Depends(get_db)):
    """Fetches all blocked dates for the Admin Calendar."""
    return db.query(BlockedDate).all()

@router.post("/blocked-dates")
def block_date(payload: BlockedDateCreate, db: Session = Depends(get_db)):
    """Blocks a specific date."""
    existing = db.query(BlockedDate).filter(BlockedDate.date == payload.date).first()
    if existing:
        return {"message": "Date is already blocked"}
    
    new_blocked = BlockedDate(date=payload.date, reason=payload.reason)
    db.add(new_blocked)
    db.commit()
    return {"status": "success", "message": f"Blocked {payload.date}"}

@router.delete("/blocked-dates/{date}")
def unblock_date(date: str, db: Session = Depends(get_db)):
    """Unblocks a specific date."""
    blocked = db.query(BlockedDate).filter(BlockedDate.date == date).first()
    if blocked:
        db.delete(blocked)
        db.commit()
    return {"status": "success", "message": f"Unblocked {date}"}