from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import SessionLocal
from models import Application, Lead, Tenant, SigningSession, DocumentPackage, PackageDocument, AdminUser, Doc
import logging
import os
import sys
from datetime import datetime, timedelta
import uuid

from mailer import send_email_smtp

router = APIRouter()

# --- Setup Logging ---
LOG_DIR = os.path.join(os.getcwd(), "logs")
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

logger = logging.getLogger("applications")
logger.setLevel(logging.INFO)

if not logger.handlers:
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    file_handler = logging.FileHandler(os.path.join(LOG_DIR, "applications.log"), encoding='utf-8')
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


# --- Base URL for signing links ---
BASE_URL = os.getenv("FRONTEND_URL", "https://prismpm.cloud")


# =============================================================================
# PYDANTIC SCHEMAS
# =============================================================================

class SignerInfo(BaseModel):
    name: str
    email: str

class ApplicationCreate(BaseModel):
    lead_id: int
    signers: List[SignerInfo]          # 1–5 signers (applicant + co-applicants)
    building: Optional[str] = None
    unit_number: Optional[str] = None
    lease_start: Optional[str] = None      
    monthly_rent: Optional[str] = None

class ApplicationReject(BaseModel):
    rejection_reason: str


# =============================================================================
# HELPERS
# =============================================================================

