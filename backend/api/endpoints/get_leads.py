from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from typing import List, Optional
from datetime import date, timedelta 
from database import SessionLocal
from models import Lead

router = APIRouter()

# --- Database Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- GET / (Reads leads with Sorting, Search, and Date Range) ---
@router.get("/") 
def get_leads(
    skip: int = 0, 
    limit: int = 20, 
    status: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "created_at", # Default sort column
    sort_order: Optional[str] = "desc",    # Default direction
    # Add Date Parameters here
    start_date: Optional[date] = Query(None, description="Filter leads created on or after this date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter leads created on or before this date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    source: Optional[str] = None
):
    """
    API for frontend.
    Supports pagination, filtering by status, search, dynamic sorting, AND Date Range.
    """
    query = db.query(Lead)

    if source:
        query = query.filter(Lead.source.ilike(f"%{source}%"))

    # 1. Filter by Status (if specific status provided)
    if status and status != "All":
        query = query.filter(Lead.status == status)

    # 2. Search (by name or email)
    if search:
        # ilike provides case-insensitive search
        search_fmt = f"%{search}%"
        query = query.filter(
            (Lead.prospect_name.ilike(search_fmt)) | 
            (Lead.email.ilike(search_fmt))
        )

    # 3. Date Range Filter (New Logic)
    if start_date:
        # Leads created on or after the start date (at 00:00:00)
        query = query.filter(Lead.created_at >= start_date)
    
    if end_date:
        # Leads created BEFORE the next day. 
        # Example: If end_date is 2023-10-01, we want everything up to 2023-10-01 23:59:59.
        # The safest way is to say "created_at < 2023-10-02"
        next_day = end_date + timedelta(days=1)
        query = query.filter(Lead.created_at < next_day)

    # 4. Dynamic Sorting
    # We check if the 'sort_by' string matches a valid attribute on the Lead model
    if sort_by and hasattr(Lead, sort_by):
        sort_column = getattr(Lead, sort_by)
        
        if sort_order == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))
    else:
        # Fallback: Sort by ID descending if the column is invalid
        query = query.order_by(desc(Lead.id))

    # 5. Pagination
    leads = query.offset(skip).limit(limit).all()
    
    return leads