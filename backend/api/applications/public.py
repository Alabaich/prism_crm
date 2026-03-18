from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any
from database import SessionLocal
from models import Application, Lead, SigningSession, DocumentPackage, PackageDocument
import logging
import os
import sys
from datetime import datetime
from services.pdf.pipeline import trigger_pipeline_if_complete

router = APIRouter()

# --- Setup Logging ---
LOG_DIR = os.path.join(os.getcwd(), "logs")
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

logger = logging.getLogger("applications.public")
logger.setLevel(logging.INFO)

if not logger.handlers:
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    file_handler = logging.FileHandler(os.path.join(LOG_DIR, "applications_public.log"), encoding='utf-8')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)


# --- DB Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =============================================================================
# PYDANTIC SCHEMAS
# =============================================================================

class ConsentSubmit(BaseModel):
    """Step 1 — applicant accepts electronic signing consent"""
    ip_address: Optional[str] = None

class ApplicationFormSubmit(BaseModel):
    """Step 2 — applicant fills out Form 410 fields"""
    # Employment
    employer_name: Optional[str] = None
    employment_type: Optional[str] = None
    monthly_income: Optional[str] = None
    position_held: Optional[str] = None
    length_of_employment: Optional[str] = None

    # Prior Employment
    prior_employer_name: Optional[str] = None
    prior_position_held: Optional[str] = None
    prior_length_of_employment: Optional[str] = None

    # Co-applicants
    co_applicants: Optional[list] = None

    # Other occupants
    other_occupants: Optional[list] = None

    # Pet
    has_pet: Optional[bool] = False
    pet_details: Optional[str] = None

    # Parking
    parking_requested: Optional[bool] = False

    # References
    reference_1_name: Optional[str] = None
    reference_1_phone: Optional[str] = None
    reference_2_name: Optional[str] = None
    reference_2_phone: Optional[str] = None

    # Previous addresses
    previous_addresses: Optional[list] = None

    # Vacating reason
    vacating_reason: Optional[str] = None

class SignatureSubmit(BaseModel):
    """Step 3 — applicant submits signature for a document"""
    document_type: str           # "rental_application" | "privacy_consent"
    signature_data: str          # base64 PNG of signature canvas
    ip_address: Optional[str] = None

class DeclineSubmit(BaseModel):
    reason: str


# =============================================================================
# HELPERS
# =============================================================================

def get_valid_session(token: str, db: Session) -> SigningSession:
    """Fetch session by token, validate it exists and is not expired/voided."""
    session = db.query(SigningSession).filter(SigningSession.token == token).first()

    if not session:
        raise HTTPException(status_code=404, detail="Invalid or expired link")

    if session.expires_at and datetime.utcnow() > session.expires_at:
        session.status = "expired"
        db.commit()
        raise HTTPException(status_code=410, detail="This link has expired")

    if session.status in ("declined", "expired"):
        raise HTTPException(status_code=410, detail=f"This session is {session.status}")

    # Check package is still active
    package = db.query(DocumentPackage).filter(DocumentPackage.id == session.package_id).first()
    if package and package.status == "voided":
        raise HTTPException(status_code=410, detail="This application has been cancelled")

    return session


# =============================================================================
# ENDPOINTS
# =============================================================================