def send_application_email(signer_name: str, signer_email: str, token: str, building: Optional[str]):
    """Send signing link email to one applicant."""
    signing_url = f"{BASE_URL}/pub_apply/{token}"
    building_text = f" for <strong>{building}</strong>" if building else ""

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0; }}
            .container {{ max-width: 560px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }}
            .header {{ background: linear-gradient(135deg, #1e3a5f 0%, #2d5986 100%); padding: 36px 40px; }}
            .header h1 {{ color: white; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }}
            .header p {{ color: rgba(255,255,255,0.75); margin: 6px 0 0; font-size: 14px; }}
            .body {{ padding: 36px 40px; }}
            .body p {{ color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }}
            .cta-button {{ display: inline-block; background: #1e3a5f; color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; margin: 8px 0 24px; }}
            .info-box {{ background: #f1f5f9; border-radius: 10px; padding: 16px 20px; margin: 20px 0; }}
            .info-box p {{ margin: 0; font-size: 13px; color: #64748b; }}
            .footer {{ padding: 20px 40px; border-top: 1px solid #f1f5f9; text-align: center; }}
            .footer p {{ color: #94a3b8; font-size: 12px; margin: 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Rental Application</h1>
                <p>Prism Property Management</p>
            </div>
            <div class="body">
                <p>Hi <strong>{signer_name}</strong>,</p>
                <p>You've been invited to complete a rental application{building_text}. Please click the button below to review, fill out, and sign your application documents.</p>
                <a href="{signing_url}" class="cta-button">Complete My Application →</a>
                <div class="info-box">
                    <p>📋 You'll need to complete <strong>Form 410 (Rental Application)</strong> and <strong>Schedule A (Privacy Consent)</strong>. Your progress is saved automatically — you can return to this link at any time.</p>
                </div>
                <p>This link expires in <strong>7 days</strong>. If you have any questions, reply directly to this email.</p>
                <p style="margin-bottom: 0;">Best regards,<br><strong>Prism Property Management</strong></p>
            </div>
            <div class="footer">
                <p>© {datetime.now().year} Prism Property Management. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

    text = f"""Hi {signer_name},

You've been invited to complete a rental application{' for ' + building if building else ''}.

Complete your application here:
{signing_url}

This link expires in 7 days.

Best regards,
Prism Property Management
"""
    return send_email_smtp(
        to_recipients=[signer_email],
        subject="Your Rental Application — Prism Property Management",
        html_body=html,
        text_body=text
    )


# =============================================================================
# ENDPOINTS
# =============================================================================

# --- POST / — Create application + send signing links ---
@router.post("/")
def create_application(payload: ApplicationCreate, db: Session = Depends(get_db)):
    logger.info(f"📋 Creating application for lead {payload.lead_id} with {len(payload.signers)} signer(s)")

    # Validate signer count
    if not 1 <= len(payload.signers) <= 5:
        raise HTTPException(status_code=400, detail="Must have between 1 and 5 signers")

    # Validate lead exists
    lead = db.query(Lead).filter(Lead.id == payload.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Check no existing application for this lead
    existing = db.query(Application).filter(Application.lead_id == payload.lead_id).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Application already exists for this lead (id: {existing.id})")

    # 1. Create Application record
    application = Application(
        lead_id=payload.lead_id,
        status="Pending"
    )
    db.add(application)
    db.flush()  # get application.id before commit
    logger.info(f"✅ Application {application.id} created for lead {payload.lead_id}")

    # 2. Create DocumentPackage for this application
    signer_ids_list = [{"name": s.name, "email": s.email} for s in payload.signers]
    package = DocumentPackage(
        package_type="application",
        lead_id=payload.lead_id,
        building=payload.building,
        unit_number=payload.unit_number,
        lease_start=payload.lease_start,        # ← add
        monthly_rent=payload.monthly_rent,
        signer_ids=signer_ids_list,
        status="sent"
    )
    db.add(package)
    db.flush()
    logger.info(f"📦 Document package {package.id} created")

    # 3. Add the two application documents to the package
    for doc_type, display_name, sort_order in [
        ("rental_application", "Form 410 — Rental Application", 1),
        ("privacy_consent",    "Schedule A — Privacy Consent",  2),
    ]:
        doc = PackageDocument(
            package_id=package.id,
            document_type=doc_type,
            display_name=display_name,
            sort_order=sort_order
        )
        db.add(doc)

    # 4. Create one SigningSession per signer + send email
    tokens_created = []
    email_failures = []

    for signer in payload.signers:
        token = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(days=14)

        session = SigningSession(
            package_id=package.id,
            lead_id=payload.lead_id,
            signer_name=signer.name,
            signer_email=signer.email,
            token=token,
            expires_at=expires_at,
            status="pending"
        )
        db.add(session)
        tokens_created.append({"name": signer.name, "email": signer.email, "token": token})

        # Send email
        sent = send_application_email(signer.name, signer.email, token, payload.building)
        if not sent:
            email_failures.append(signer.email)
            logger.error(f"❌ Failed to send email to {signer.email}")
        else:
            logger.info(f"📧 Application email sent to {signer.email}")

    # 5. Update lead status → Applied
    lead.status = "Applied"

    db.commit()
    logger.info(f"✅ Application {application.id} fully created. Package {package.id}. {len(tokens_created)} session(s).")

    return {
        "status": "success",
        "application_id": application.id,
        "package_id": package.id,
        "signers": len(tokens_created),
        "email_failures": email_failures if email_failures else None,
        "message": f"Application created and sent to {len(tokens_created)} signer(s)"
    }


# --- GET / — List all applications with tracking info ---
@router.get("/")
def get_applications(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    logger.info(f"📊 Fetching applications (status filter: {status})")

    query = db.query(Application)
    if status and status != "All":
        query = query.filter(Application.status == status)

    applications = query.order_by(Application.created_at.desc()).all()

    result = []
    for app in applications:
        lead = db.query(Lead).filter(Lead.id == app.lead_id).first()

        # Get signing sessions for tracking
        package = db.query(DocumentPackage).filter(
            DocumentPackage.lead_id == app.lead_id,
            DocumentPackage.package_type == "application"
        ).order_by(DocumentPackage.created_at.desc()).first()

        sessions = []
        if package:
            sessions_data = db.query(SigningSession).filter(
                SigningSession.package_id == package.id
            ).all()
            for s in sessions_data:
                sessions.append({
                    "signer_name": s.signer_name,
                    "signer_email": s.signer_email,
                    "status": s.status,
                    "token": s.token,  
                    "consent_given_at": s.consent_given_at.isoformat() if s.consent_given_at else None,
                    "submitted_at": s.declined_at.isoformat() if s.declined_at else None,
                })

        result.append({
            "id": app.id,
            "created_at": app.created_at.isoformat(),
            "lead_id": app.lead_id,
            "lead_name": lead.prospect_name if lead else None,
            "lead_email": lead.email if lead else None,
            "status": app.status,
            "approved_at": app.approved_at.isoformat() if app.approved_at else None,
            "rejection_reason": app.rejection_reason,
            "signers": sessions,
            
            "ai_risk_level": app.ai_review.get("risk_level") if app.ai_review else None,
            # Quick tracking stats
            "total_signers": len(sessions),
            "completed_signers": sum(1 for s in sessions if s["status"] == "completed"),
            "pending_signers": sum(1 for s in sessions if s["status"] == "pending"),
        })

    return result


# --- GET /{id} — Single application detail ---
@router.get("/{application_id}")
def get_application(application_id: int, db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    lead = db.query(Lead).filter(Lead.id == app.lead_id).first()

    package = db.query(DocumentPackage).filter(
        DocumentPackage.lead_id == app.lead_id,
        DocumentPackage.package_type == "application"
    ).order_by(DocumentPackage.created_at.desc()).first()

    sessions = []
    if package:
        sessions_data = db.query(SigningSession).filter(
            SigningSession.package_id == package.id
        ).all()
        for s in sessions_data:
            sessions.append({
                "id": s.id,
                "signer_name": s.signer_name,
                "signer_email": s.signer_email,
                "token": s.token,
                "status": s.status,
                "expires_at": s.expires_at.isoformat() if s.expires_at else None,
                "consent_given_at": s.consent_given_at.isoformat() if s.consent_given_at else None,
                "signatures": s.signatures,
                "ai_review": app.ai_review,
            })

    additional_docs = []
    if app.additional_doc_ids:
        docs = db.query(Doc).filter(Doc.id.in_(app.additional_doc_ids)).all()
        additional_docs = [{"id": d.id, "file_name": d.file_name} for d in docs]

    return {
        "id": app.id,
        "created_at": app.created_at.isoformat(),
        "lead_id": app.lead_id,
        "lead_name": lead.prospect_name if lead else None,
        "lead_email": lead.email if lead else None,
        "lead_phone": lead.phone if lead else None,
        # Application fields
        "employer_name": app.employer_name,
        "employment_type": app.employment_type,
        "monthly_income": app.monthly_income,
        "position_held": app.position_held,
        "co_applicants": app.co_applicants,
        "other_occupants": app.other_occupants,
        "id_verified": app.id_verified,
        "credit_check_score": app.credit_check_score,
        "credit_check_notes": app.credit_check_notes,
        "has_pet": app.has_pet,
        "pet_details": app.pet_details,
        "parking_requested": app.parking_requested,
        "parking_spot": app.parking_spot,
        "previous_addresses": app.previous_addresses,
        "vacating_reason": app.vacating_reason,
        # Docs
        "id_document_id": app.id_document_id,
        "income_proof_id": app.income_proof_id,
        "signed_form_410_id": app.signed_form_410_id,
        "signed_consent_id": app.signed_consent_id,
        "landlord_reference_id": app.landlord_reference_id,
        "additional_docs": additional_docs,
        # Status
        "status": app.status,
        "approved_at": app.approved_at.isoformat() if app.approved_at else None,
        "rejection_reason": app.rejection_reason,
        # Signing sessions
        "package_id": package.id if package else None,
        "signing_sessions": sessions,
        "ai_review": app.ai_review
    }


# --- PUT /{id}/approve — Approve application → create Tenant ---
@router.put("/{application_id}/approve")
def approve_application(application_id: int, request: Request, db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if app.status != "Pending":
        raise HTTPException(status_code=400, detail=f"Application is already '{app.status}'")

    lead = db.query(Lead).filter(Lead.id == app.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Get admin from JWT (basic — reads from header for now)
    # TODO: wire up proper JWT extraction when auth is refactored
    admin_id = None

    # Approve application
    app.status = "Approved"
    app.approved_at = datetime.utcnow()
    app.approved_by = admin_id

    # Update lead status
    lead.status = "Approved"

    # Create Tenant record if not already exists
    existing_tenant = db.query(Tenant).filter(Tenant.lead_id == lead.id).first()
    if not existing_tenant:
        tenant = Tenant(
            lead_id=lead.id,
            lease_status="Pending Signature"
        )
        db.add(tenant)
        logger.info(f"🏠 Tenant record created for lead {lead.id}")
    else:
        logger.info(f"ℹ️ Tenant record already exists for lead {lead.id}")

    db.commit()
    logger.info(f"✅ Application {application_id} approved. Lead {lead.id} → Approved.")

    return {
        "status": "success",
        "message": f"Application approved. Tenant record created for {lead.prospect_name}.",
        "lead_id": lead.id,
    }


# --- PUT /{id}/reject — Reject application with reason ---
@router.put("/{application_id}/reject")
def reject_application(application_id: int, payload: ApplicationReject, db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if app.status != "Pending":
        raise HTTPException(status_code=400, detail=f"Application is already '{app.status}'")

    lead = db.query(Lead).filter(Lead.id == app.lead_id).first()

    app.status = "Rejected"
    app.rejection_reason = payload.rejection_reason

    if lead:
        lead.status = "Rejected"

    db.commit()
    logger.info(f"❌ Application {application_id} rejected. Reason: {payload.rejection_reason}")

    return {
        "status": "success",
        "message": "Application rejected.",
        "application_id": application_id,
    }

 
@router.post("/{application_id}/ai-review")
def trigger_ai_review(application_id: int, db: Session = Depends(get_db)):
    """Run AI risk assessment on an application."""
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
 
    try:
        from services.ai_review import run_ai_review
        result = run_ai_review(application_id=application_id, db=db)
 
        # Store on application record
        app.ai_review = result
        db.commit()
 
        logger.info(f"🤖 AI review completed for application {application_id}: {result.get('risk_level')}")
 
        return {
            "status": "success",
            "risk_level": result.get("risk_level"),
            "summary": result.get("summary"),
            "review": result,
        }
    except Exception as e:
        logger.error(f"❌ AI review failed for application {application_id}: {e}")
        raise HTTPException(status_code=500, detail=f"AI review failed: {str(e)}")
 
 
# --- POST /{id}/resend — Resend signing email to a specific signer ---
@router.post("/{application_id}/resend/{session_id}")
def resend_application_email(application_id: int, session_id: int, db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    session = db.query(SigningSession).filter(SigningSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Signing session not found")

    package = db.query(DocumentPackage).filter(DocumentPackage.id == session.package_id).first()

    sent = send_application_email(
        session.signer_name,
        session.signer_email,
        session.token,
        package.building if package else None
    )

    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send email")

    logger.info(f"📧 Resent application email to {session.signer_email} for application {application_id}")
    return {"status": "success", "message": f"Email resent to {session.signer_email}"}