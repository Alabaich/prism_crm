import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Doc
 
router = APIRouter()
 
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