# --- GET /apply/{token} — Load session info for the frontend ---
@router.get("/apply/{token}")
def get_signing_session(token: str, db: Session = Depends(get_db)):
    """
    Called when applicant opens their link.
    Returns everything the frontend needs to render the signing flow.
    """
    session = get_valid_session(token, db)

    # Mark as in_progress on first open (if still pending)
    if session.status == "pending":
        session.status = "in_progress"
        db.commit()
        logger.info(f"👁️ Session {session.id} opened for the first time by {session.signer_email}")

    package = db.query(DocumentPackage).filter(DocumentPackage.id == session.package_id).first()
    documents = db.query(PackageDocument).filter(
        PackageDocument.package_id == session.package_id
    ).order_by(PackageDocument.sort_order).all()

    # Load existing application data (if applicant is returning)
    app = None
    if package and package.lead_id:
        app = db.query(Application).filter(Application.lead_id == package.lead_id).first()

    # Figure out which docs are already signed by this signer
    signatures = session.signatures or {}
    signed_docs = list(signatures.keys())

    return {
        "session_id": session.id,
        "signer_name": session.signer_name,
        "signer_email": session.signer_email,
        "status": session.status,
        "consent_given": session.consent_given_at is not None,
        "expires_at": session.expires_at.isoformat() if session.expires_at else None,
        "building": package.building if package else None,
        "unit_number": package.unit_number if package else None,
        # Documents to sign
        "documents": [
            {
                "id": doc.id,
                "document_type": doc.document_type,
                "display_name": doc.display_name,
                "sort_order": doc.sort_order,
                "signed": doc.document_type in signed_docs,
            }
            for doc in documents
        ],
        # Pre-fill form if applicant is returning or is a co-applicant
        "prefill": {
            "employer_name": app.employer_name if app else None,
            "employment_type": app.employment_type if app else None,
            "monthly_income": app.monthly_income if app else None,
            "has_pet": app.has_pet if app else False,
            "parking_requested": app.parking_requested if app else False,
            "previous_addresses": app.previous_addresses if app else None,
            "co_applicants": app.co_applicants if app else None,
            "other_occupants": app.other_occupants if app else None,
        } if app else None,
        # Progress
        "total_documents": len(documents),
        "signed_documents": len(signed_docs),
        "all_signed": len(signed_docs) >= len(documents),
    }


# --- POST /apply/{token}/consent — Record electronic consent ---
@router.post("/apply/{token}/consent")
def submit_consent(token: str, payload: ConsentSubmit, request: Request, db: Session = Depends(get_db)):
    """
    Ontario ECA requirement — must be called before any signature is accepted.
    Records timestamp and IP address of consent.
    """
    session = get_valid_session(token, db)

    if session.consent_given_at:
        # Already consented — idempotent, just return ok
        return {"status": "ok", "message": "Consent already recorded"}

    # Get real IP — behind nginx proxy
    ip = payload.ip_address or request.headers.get("X-Forwarded-For", request.client.host)

    session.consent_given_at = datetime.utcnow()
    session.consent_ip_address = ip
    db.commit()

    logger.info(f"✅ Consent recorded for session {session.id} ({session.signer_email}) from IP {ip}")
    return {"status": "ok", "message": "Consent recorded"}


