from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import SessionLocal
from models import Booking, Lead, BlockedDate # <-- IMPORT BlockedDate

router = APIRouter()

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
    # Query only the 'date' column for efficiency
    dates = db.query(BlockedDate.date).all()
    # Flatten the result from list of tuples [(date1,), (date2,)] to [date1, date2]
    return [d[0] for d in dates]

# --- GET /taken (Checks hourly availability for the frontend) ---
@router.get("/taken")
def get_taken_slots(building: str, date: str, db: Session = Depends(get_db)):
    """
    Returns a list of times already booked for a specific building and day.
    """
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
    3. Creates a booking attached to that lead.
    """
    existing_lead = db.query(Lead).filter(
        (Lead.email == booking_data.email) | 
        (Lead.phone == booking_data.phone)
    ).first()
    
    if existing_lead:
        target_lead = existing_lead
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
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
    return {"status": "success", "booking_id": new_booking.id, "lead_id": target_lead.id}