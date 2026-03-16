from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Core Prospect Info
    prospect_name = Column(String, index=True, nullable=True)
    email = Column(String, index=True, nullable=True)
    phone = Column(String, nullable=True)
    
    # Source Info
    source = Column(String, nullable=True)
    integration_source = Column(String, nullable=True)
    
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
    bookings = relationship("Booking", back_populates="lead")
    tenant = relationship("Tenant", back_populates="lead", uselist=False)


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # --- FOREIGN KEY ---
    lead_id = Column(Integer, ForeignKey("leads.id")) 
    
    # Tour/Meeting Details
    building = Column(String, index=True)
    tour_date = Column(String, index=True)  # e.g., '2026-03-05'
    tour_time = Column(String)              # e.g., '14:00'
    
    status = Column(String, default="Scheduled")  # pending, confirmed, cancelled, Completed

    # Type: 'tour' (default) or 'meeting'
    # Tours show in analytics, meetings do not.
    # Both block the same time slot to prevent double-booking.
    booking_type = Column(String, default="tour", nullable=False)

    # Outcome — only relevant for tours
    tour_outcome = Column(String, nullable=True)  # "Converted to Tenant", "No Show"

    # --- RELATIONSHIPS ---
    lead = relationship("Lead", back_populates="bookings")


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    lead_id = Column(Integer, ForeignKey("leads.id"), unique=True, index=True)
    
    user_account_id = Column(Integer, nullable=True)
    lease_status = Column(String, default="Pending Signature")
    unit_number = Column(String, nullable=True)
    
    # --- RELATIONSHIPS ---
    lead = relationship("Lead", back_populates="tenant")


class BlockedDate(Base):
    __tablename__ = "blocked_dates"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, unique=True, index=True)  # Format: YYYY-MM-DD
    reason = Column(String, nullable=True)


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="admin")
    is_active = Column(Boolean, default=True)