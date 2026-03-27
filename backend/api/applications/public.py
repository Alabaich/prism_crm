from fastapi import APIRouter, Depends, HTTPException, Request, File, UploadFile, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any
from database import SessionLocal
from models import Application, Lead, SigningSession, DocumentPackage, PackageDocument, Doc
import logging
import os
import sys
import secrets
import random
from datetime import datetime, timedelta
from services.pdf.pipeline import trigger_pipeline_if_complete
from mailer import send_email_smtp

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
    ip_address: Optional[str] = None

class OtpVerify(BaseModel):
    code: str

class ApplicationFormSubmit(BaseModel):
    building: Optional[str] = None
    unit_number: Optional[str] = None
    lease_start: Optional[str] = None
    monthly_rent: Optional[str] = None
    prospect_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    sin_number: Optional[str] = None
    drivers_license: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    occupation: Optional[str] = None
    employer_name: Optional[str] = None
    employment_type: Optional[str] = None
    monthly_income: Optional[str] = None
    position_held: Optional[str] = None
    length_of_employment: Optional[str] = None
    business_address: Optional[str] = None
    business_phone: Optional[str] = None
    supervisor_name: Optional[str] = None
    prior_employer_name: Optional[str] = None
    prior_position_held: Optional[str] = None
    prior_length_of_employment: Optional[str] = None
    prior_business_address: Optional[str] = None
    prior_business_phone: Optional[str] = None
    prior_supervisor: Optional[str] = None
    prior_salary: Optional[str] = None
    previous_addresses: Optional[list] = None
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_address: Optional[str] = None
    chequing_account: Optional[str] = None
    savings_account: Optional[str] = None
    financial_obligations: Optional[list] = None
    other_occupants: Optional[list] = None
    has_pet: Optional[bool] = False
    pet_details: Optional[str] = None
    parking_requested: Optional[bool] = False
    reference_1_name: Optional[str] = None
    reference_1_phone: Optional[str] = None
    reference_1_address: Optional[str] = None
    reference_1_acquaintance: Optional[str] = None
    reference_1_occupation: Optional[str] = None
    reference_2_name: Optional[str] = None
    reference_2_phone: Optional[str] = None
    reference_2_address: Optional[str] = None
    reference_2_acquaintance: Optional[str] = None
    reference_2_occupation: Optional[str] = None
    automobiles: Optional[list] = None
    vacating_reason: Optional[str] = None

class SignatureSubmit(BaseModel):
    document_type: str
    signature_data: str
    ip_address: Optional[str] = None

class DeclineSubmit(BaseModel):
    reason: str


# =============================================================================
# HELPERS
# =============================================================================

def get_valid_session(token: str, db: Session) -> SigningSession:
    session = db.query(SigningSession).filter(SigningSession.token == token).first()
    if not session:
        raise HTTPException(status_code=404, detail="Invalid or expired link")
    if session.expires_at and datetime.utcnow() > session.expires_at:
        session.status = "expired"
        db.commit()
        raise HTTPException(status_code=410, detail="This link has expired")
    if session.status in ("declined", "expired"):
        raise HTTPException(status_code=410, detail=f"This session is {session.status}")
    package = db.query(DocumentPackage).filter(DocumentPackage.id == session.package_id).first()
    if package and package.status == "voided":
        raise HTTPException(status_code=410, detail="This application has been cancelled")
    return session


def get_signer_index(session: SigningSession, db: Session) -> int:
    all_sessions = db.query(SigningSession).filter(
        SigningSession.package_id == session.package_id
    ).order_by(SigningSession.created_at).all()
    for i, s in enumerate(all_sessions):
        if s.id == session.id:
            return i
    return 0


def mask_email(email: str) -> str:
    """Mask email for display: jo***@gm***.com"""
    if not email or "@" not in email:
        return "***@***.***"
    local, domain = email.rsplit("@", 1)
    domain_parts = domain.rsplit(".", 1)
    masked_local = local[:2] + "***" if len(local) > 2 else local[0] + "***"
    masked_domain = domain_parts[0][:2] + "***" if len(domain_parts[0]) > 2 else domain_parts[0]
    return f"{masked_local}@{masked_domain}.{domain_parts[1]}" if len(domain_parts) > 1 else f"{masked_local}@{masked_domain}"


