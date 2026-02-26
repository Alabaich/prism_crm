from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="admin") # E.g., 'super_admin', 'sales_rep'

class Lead(Base):
    __tablename__ = "leads"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=True)
    phone = Column(String, index=True, nullable=True)
    name = Column(String)
    source = Column(String) # Where did they come from? e.g., 'email_worker', 'webhook'
    is_converted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True) # Links back to the Lead!
    tour_name = Column(String)
    status = Column(String, default="pending") # e.g., 'pending', 'confirmed', 'cancelled'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # This creates a magic relationship so you can easily access booking.lead.name later
    lead = relationship("Lead")