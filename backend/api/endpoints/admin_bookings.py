from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import SessionLocal
from models import Booking, Lead

router = APIRouter()

# --- Database Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Pydantic Schema ---
class StatusUpdate(BaseModel):
    status: str

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
    Updates the status of a specific booking (e.g., 'confirmed' or 'cancelled')
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    valid_statuses = ["pending", "confirmed", "cancelled", "Scheduled", "Cancelled"]
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")
        
    booking.status = payload.status
    db.commit()
    
    return {"message": f"Booking {booking_id} status updated to {payload.status}"}