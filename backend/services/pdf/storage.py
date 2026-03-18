"""
storage.py
Handles saving PDFs to server disk and registering them in the docs table.

Folder structure on server:
    backend/storage/
    ├── assembled/    ← generated PDFs before signing
    ├── signatures/   ← individual signature PNGs (archived after signing)
    └── signed/       ← final signed PDFs (permanent)
"""

import os
import base64
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from models import Doc

logger = logging.getLogger("pdf.storage")

# Base storage path — relative to backend/
STORAGE_BASE = os.path.join(os.getcwd(), "storage")
ASSEMBLED_DIR = os.path.join(STORAGE_BASE, "assembled")
SIGNATURES_DIR = os.path.join(STORAGE_BASE, "signatures")
SIGNED_DIR = os.path.join(STORAGE_BASE, "signed")


def ensure_dirs():
    """Create storage directories if they don't exist."""
    for d in [ASSEMBLED_DIR, SIGNATURES_DIR, SIGNED_DIR]:
        os.makedirs(d, exist_ok=True)


def save_assembled_pdf(pdf_bytes: bytes, filename: str) -> str:
    """
    Save a generated (unsigned) PDF to storage/assembled/.

    Args:
        pdf_bytes: PDF file content as bytes
        filename:  e.g. 'form_410_package_5.pdf'

    Returns:
        Full path to saved file
    """
    ensure_dirs()
    path = os.path.join(ASSEMBLED_DIR, filename)
    with open(path, "wb") as f:
        f.write(pdf_bytes)
    logger.info(f"📄 Assembled PDF saved: {path}")
    return path


def save_signature_png(b64_data: str, filename: str) -> str:
    """
    Save a base64 signature PNG to storage/signatures/.

    Args:
        b64_data: base64 string (with or without data: prefix)
        filename: e.g. 'sig_session_3_form_410.png'

    Returns:
        Full path to saved file
    """
    ensure_dirs()

    if "," in b64_data:
        b64_data = b64_data.split(",", 1)[1]

    img_bytes = base64.b64decode(b64_data)
    path = os.path.join(SIGNATURES_DIR, filename)
    with open(path, "wb") as f:
        f.write(img_bytes)
    logger.info(f"✍️ Signature PNG saved: {path}")
    return path


def save_signed_pdf(pdf_bytes: bytes, filename: str) -> str:
    """
    Save a completed signed PDF to storage/signed/.

    Args:
        pdf_bytes: PDF file content as bytes
        filename:  e.g. 'signed_form_410_package_5_session_3.pdf'

    Returns:
        Full path to saved file
    """
    ensure_dirs()
    path = os.path.join(SIGNED_DIR, filename)
    with open(path, "wb") as f:
        f.write(pdf_bytes)
    logger.info(f"✅ Signed PDF saved: {path}")
    return path


def register_doc(
    db: Session,
    file_path: str,
    file_name: str,
    file_type: str = "application/pdf",
    doc_category: str = "other",
    uploaded_by: int = None,
    notes: str = None
) -> Doc:
    """
    Register a file in the docs table.

    Args:
        db:           SQLAlchemy session
        file_path:    Full path on server disk
        file_name:    Original or display filename
        file_type:    MIME type
        doc_category: e.g. 'signed_application', 'signed_lease', 'id_upload'
        uploaded_by:  admin_users.id (null if uploaded by applicant)
        notes:        Optional notes

    Returns:
        The created Doc record
    """
    doc = Doc(
        file_name=file_name,
        file_path=file_path,
        file_type=file_type,
        doc_category=doc_category,
        uploaded_by=uploaded_by,
        notes=notes
    )
    db.add(doc)
    db.flush()  # get doc.id without full commit
    logger.info(f"📋 Doc registered in DB: id={doc.id}, category={doc_category}, path={file_path}")
    return doc


def get_relative_path(full_path: str) -> str:
    """Convert absolute path to relative (for display/portability)."""
    return os.path.relpath(full_path, os.getcwd())