def has_saved_data(session: SigningSession, db: Session) -> bool:
    """Check if this session has any saved form/document data worth protecting."""
    if not session.consent_given_at:
        return False

    package = db.query(DocumentPackage).filter(DocumentPackage.id == session.package_id).first()
    if not package or not package.lead_id:
        return False

    app = db.query(Application).filter(Application.lead_id == package.lead_id).first()
    if not app:
        return False

    check_fields = [
        app.employer_name, app.monthly_income, app.position_held,
        app.date_of_birth, app.sin_number, app.drivers_license,
        app.bank_name, app.chequing_account,
    ]
    return any(f is not None and str(f).strip() for f in check_fields)


def validate_session_token(session: SigningSession, request: Request) -> bool:
    """Validate the session token from the request header."""
    token = request.headers.get("X-Session-Token")
    if not token or not session.session_token:
        return False
    if token != session.session_token:
        return False
    if session.session_expires_at and datetime.utcnow() > session.session_expires_at:
        return False
    if session.session_last_activity:
        inactivity = (datetime.utcnow() - session.session_last_activity).total_seconds()
        if inactivity > 20 * 60:  # 20 minute inactivity timeout
            return False
    return True


def require_session_token(session: SigningSession, request: Request, db: Session):
    """
    Enforce session token on endpoints that expose or modify sensitive data.
    Only enforced when the session has saved data (i.e. OTP was required).
    If no saved data exists (first-time user), skip the check.
    """
    if not has_saved_data(session, db):
        return  # First-time visit, no data to protect yet

    if not validate_session_token(session, request):
        raise HTTPException(
            status_code=401,
            detail="Session expired or not authenticated. Please verify with OTP."
        )

    # Update last activity timestamp
    session.session_last_activity = datetime.utcnow()
    db.commit()