# --- POST /apply/{token}/form — Submit Form 410 data ---
@router.post("/apply/{token}/form")
def submit_form(token: str, payload: ApplicationFormSubmit, db: Session = Depends(get_db)):
    """
    Applicant fills out Form 410 fields.
    Saves to the Application record linked to this package.
    Can be called multiple times — each call updates the record (autosave friendly).
    """
    session = get_valid_session(token, db)

    if not session.consent_given_at:
        raise HTTPException(status_code=400, detail="Consent must be given before submitting form data")

    package = db.query(DocumentPackage).filter(DocumentPackage.id == session.package_id).first()
    if not package or not package.lead_id:
        raise HTTPException(status_code=404, detail="Package or lead not found")

    app = db.query(Application).filter(Application.lead_id == package.lead_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application record not found")

    # Update all provided fields
    if payload.employer_name is not None:       app.employer_name = payload.employer_name
    if payload.employment_type is not None:     app.employment_type = payload.employment_type
    if payload.monthly_income is not None:      app.monthly_income = payload.monthly_income
    if payload.position_held is not None:       app.position_held = payload.position_held
    if payload.length_of_employment is not None: app.length_of_employment = payload.length_of_employment
    if payload.prior_employer_name is not None: app.prior_employer_name = payload.prior_employer_name
    if payload.prior_position_held is not None: app.prior_position_held = payload.prior_position_held
    if payload.prior_length_of_employment is not None: app.prior_length_of_employment = payload.prior_length_of_employment
    if payload.co_applicants is not None:       app.co_applicants = payload.co_applicants
    if payload.other_occupants is not None:     app.other_occupants = payload.other_occupants
    if payload.has_pet is not None:             app.has_pet = payload.has_pet
    if payload.pet_details is not None:         app.pet_details = payload.pet_details
    if payload.parking_requested is not None:   app.parking_requested = payload.parking_requested
    if payload.reference_1_name is not None:    app.reference_1_name = payload.reference_1_name
    if payload.reference_1_phone is not None:   app.reference_1_phone = payload.reference_1_phone
    if payload.reference_2_name is not None:    app.reference_2_name = payload.reference_2_name
    if payload.reference_2_phone is not None:   app.reference_2_phone = payload.reference_2_phone
    if payload.previous_addresses is not None:  app.previous_addresses = payload.previous_addresses
    if payload.vacating_reason is not None:     app.vacating_reason = payload.vacating_reason

    db.commit()
    logger.info(f"📝 Form data saved for session {session.id} ({session.signer_email})")

    return {"status": "ok", "message": "Form data saved"}


# --- POST /apply/{token}/sign — Submit signature for one document ---
@router.post("/apply/{token}/sign")
def submit_signature(token: str, payload: SignatureSubmit, request: Request, db: Session = Depends(get_db)):
    """
    Applicant submits their signature for one document.
    Signature stored as base64 in the signatures JSON field.
    Called once per document (rental_application, privacy_consent).
    """
    session = get_valid_session(token, db)

    if not session.consent_given_at:
        raise HTTPException(status_code=400, detail="Consent must be given before signing")

    # Validate document type
    valid_doc_types = ("rental_application", "privacy_consent")
    if payload.document_type not in valid_doc_types:
        raise HTTPException(status_code=400, detail=f"Invalid document type. Must be one of: {valid_doc_types}")

    ip = payload.ip_address or request.headers.get("X-Forwarded-For", request.client.host)

    # Update signatures JSON
    signatures = session.signatures or {}
    signatures[payload.document_type] = {
        "signed_at": datetime.utcnow().isoformat(),
        "ip_address": ip,
        "signature_data": payload.signature_data,  # base64 PNG
    }
    session.signatures = signatures

    # Check if all documents are now signed
    package_docs = db.query(PackageDocument).filter(
        PackageDocument.package_id == session.package_id
    ).all()
    all_doc_types = {doc.document_type for doc in package_docs}
    all_signed = all(dt in signatures for dt in all_doc_types)

    if all_signed:
        session.status = "completed"
        logger.info(f"🎉 Session {session.id} fully completed by {session.signer_email}")

        # Check if ALL sessions for this package are now complete
        all_sessions = db.query(SigningSession).filter(
            SigningSession.package_id == session.package_id
        ).all()
        package_complete = all(s.status == "completed" for s in all_sessions)

        if package_complete:
            package = db.query(DocumentPackage).filter(DocumentPackage.id == session.package_id).first()
            if package:
                package.status = "completed"
                logger.info(f"✅ Package {package.id} fully completed — all signers done")

    db.commit()
    logger.info(f"✍️ Signature recorded for '{payload.document_type}' in session {session.id}")

    if all_signed:
        trigger_pipeline_if_complete(package_id=session.package_id, db=db)

    return {
        "status": "ok",
        "document_type": payload.document_type,
        "all_signed": all_signed,
        "session_status": session.status,
        "signed_documents": list(signatures.keys()),
    }


# --- POST /apply/{token}/decline — Applicant declines to sign ---
@router.post("/apply/{token}/decline")
def decline_signing(token: str, payload: DeclineSubmit, db: Session = Depends(get_db)):
    """
    Applicant clicks 'Decline'. Records reason, marks session + package as rejected.
    Admin will be notified (notification handled by scheduler or webhook — TBD).
    """
    session = get_valid_session(token, db)

    session.status = "declined"
    session.declined_at = datetime.utcnow()
    session.decline_reason = payload.reason

    # Mark the whole package as rejected
    package = db.query(DocumentPackage).filter(DocumentPackage.id == session.package_id).first()
    if package:
        package.status = "rejected"

    # Mark application as rejected
    if package and package.lead_id:
        app = db.query(Application).filter(Application.lead_id == package.lead_id).first()
        if app:
            app.status = "Rejected"
            app.rejection_reason = f"Declined by {session.signer_name}: {payload.reason}"

        lead = db.query(Lead).filter(Lead.id == package.lead_id).first()
        if lead:
            lead.status = "Rejected"

    db.commit()
    logger.info(f"❌ Session {session.id} declined by {session.signer_email}. Reason: {payload.reason}")

    return {
        "status": "ok",
        "message": "Your response has been recorded. The leasing team has been notified."
    }