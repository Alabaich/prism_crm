from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Core Prospect Info (This is what we will search against to merge bookings!)
    prospect_name = Column(String, index=True, nullable=True)
    email = Column(String, index=True, nullable=True)
    phone = Column(String, nullable=True)
    
    # Source Info
    source = Column(String, nullable=True)               # e.g., "RentSync", "Website Booking"
    integration_source = Column(String, nullable=True)   # e.g., "Zumper"
    
    # Property Info
    inquiry_date = Column(DateTime, nullable=True)
    property_name = Column(String, nullable=True)
    city = Column(String, nullable=True)
    beds = Column(String, nullable=True)
    baths = Column(String, nullable=True)
    
    # Mapping Columns
    move_in_date = Column(String, nullable=True)
    promotion = Column(String, nullable=True)
    
    # Status
    status = Column(String, default="New", index=True)
    
    # Debugging Columns
    debug_1 = Column(Text, nullable=True)
    debug_2 = Column(Text, nullable=True)

    # --- RELATIONSHIPS ---
    # One Lead can have multiple Bookings. This links the Lead to the Booking table.
    bookings = relationship("Booking", back_populates="lead")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # --- FOREIGN KEY ---
    # This specifically links this booking to a Lead ID in the leads table
    lead_id = Column(Integer, ForeignKey("leads.id")) 
    
    # Tour Details
    building = Column(String, index=True)
    tour_date = Column(String, index=True) # e.g., '2026-03-05'
    tour_time = Column(String)             # e.g., '14:00'
    
    status = Column(String, default="Scheduled") # Can be Scheduled, Cancelled, Completed

    # --- RELATIONSHIPS ---
    # This allows us to easily access the Lead info from the Booking object
    lead = relationship("Lead", back_populates="bookings")