def send_otp_email(signer_name: str, signer_email: str, otp_code: str) -> bool:
    """Send OTP verification email."""
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f7; margin: 0; padding: 0; }}
            .container {{ max-width: 480px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }}
            .header {{ background: #1a1a1a; padding: 28px; text-align: center; }}
            .header h1 {{ margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; letter-spacing: 0.5px; }}
            .content {{ padding: 36px 32px; text-align: center; }}
            .code-box {{ background: #f8f9fc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0; }}
            .code {{ font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1a1a1a; font-family: 'Courier New', monospace; }}
            .footer {{ text-align: center; padding: 20px 32px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Prism &middot; Verification Code</h1>
            </div>
            <div class="content">
                <p style="font-size: 16px; color: #334155; margin-top: 0;">Hi {signer_name},</p>
                <p style="font-size: 14px; color: #64748b;">Enter this code to continue your rental application:</p>
                <div class="code-box">
                    <div class="code">{otp_code}</div>
                </div>
                <p style="font-size: 13px; color: #94a3b8; margin-bottom: 0;">This code expires in 10 minutes.<br>If you didn't request this, you can safely ignore it.</p>
            </div>
            <div class="footer">
                &copy; {datetime.now().year} Prism Property Management. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """

    text = f"""Hi {signer_name},

Your verification code is: {otp_code}

This code expires in 10 minutes.
If you didn't request this, you can safely ignore it.

— Prism Property Management
"""
    return send_email_smtp(
        to_recipients=[signer_email],
        subject=f"Your verification code: {otp_code}",
        html_body=html,
        text_body=text,
    )


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/apply/{token}")
def get_signing_session(token: str, request: Request, db: Session = Depends(get_db)):
    session = get_valid_session(token, db)

    if session.status == "pending":
        session.status = "in_progress"
        db.commit()
        logger.info(f"👁️ Session {session.id} opened by {session.signer_email}")

    package = db.query(DocumentPackage).filter(DocumentPackage.id == session.package_id).first()
    documents = db.query(PackageDocument).filter(
        PackageDocument.package_id == session.package_id
    ).order_by(PackageDocument.sort_order).all()

    signer_index = get_signer_index(session, db)

    # ── OTP Gate ──
    needs_otp = has_saved_data(session, db)
    otp_verified = False

    if needs_otp:
        otp_verified = validate_session_token(session, request)
        if otp_verified:
            session.session_last_activity = datetime.utcnow()
            db.commit()

    # If OTP is needed but not verified, return limited info
    if needs_otp and not otp_verified:
        return {
            "session_id": session.id,
            "signer_name": session.signer_name,
            "signer_email": mask_email(session.signer_email),
            "signer_index": signer_index,
            "status": session.status,
            "consent_given": session.consent_given_at is not None,
            "expires_at": session.expires_at.isoformat() if session.expires_at else None,
            "building": package.building if package else None,
            "unit_number": package.unit_number if package else None,
            "lease_start": None,
            "monthly_rent": None,
            "documents": [],
            "prefill": None,
            "total_documents": 0,
            "signed_documents": 0,
            "all_signed": False,
            "requires_otp": True,
            "otp_verified": False,
        }

    # ── Full data response (first visit OR OTP verified) ──
    lead = None
    app = None
    if package and package.lead_id:
        lead = db.query(Lead).filter(Lead.id == package.lead_id).first()
        app = db.query(Application).filter(Application.lead_id == package.lead_id).first()

    signatures = session.signatures or {}
    signed_docs = list(signatures.keys())

    prefill = None
    if signer_index == 0 and (app or lead):
        prefill = {
            "prospect_name": lead.prospect_name if lead else session.signer_name,
            "email": lead.email if lead else session.signer_email,
            "phone": lead.phone if lead else None,
            "date_of_birth": app.date_of_birth if app else None,
            "sin_number": app.sin_number if app else None,
            "drivers_license": app.drivers_license if app else None,
            "employer_name": app.employer_name if app else None,
            "employment_type": app.employment_type if app else None,
            "monthly_income": app.monthly_income if app else None,
            "position_held": app.position_held if app else None,
            "length_of_employment": app.length_of_employment if app else None,
            "business_address": app.business_address if app else None,
            "business_phone": app.business_phone if app else None,
            "supervisor_name": app.supervisor_name if app else None,
            "prior_employer_name": app.prior_employer_name if app else None,
            "prior_position_held": app.prior_position_held if app else None,
            "prior_length_of_employment": app.prior_length_of_employment if app else None,
            "prior_business_address": app.prior_business_address if app else None,
            "prior_business_phone": app.prior_business_phone if app else None,
            "prior_supervisor": app.prior_supervisor if app else None,
            "prior_salary": app.prior_salary if app else None,
            "previous_addresses": app.previous_addresses if app else None,
            "bank_name": app.bank_name if app else None,
            "bank_branch": app.bank_branch if app else None,
            "bank_address": app.bank_address if app else None,
            "chequing_account": app.chequing_account if app else None,
            "savings_account": app.savings_account if app else None,
            "financial_obligations": app.financial_obligations if app else None,
            "other_occupants": app.other_occupants if app else None,
            "has_pet": app.has_pet if app else False,
            "pet_details": app.pet_details if app else None,
            "parking_requested": app.parking_requested if app else False,
            "reference_1_name": app.reference_1_name if app else None,
            "reference_1_phone": app.reference_1_phone if app else None,
            "reference_1_address": app.reference_1_address if app else None,
            "reference_1_acquaintance": app.reference_1_acquaintance if app else None,
            "reference_1_occupation": app.reference_1_occupation if app else None,
            "reference_2_name": app.reference_2_name if app else None,
            "reference_2_phone": app.reference_2_phone if app else None,
            "reference_2_address": app.reference_2_address if app else None,
            "reference_2_acquaintance": app.reference_2_acquaintance if app else None,
            "reference_2_occupation": app.reference_2_occupation if app else None,
            "automobiles": app.automobiles if app else None,
            "vacating_reason": app.vacating_reason if app else None,
        }
    elif signer_index == 1:
        co = (app.co_applicants or [{}])[0] if app and app.co_applicants else {}
        prefill = {
            "prospect_name": co.get("name") or session.signer_name,
            "email": co.get("email") or session.signer_email,
            "phone": co.get("phone") or None,
            "date_of_birth": co.get("date_of_birth") or None,
            "sin_number": co.get("sin_number") or None,
            "drivers_license": co.get("drivers_license") or None,
            "occupation": co.get("occupation") or None,
            "employer_name": co.get("employer_name") or None,
            "employment_type": co.get("employment_type") or None,
            "monthly_income": co.get("monthly_income") or None,
            "position_held": co.get("position_held") or None,
            "length_of_employment": co.get("length_of_employment") or None,
            "business_address": co.get("business_address") or None,
            "business_phone": co.get("business_phone") or None,
            "supervisor_name": co.get("supervisor_name") or None,
            "prior_employer_name": co.get("prior_employer_name") or None,
            "prior_position_held": co.get("prior_position_held") or None,
            "prior_length_of_employment": co.get("prior_length_of_employment") or None,
            "prior_business_address": co.get("prior_business_address") or None,
            "prior_business_phone": co.get("prior_business_phone") or None,
            "prior_supervisor": co.get("prior_supervisor") or None,
            "prior_salary": co.get("prior_salary") or None,
            "previous_addresses": co.get("previous_addresses") or None,
        }

    return {
        "session_id": session.id,
        "signer_name": session.signer_name,
        "signer_email": session.signer_email,
        "signer_index": signer_index,
        "status": session.status,
        "consent_given": session.consent_given_at is not None,
        "expires_at": session.expires_at.isoformat() if session.expires_at else None,
        "building": package.building if package else None,
        "unit_number": package.unit_number if package else None,
        "lease_start": package.lease_start if package else None,
        "monthly_rent": package.monthly_rent if package else None,
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
        "prefill": prefill,
        "total_documents": len(documents),
        "signed_documents": len(signed_docs),
        "all_signed": len(signed_docs) >= len(documents),
        "requires_otp": False,
        "otp_verified": True if needs_otp else False,
    }


# ── OTP Endpoints ─────────────────────────────────────────────────────────────

@router.post("/apply/{token}/otp/request")
def request_otp(token: str, db: Session = Depends(get_db)):
    """Generate and send a 6-digit OTP to the signer's email."""
    session = get_valid_session(token, db)

    now = datetime.utcnow()
    if session.otp_generated_reset_at and (now - session.otp_generated_reset_at).total_seconds() > 3600:
        session.otp_generated_count = 0
        session.otp_generated_reset_at = now

    if not session.otp_generated_reset_at:
        session.otp_generated_reset_at = now

    if (session.otp_generated_count or 0) >= 5:
        raise HTTPException(
            status_code=429,
            detail="Too many verification codes requested. Please try again later."
        )

    otp_code = f"{random.randint(0, 999999):06d}"

    session.otp_code = otp_code
    session.otp_expires_at = now + timedelta(minutes=10)
    session.otp_attempts = 0
    session.otp_generated_count = (session.otp_generated_count or 0) + 1
    db.commit()

    sent = send_otp_email(session.signer_name, session.signer_email, otp_code)
    if not sent:
        logger.error(f"❌ Failed to send OTP email to {session.signer_email}")
        raise HTTPException(status_code=500, detail="Failed to send verification code. Please try again.")

    logger.info(f"🔐 OTP sent to {mask_email(session.signer_email)} for session {session.id}")

    return {
        "status": "ok",
        "message": "Verification code sent",
        "email": mask_email(session.signer_email),
    }


@router.post("/apply/{token}/otp/verify")
def verify_otp(token: str, payload: OtpVerify, db: Session = Depends(get_db)):
    """Verify the OTP code and issue a session token."""
    session = get_valid_session(token, db)

    if not session.otp_code or not session.otp_expires_at:
        raise HTTPException(status_code=400, detail="No verification code has been requested.")

    if datetime.utcnow() > session.otp_expires_at:
        session.otp_code = None
        session.otp_expires_at = None
        db.commit()
        raise HTTPException(status_code=410, detail="Verification code has expired. Please request a new one.")

    if (session.otp_attempts or 0) >= 5:
        session.otp_code = None
        session.otp_expires_at = None
        db.commit()
        raise HTTPException(
            status_code=429,
            detail="Too many incorrect attempts. Please request a new code."
        )

    session.otp_attempts = (session.otp_attempts or 0) + 1

    if payload.code.strip() != session.otp_code:
        db.commit()
        remaining = 5 - session.otp_attempts
        raise HTTPException(
            status_code=401,
            detail=f"Incorrect code. {remaining} attempt{'s' if remaining != 1 else ''} remaining."
        )

    # OTP verified — issue session token
    now = datetime.utcnow()
    session_token = secrets.token_hex(64)

    session.otp_code = None
    session.otp_expires_at = None
    session.otp_attempts = 0
    session.session_token = session_token
    session.session_expires_at = now + timedelta(hours=4)
    session.session_last_activity = now
    db.commit()

    logger.info(f"✅ OTP verified for session {session.id} ({mask_email(session.signer_email)})")

    return {
        "status": "ok",
        "session_token": session_token,
        "expires_in": 4 * 3600,
        "inactivity_timeout": 20 * 60,
    }


# ── Application Flow Endpoints ────────────────────────────────────────────────

@router.post("/apply/{token}/consent")
def submit_consent(token: str, payload: ConsentSubmit, request: Request, db: Session = Depends(get_db)):
    session = get_valid_session(token, db)
    if session.consent_given_at:
        return {"status": "ok", "message": "Consent already recorded"}
    ip = payload.ip_address or request.headers.get("X-Forwarded-For", request.client.host)
    session.consent_given_at = datetime.utcnow()
    session.consent_ip_address = ip
    db.commit()
    logger.info(f"✅ Consent recorded for session {session.id} ({session.signer_email}) from IP {ip}")
    return {"status": "ok", "message": "Consent recorded"}


@router.post("/apply/{token}/form")
def submit_form(token: str, payload: ApplicationFormSubmit, request: Request, db: Session = Depends(get_db)):
    session = get_valid_session(token, db)
    require_session_token(session, request, db)

    if not session.consent_given_at:
        raise HTTPException(status_code=400, detail="Consent must be given before submitting form data")

    package = db.query(DocumentPackage).filter(DocumentPackage.id == session.package_id).first()
    if not package or not package.lead_id:
        raise HTTPException(status_code=404, detail="Package or lead not found")

    app = db.query(Application).filter(Application.lead_id == package.lead_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application record not found")

    signer_index = get_signer_index(session, db)

    if signer_index == 0:
        if payload.building is not None:      package.building = payload.building
        if payload.unit_number is not None:   package.unit_number = payload.unit_number
        if payload.lease_start is not None:   package.lease_start = payload.lease_start
        if payload.monthly_rent is not None:  package.monthly_rent = payload.monthly_rent

        if payload.prospect_name is not None:
            lead = db.query(Lead).filter(Lead.id == package.lead_id).first()
            if lead:
                lead.prospect_name = payload.prospect_name
                if payload.email is not None: lead.email = payload.email
                if payload.phone is not None: lead.phone = payload.phone

        if payload.date_of_birth is not None:       app.date_of_birth = payload.date_of_birth
        if payload.sin_number is not None:          app.sin_number = payload.sin_number
        if payload.drivers_license is not None:     app.drivers_license = payload.drivers_license
        if payload.employer_name is not None:       app.employer_name = payload.employer_name
        if payload.employment_type is not None:     app.employment_type = payload.employment_type
        if payload.monthly_income is not None:      app.monthly_income = payload.monthly_income
        if payload.position_held is not None:       app.position_held = payload.position_held
        if payload.length_of_employment is not None: app.length_of_employment = payload.length_of_employment
        if payload.business_address is not None:    app.business_address = payload.business_address
        if payload.business_phone is not None:      app.business_phone = payload.business_phone
        if payload.supervisor_name is not None:     app.supervisor_name = payload.supervisor_name
        if payload.prior_employer_name is not None: app.prior_employer_name = payload.prior_employer_name
        if payload.prior_position_held is not None: app.prior_position_held = payload.prior_position_held
        if payload.prior_length_of_employment is not None: app.prior_length_of_employment = payload.prior_length_of_employment
        if payload.prior_business_address is not None: app.prior_business_address = payload.prior_business_address
        if payload.prior_business_phone is not None:   app.prior_business_phone = payload.prior_business_phone
        if payload.prior_supervisor is not None:       app.prior_supervisor = payload.prior_supervisor
        if payload.prior_salary is not None:           app.prior_salary = payload.prior_salary
        if payload.previous_addresses is not None:  app.previous_addresses = payload.previous_addresses
        if payload.bank_name is not None:           app.bank_name = payload.bank_name
        if payload.bank_branch is not None:         app.bank_branch = payload.bank_branch
        if payload.bank_address is not None:        app.bank_address = payload.bank_address
        if payload.chequing_account is not None:    app.chequing_account = payload.chequing_account
        if payload.savings_account is not None:     app.savings_account = payload.savings_account
        if payload.financial_obligations is not None: app.financial_obligations = payload.financial_obligations
        if payload.other_occupants is not None:     app.other_occupants = payload.other_occupants
        if payload.has_pet is not None:             app.has_pet = payload.has_pet
        if payload.pet_details is not None:         app.pet_details = payload.pet_details
        if payload.parking_requested is not None:   app.parking_requested = payload.parking_requested
        if payload.reference_1_name is not None:    app.reference_1_name = payload.reference_1_name
        if payload.reference_1_phone is not None:   app.reference_1_phone = payload.reference_1_phone
        if payload.reference_1_address is not None:     app.reference_1_address = payload.reference_1_address
        if payload.reference_1_acquaintance is not None: app.reference_1_acquaintance = payload.reference_1_acquaintance
        if payload.reference_1_occupation is not None:   app.reference_1_occupation = payload.reference_1_occupation
        if payload.reference_2_name is not None:    app.reference_2_name = payload.reference_2_name
        if payload.reference_2_phone is not None:   app.reference_2_phone = payload.reference_2_phone
        if payload.reference_2_address is not None:     app.reference_2_address = payload.reference_2_address
        if payload.reference_2_acquaintance is not None: app.reference_2_acquaintance = payload.reference_2_acquaintance
        if payload.reference_2_occupation is not None:   app.reference_2_occupation = payload.reference_2_occupation
        if payload.automobiles is not None:         app.automobiles = payload.automobiles
        if payload.vacating_reason is not None:     app.vacating_reason = payload.vacating_reason

        logger.info(f"📝 Applicant 1 form data saved for session {session.id}")

    elif signer_index == 1:
        co_data = {
            "name": payload.prospect_name or session.signer_name,
            "email": payload.email or session.signer_email,
            "phone": payload.phone,
            "date_of_birth": payload.date_of_birth,
            "sin_number": payload.sin_number,
            "drivers_license": payload.drivers_license,
            "occupation": payload.occupation or payload.position_held,
            "employer_name": payload.employer_name,
            "employment_type": payload.employment_type,
            "monthly_income": payload.monthly_income,
            "position_held": payload.position_held,
            "length_of_employment": payload.length_of_employment,
            "business_address": payload.business_address,
            "business_phone": payload.business_phone,
            "supervisor_name": payload.supervisor_name,
            "prior_employer_name": payload.prior_employer_name,
            "prior_position_held": payload.prior_position_held,
            "prior_length_of_employment": payload.prior_length_of_employment,
            "prior_business_address": payload.prior_business_address,
            "prior_business_phone": payload.prior_business_phone,
            "prior_supervisor": payload.prior_supervisor,
            "prior_salary": payload.prior_salary,
            "previous_addresses": payload.previous_addresses,
        }

        existing = app.co_applicants or []
        if len(existing) > 0:
            existing[0] = {**existing[0], **{k: v for k, v in co_data.items() if v is not None}}
        else:
            existing = [co_data]
        app.co_applicants = existing

        logger.info(f"📝 Applicant 2 form data saved for session {session.id}")

    db.commit()
    return {"status": "ok", "message": "Form data saved"}


@router.post("/apply/{token}/upload")
async def upload_document(
    token: str,
    request: Request,
    file: UploadFile = File(...),
    category: str = Form(...),
    db: Session = Depends(get_db)
):
    session = get_valid_session(token, db)
    require_session_token(session, request, db)

    if not session.consent_given_at:
        raise HTTPException(status_code=400, detail="Consent must be given before uploading")

    valid_categories = ("id_upload", "income_proof", "landlord_reference", "additional_doc")
    if category not in valid_categories:
        raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {valid_categories}")

    allowed_types = ("image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf")
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Upload JPG, PNG, or PDF.")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum 10MB.")

    package = db.query(DocumentPackage).filter(DocumentPackage.id == session.package_id).first()
    if not package or not package.lead_id:
        raise HTTPException(status_code=404, detail="Package or lead not found")

    upload_dir = os.path.join(os.getcwd(), "storage", "uploads", str(package.lead_id))
    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "file")[1] or ".bin"
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_name = f"{category}_{timestamp}{ext}"
    file_path = os.path.join(upload_dir, safe_name)

    with open(file_path, "wb") as f_out:
        f_out.write(contents)

    doc = Doc(
        file_name=file.filename or safe_name,
        file_path=file_path,
        file_type=file.content_type,
        doc_category=category,
        notes=f"Uploaded by applicant via signing session {session.id}"
    )
    db.add(doc)
    db.flush()

    app = db.query(Application).filter(Application.lead_id == package.lead_id).first()
    if app:
        if category == "id_upload":
            app.id_document_id = doc.id
        elif category == "income_proof":
            app.income_proof_id = doc.id
        elif category == "landlord_reference":
            app.landlord_reference_id = doc.id

    db.commit()
    logger.info(f"📎 File uploaded: {safe_name} (category: {category}) for lead {package.lead_id}")

    # Auto-analyze uploaded document metadata
    try:
        from services.doc_analyzer import analyze_document
        analysis = analyze_document(file_path)
        doc.metadata_analysis = analysis
        db.commit()
        logger.info(f"📊 Auto-analysis: {len(analysis.get('risk_signals', []))} signals")
    except Exception as e:
        db.rollback()
        logger.error(f"⚠️ Analysis failed (non-blocking): {e}")

    return {"status": "ok", "doc_id": doc.id, "file_name": file.filename, "category": category}


@router.post("/apply/{token}/sign")
def submit_signature(token: str, payload: SignatureSubmit, request: Request, db: Session = Depends(get_db)):
    session = get_valid_session(token, db)
    require_session_token(session, request, db)

    if not session.consent_given_at:
        raise HTTPException(status_code=400, detail="Consent must be given before signing")

    valid_doc_types = ("rental_application", "privacy_consent")
    if payload.document_type not in valid_doc_types:
        raise HTTPException(status_code=400, detail=f"Invalid document type. Must be one of: {valid_doc_types}")

    ip = payload.ip_address or request.headers.get("X-Forwarded-For", request.client.host)

    signatures = session.signatures or {}
    signatures[payload.document_type] = {
        "signed_at": datetime.utcnow().isoformat(),
        "ip_address": ip,
        "signature_data": payload.signature_data,
    }
    session.signatures = signatures
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(session, "signatures")

    package_docs = db.query(PackageDocument).filter(
        PackageDocument.package_id == session.package_id
    ).all()
    all_doc_types = {doc.document_type for doc in package_docs}
    all_signed = all(dt in signatures for dt in all_doc_types)

    if all_signed:
        session.status = "completed"
        logger.info(f"🎉 Session {session.id} fully completed by {session.signer_email}")

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


@router.post("/apply/{token}/decline")
def decline_signing(token: str, payload: DeclineSubmit, db: Session = Depends(get_db)):
    session = get_valid_session(token, db)
    session.status = "declined"
    session.declined_at = datetime.utcnow()
    session.decline_reason = payload.reason

    package = db.query(DocumentPackage).filter(DocumentPackage.id == session.package_id).first()
    if package:
        package.status = "rejected"

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
    return {"status": "ok", "message": "Your response has been recorded. The leasing team has been notified."}