from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from database import get_db
from models import Lead, Booking

router = APIRouter()

# --- Pydantic Schemas for Validation ---
class BookingCreate(BaseModel):
    building: str
    date: str
    time: str
    name: str
    email: str
    phone: str

# --- GET /taken (Checks availability for the frontend) ---
@router.get("/taken")
def get_taken_slots(building: str, date: str, db: Session = Depends(get_db)):
    """
    Returns a list of times already booked for a specific building and day.
    """
    taken = db.query(Booking.tour_time).filter(
        Booking.building == building,
        Booking.tour_date == date,
        Booking.status != "Cancelled"
    ).all()
    
    # Flatten the list of tuples into a simple list of strings
    return [slot[0] for slot in taken]

# --- POST / (Creates booking and merges with Lead) ---
@router.post("/")
def create_booking(booking_data: BookingCreate, db: Session = Depends(get_db)):
    """
    Main booking logic:
    1. Checks if a Lead exists by email or phone.
    2. If yes, uses existing lead. If no, creates new lead.
    3. Creates a booking attached to that lead.
    """
    
    # 1. Search for an existing lead (Merging logic)
    existing_lead = db.query(Lead).filter(
        (Lead.email == booking_data.email) | 
        (Lead.phone == booking_data.phone)
    ).first()
    
    if existing_lead:
        target_lead = existing_lead
    else:
        # 2. Create a new lead if they don't exist
        target_lead = Lead(
            prospect_name=booking_data.name,
            email=booking_data.email,
            phone=booking_data.phone,
            source="Website Booking",
            status="New"
        )
        db.add(target_lead)
        db.flush() # Flush to get the lead ID before committing

    # 3. Create the Booking linked to the lead
    new_booking = Booking(
        lead_id=target_lead.id,
        building=booking_data.building,
        tour_date=booking_data.date,
        tour_time=booking_data.time,
        status="Scheduled"
    )
    
    db.add(new_booking)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
    return {"status": "success", "booking_id": new_booking.id, "lead_id": target_lead.id}