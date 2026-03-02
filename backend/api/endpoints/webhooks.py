from fastapi import APIRouter, Request, Depends
from sqlalchemy.orm import Session
import logging
import json
import os
from datetime import datetime
from app.database import SessionLocal, Lead

# --- LOGGING CONFIGURATION ---
if not os.path.exists("logs"):
    os.makedirs("logs")

logger = logging.getLogger("webhooks")
logger.setLevel(logging.INFO)

c_handler = logging.StreamHandler() 
f_handler = logging.FileHandler("logs/webhooks.log")

log_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
c_handler.setFormatter(log_format)
f_handler.setFormatter(log_format)

if not logger.handlers:
    logger.addHandler(c_handler)
    logger.addHandler(f_handler)

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/rentsync")
async def receive_rentsync_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Step 3.2: Production Ear.
    Maps RentSync payload fields to our PostgreSQL schema.
    Captures moveInDate and promotionType specifically.
    """
    try:
        payload = await request.json()
        
        logger.info("--- RENTSYNC WEBHOOK RECEIVED ---")
        logger.info(json.dumps(payload, indent=2))
        
        # Capture the data block
        d = payload.get("data", {})
        customer = payload.get("customer", {})
        source_info = payload.get("source", {})

        # --- MAP PROSPECT NAME ---
        p_name = d.get("fullname") or customer.get("full_name")
        if not p_name:
            fname = d.get("firstName") or customer.get("first_name", "")
            lname = d.get("lastName") or customer.get("last_name", "")
            p_name = f"{fname} {lname}".strip()

        # --- MAP CONTACT INFO ---
        p_email = d.get("email") or customer.get("email")
        p_phone = d.get("phone") or customer.get("phone")
        
        # --- MAP SOURCE & PROPERTY ---
        int_source = d.get("source") or source_info.get("name")
        prop_name = d.get("propertyName") or source_info.get("ad_title")
        
        # --- NEW MAPPING FIELDS ---
        move_in = d.get("moveInDate")
        promo_type = d.get("promotionType")
        
        # --- CAPTURE RAW DATA ---
        raw_date = d.get("sentAt") or payload.get("sent_at")
        
        # Create and save lead
        new_lead = Lead(
            prospect_name=p_name if p_name else "Unknown Prospect",
            email=p_email,
            phone=p_phone,
            source="RentSync",
            integration_source=int_source,
            property_name=prop_name,
            move_in_date=move_in,
            promotion=promo_type,
            debug_1=json.dumps(payload),
            debug_2=f"SentAt Raw: {raw_date}",
            status="New"
        )
        
        db.add(new_lead)
        db.commit()
        
        logger.info(f"Saved lead: {p_name} | Promo: {promo_type} | Move-in: {move_in}")
        
        return {"status": "success", "message": "Lead ingested successfully"}
        
    except Exception as e:
        logger.error(f"Critical Mapping Error: {str(e)}")
        return {"status": "error", "message": str(e)}