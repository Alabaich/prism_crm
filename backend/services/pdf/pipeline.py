"""
pipeline.py
Orchestrates the full PDF signing pipeline for applications.

Called when all signers have completed signing.
Flow:
    1. Load application data from DB
    2. Generate filled PDFs (Form 410, Privacy Consent)
    3. Stamp each signer's signature onto the correct PDF at the correct coordinates
    4. Save final signed PDFs to disk
    5. Register in docs table
    6. Update application record with doc IDs

Usage:
    from services.pdf.pipeline import process_completed_application

    process_completed_application(package_id=5, db=db)
"""

import os
import logging
from datetime import datetime
from sqlalchemy.orm import Session

from models import (
    Application, Lead, DocumentPackage, PackageDocument,
    SigningSession, Doc
)
from services.pdf.stamper import stamp_signature
from services.pdf.storage import (
    save_assembled_pdf, save_signed_pdf, register_doc, get_relative_path
)
from services.pdf.generators.form_410 import build_form_410, get_signature_coords as form_410_coords
from services.pdf.generators.privacy_consent import build_privacy_consent, get_signature_coords as consent_coords

logger = logging.getLogger("pdf.pipeline")


def process_completed_application(package_id: int, db: Session) -> dict:
    """
    Run the full PDF pipeline for a completed application package.

    Args:
        package_id: ID of the DocumentPackage
        db:         SQLAlchemy session

    Returns:
        dict with doc IDs for form_410 and privacy_consent
    """
    logger.info(f"🚀 Starting PDF pipeline for package {package_id}")

    # --- 1. Load package and verify it's completed ---
    package = db.query(DocumentPackage).filter(DocumentPackage.id == package_id).first()
    if not package:
        raise ValueError(f"Package {package_id} not found")

    if package.status != "completed":
        raise ValueError(f"Package {package_id} is not completed (status: {package.status})")

    # --- 2. Load application data ---
    if not package.lead_id:
        raise ValueError(f"Package {package_id} has no lead_id")

    lead = db.query(Lead).filter(Lead.id == package.lead_id).first()
    if not lead:
        raise ValueError(f"Lead {package.lead_id} not found")

    app = db.query(Application).filter(Application.lead_id == package.lead_id).first()
    if not app:
        raise ValueError(f"Application not found for lead {package.lead_id}")

    # --- 3. Load all signing sessions (ordered by created_at = signer order) ---
    sessions = db.query(SigningSession).filter(
        SigningSession.package_id == package_id
    ).order_by(SigningSession.created_at).all()

    if not sessions:
        raise ValueError(f"No signing sessions found for package {package_id}")

    # Verify all sessions are completed
    incomplete = [s for s in sessions if s.status != "completed"]
    if incomplete:
        raise ValueError(f"Not all sessions completed. Incomplete: {[s.id for s in incomplete]}")

    # --- 4. Build data dict for PDF generators ---
    pdf_data = {
        "prospect_name": lead.prospect_name,
        "email": lead.email,
        "phone": lead.phone,
        "building": package.building,
        "unit_number": package.unit_number,
        "lease_start": package.lease_start,
        "monthly_rent": package.monthly_rent,
        # Application fields
        "employer_name": app.employer_name,
        "employment_type": app.employment_type,
        "monthly_income": app.monthly_income,
        "position_held": app.position_held,
        "length_of_employment": app.length_of_employment,
        "prior_employer_name": app.prior_employer_name,
        "prior_position_held": app.prior_position_held,
        "prior_length_of_employment": app.prior_length_of_employment,
        "co_applicants": app.co_applicants,
        "other_occupants": app.other_occupants,
        "has_pet": app.has_pet,
        "pet_details": app.pet_details,
        "parking_requested": app.parking_requested,
        "reference_1_name": app.reference_1_name,
        "reference_1_phone": app.reference_1_phone,
        "reference_2_name": app.reference_2_name,
        "reference_2_phone": app.reference_2_phone,
        "previous_addresses": app.previous_addresses,
        "vacating_reason": app.vacating_reason,
    }

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    result = {}

    # ==========================================================================
    # PROCESS EACH DOCUMENT TYPE
    # ==========================================================================

    doc_configs = [
        {
            "document_type": "rental_application",
            "generator": build_form_410,
            "coords_fn": form_410_coords,
            "assembled_name": f"form_410_pkg{package_id}_{timestamp}.pdf",
            "signed_name": f"signed_form_410_pkg{package_id}_{timestamp}.pdf",
            "display_name": "Form 410 — Rental Application",
            "doc_category": "signed_application",
            "app_field": "signed_form_410_id",
        },
        {
            "document_type": "privacy_consent",
            "generator": build_privacy_consent,
            "coords_fn": consent_coords,
            "assembled_name": f"privacy_consent_pkg{package_id}_{timestamp}.pdf",
            "signed_name": f"signed_privacy_consent_pkg{package_id}_{timestamp}.pdf",
            "display_name": "Schedule A — Privacy Consent",
            "doc_category": "signed_application",
            "app_field": "signed_consent_id",
        },
    ]

    for config in doc_configs:
        doc_type = config["document_type"]
        logger.info(f"📄 Processing {doc_type}...")

        try:
            # --- Generate filled PDF ---
            pdf_bytes = config["generator"](pdf_data)
            assembled_path = save_assembled_pdf(pdf_bytes, config["assembled_name"])

            # --- Build signature list for stamper ---
            # Each session may have signed this document
            signatures_to_stamp = []
            for i, session in enumerate(sessions):
                session_sigs = session.signatures or {}
                if doc_type in session_sigs:
                    sig_data = session_sigs[doc_type]
                    coords = config["coords_fn"](i)
                    signatures_to_stamp.append({
                        "page": coords["page"],
                        "x": coords["x"],
                        "y": coords["y"],
                        "width": coords["width"],
                        "height": coords["height"],
                        "signature_b64": sig_data["signature_data"],
                    })

            # --- Stamp signatures onto PDF ---
            signed_path = os.path.join(
                os.getcwd(), "storage", "signed", config["signed_name"]
            )

            if signatures_to_stamp:
                stamp_signature(
                    pdf_path=assembled_path,
                    output_path=signed_path,
                    signatures=signatures_to_stamp
                )
            else:
                # No signatures found — save assembled as signed (shouldn't happen)
                logger.warning(f"⚠️ No signatures found for {doc_type} in package {package_id}")
                with open(assembled_path, "rb") as f:
                    save_signed_pdf(f.read(), config["signed_name"])

            # --- Register in docs table ---
            doc_record = register_doc(
                db=db,
                file_path=get_relative_path(signed_path),
                file_name=config["signed_name"],
                file_type="application/pdf",
                doc_category=config["doc_category"],
                notes=f"Package {package_id} — {config['display_name']}"
            )

            # --- Update PackageDocument record ---
            pkg_doc = db.query(PackageDocument).filter(
                PackageDocument.package_id == package_id,
                PackageDocument.document_type == doc_type
            ).first()
            if pkg_doc:
                pkg_doc.assembled_pdf_path = get_relative_path(assembled_path)
                pkg_doc.signed_pdf_path = get_relative_path(signed_path)
                pkg_doc.doc_id = doc_record.id

            # --- Update Application record with doc ID ---
            setattr(app, config["app_field"], doc_record.id)

            result[doc_type] = {
                "doc_id": doc_record.id,
                "signed_path": get_relative_path(signed_path),
            }

            logger.info(f"✅ {doc_type} completed — doc_id={doc_record.id}")

        except Exception as e:
            logger.error(f"❌ Failed to process {doc_type}: {e}")
            raise

    db.commit()
    logger.info(f"🎉 PDF pipeline completed for package {package_id}. Docs: {result}")
    return result


def trigger_pipeline_if_complete(package_id: int, db: Session):
    """
    Check if all sessions are complete and trigger the pipeline if so.
    Call this after every signature submission.
    """
    sessions = db.query(SigningSession).filter(
        SigningSession.package_id == package_id
    ).all()

    if not sessions:
        return

    all_complete = all(s.status == "completed" for s in sessions)

    if all_complete:
        logger.info(f"🔔 All sessions complete for package {package_id} — triggering PDF pipeline")
        try:
            process_completed_application(package_id=package_id, db=db)
        except Exception as e:
            logger.error(f"❌ Pipeline failed for package {package_id}: {e}")
    else:
        pending = [s.id for s in sessions if s.status != "completed"]
        logger.info(f"⏳ Package {package_id} — waiting on sessions: {pending}")