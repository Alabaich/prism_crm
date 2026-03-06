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
    # Standard flow: New -> Tour Scheduled -> Application -> Tenant
    status = Column(String, default="New", index=True)
    
    # Debugging Columns
    debug_1 = Column(Text, nullable=True)
    debug_2 = Column(Text, nullable=True)

    # --- RELATIONSHIPS ---
    # One Lead can have multiple Bookings.
    bookings = relationship("Booking", back_populates="lead")
    
    # NEW: One Lead becomes exactly one Tenant profile (uselist=False makes it 1-to-1)
    tenant = relationship("Tenant", back_populates="lead", uselist=False)


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # --- FOREIGN KEY ---
    lead_id = Column(Integer, ForeignKey("leads.id")) 
    
    # Tour Details
    building = Column(String, index=True)
    tour_date = Column(String, index=True) # e.g., '2026-03-05'
    tour_time = Column(String)             # e.g., '14:00'
    
    status = Column(String, default="Scheduled") # Can be Scheduled, Cancelled, Completed

    # NEW: Granular analytics for the boss. Tracks exactly what happened after THIS specific tour.
    tour_outcome = Column(String, nullable=True) # e.g., "Converted to Tenant", "Not Interested", "No Show"

    # --- RELATIONSHIPS ---
    lead = relationship("Lead", back_populates="bookings")


# --- NEW: FUTURE-PROOF TENANT TABLE ---
# This serves the boss's Monday deadline for "analytics" but sets you up for the Tenant Portal later.
class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # --- FOREIGN KEY ---
    # unique=True ensures one Lead can't accidentally spawn multiple tenant portal accounts
    lead_id = Column(Integer, ForeignKey("leads.id"), unique=True, index=True)
    
    # --- FUTURE PORTAL FIELDS (Leave nullable for Monday's quick fix) ---
    user_account_id = Column(Integer, nullable=True) # Future link to Auth/Users table for login
    lease_status = Column(String, default="Pending Signature") # Future: Active, Notice Given, Past
    unit_number = Column(String, nullable=True)
    
    # --- RELATIONSHIPS ---
    lead = relationship("Lead", back_populates="tenant")


# --- TABLE FOR BLOCKING DATES ---
class BlockedDate(Base):
    __tablename__ = "blocked_dates"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, unique=True, index=True) # Format: YYYY-MM-DD
    reason = Column(String, nullable=True)         # Optional: e.g., "Holiday", "Office Closed"