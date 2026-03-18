from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from typing import Optional
from datetime import date, timedelta 
# Fixed imports to match new modular structure
from database import get_db
from models import Lead

router = APIRouter()

@router.get("/") 
def get_leads(
    skip: int = 0, 
    limit: int = 20, 
    status: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
    start_date: Optional[date] = Query(None, description="Filter leads created on or after this date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter leads created on or before this date (YYYY-MM-DD)"),
    source: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    API for frontend dashboard.
    Supports pagination, filtering, searching, and date ranges.
    """
    query = db.query(Lead)

    # 1. Filter by Source
    if source:
        query = query.filter(Lead.source.ilike(f"%{source}%"))

    # 2. Filter by Status
    if status and status != "All":
        query = query.filter(Lead.status == status)

    # 3. Search by name or email
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (Lead.prospect_name.ilike(search_fmt)) | 
            (Lead.email.ilike(search_fmt))
        )

    # 4. Date Range Filter
    if start_date:
        query = query.filter(Lead.created_at >= start_date)
    
    if end_date:
        next_day = end_date + timedelta(days=1)
        query = query.filter(Lead.created_at < next_day)

    # 5. Dynamic Sorting
    if sort_by and hasattr(Lead, sort_by):
        sort_column = getattr(Lead, sort_by)
        if sort_order == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(desc(Lead.id))

    # 6. Execution
    leads = query.offset(skip).limit(limit).all()
    
    return leads