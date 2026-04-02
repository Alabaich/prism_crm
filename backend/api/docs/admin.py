import os
import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Doc, Application, Lead
import logging

router = APIRouter()
logger = logging.getLogger("docs")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/{doc_id}/download")
def download_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Doc).filter(Doc.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    abs_path = os.path.join(os.getcwd(), doc.file_path)

    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=abs_path,
        filename=doc.file_name,
        media_type=doc.file_type or "application/pdf",
    )


@router.get("/application/{application_id}/merge-download")
def merge_download(application_id: int, db: Session = Depends(get_db)):
    """Merge all documents for an application into a single PDF and stream it."""
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Collect all doc IDs in order
    doc_ids = []
    if app.signed_form_410_id:    doc_ids.append(app.signed_form_410_id)
    if app.signed_consent_id:     doc_ids.append(app.signed_consent_id)
    if app.id_document_id:        doc_ids.append(app.id_document_id)
    if app.income_proof_id:       doc_ids.append(app.income_proof_id)
    if app.landlord_reference_id: doc_ids.append(app.landlord_reference_id)
    for co in (app.co_applicants or []):
        if co.get("id_document_id"):        doc_ids.append(co["id_document_id"])
        if co.get("income_proof_id"):       doc_ids.append(co["income_proof_id"])
        if co.get("landlord_reference_id"): doc_ids.append(co["landlord_reference_id"])
    for doc_id in (app.additional_doc_ids or []):
        doc_ids.append(doc_id)

    if not doc_ids:
        raise HTTPException(status_code=404, detail="No documents found for this application")

    docs = []
    for doc_id in doc_ids:
        doc = db.query(Doc).filter(Doc.id == doc_id).first()
        if doc:
            docs.append(doc)

    if not docs:
        raise HTTPException(status_code=404, detail="No files found on disk")

    try:
        import fitz

        merged = fitz.open()

        for doc in docs:
            abs_path = doc.file_path if os.path.isabs(doc.file_path) else os.path.join(os.getcwd(), doc.file_path)
            if not os.path.exists(abs_path):
                continue

            mime = doc.file_type or ""

            if mime == "application/pdf":
                src = fitz.open(abs_path)
                merged.insert_pdf(src)
                src.close()
            elif mime in ("image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"):
                img_doc = fitz.open()
                rect = fitz.Rect(0, 0, 595, 842)
                page = img_doc.new_page(width=rect.width, height=rect.height)
                page.insert_image(rect, filename=abs_path)
                merged.insert_pdf(img_doc)
                img_doc.close()

        output = io.BytesIO()
        merged.save(output)
        merged.close()
        output.seek(0)

        lead = db.query(Lead).filter(Lead.id == app.lead_id).first()
        name = (lead.prospect_name or "applicant").replace(" ", "_").lower() if lead else "applicant"
        filename = f"application_{name}_{application_id}.pdf"

        return StreamingResponse(
            output,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )

    except Exception as e:
        logger.error(f"Merge failed for application {application_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to merge documents: {str(e)}")