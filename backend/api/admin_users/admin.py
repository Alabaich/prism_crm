from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import uuid
import bcrypt

from database import SessionLocal
from models import AdminUser, Building, Booking, Lead
from api.auth.admin import get_current_admin, require_superadmin

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================================
# SCHEMAS
# ==========================================

class BuildingOut(BaseModel):
    id: int
    name: str
    address: Optional[str]
    city: Optional[str]
    assigned_admin_id: Optional[int]

    class Config:
        from_attributes = True


class AdminUserOut(BaseModel):
    id: int
    username: str
    role: str
    email: Optional[str]
    booking_token: Optional[str]
    buildings: List[BuildingOut] = []

    class Config:
        from_attributes = True


class AssignBuildingPayload(BaseModel):
    building_id: int


class UpdateUserPayload(BaseModel):
    email: Optional[str] = None


class BuildingCreate(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None


class AdminUserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str = "admin"


# ==========================================
# USERS ENDPOINTS
# ==========================================

@router.get("/", response_model=List[AdminUserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin),
):
    return db.query(AdminUser).filter(AdminUser.is_active == True).all()


@router.post("/")
def create_admin_user(
    payload: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_superadmin),
):
    # Check for duplicate username or email
    existing = db.query(AdminUser).filter(
        (AdminUser.username == payload.username) | (AdminUser.email == payload.email)
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")
        
    hashed = bcrypt.hashpw(payload.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    new_user = AdminUser(
        username=payload.username,
        email=payload.email,
        hashed_password=hashed,
        role=payload.role,
        booking_token=str(uuid.uuid4()),
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    return {"status": "success", "user_id": new_user.id}


@router.delete("/{user_id}")
def deactivate_admin_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_superadmin),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account.")
        
    user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Soft delete
    user.is_active = False
    
    # Optionally unassign buildings so they are freed up for other admins
    db.query(Building).filter(Building.assigned_admin_id == user_id).update({"assigned_admin_id": None})
    
    db.commit()
    return {"status": "success", "message": "User deactivated."}


@router.put("/{user_id}/buildings")
def assign_building(
    user_id: int,
    payload: AssignBuildingPayload,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_superadmin),
):
    user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    building = db.query(Building).filter(Building.id == payload.building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    building.assigned_admin_id = user_id
    db.commit()
    return {"status": "ok", "building_id": building.id, "assigned_to": user_id}


@router.put("/{user_id}")
def update_user(
    user_id: int,
    payload: UpdateUserPayload,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_superadmin),
):
    user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.email is not None:
        user.email = payload.email

    db.commit()
    return {"status": "ok", "id": user.id, "email": user.email}


@router.post("/{user_id}/regenerate-token")
def regenerate_token(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_superadmin),
):
    user = db.query(AdminUser).filter(AdminUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.booking_token = str(uuid.uuid4())
    db.commit()
    return {"status": "ok", "booking_token": user.booking_token}


# ==========================================
# BUILDINGS ENDPOINTS
# ==========================================

@router.get("/buildings", response_model=List[BuildingOut])
def list_buildings(
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin),
):
    return db.query(Building).all()


@router.post("/buildings")
def create_building(
    payload: BuildingCreate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_superadmin),
):
    new_building = Building(
        name=payload.name,
        address=payload.address,
        city=payload.city
    )
    db.add(new_building)
    db.commit()
    return {"status": "success", "building_id": new_building.id}


@router.delete("/buildings/{building_id}")
def delete_building(
    building_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_superadmin),
):
    building = db.query(Building).filter(Building.id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
        
    # Safety Check: Do not delete if it has historical bookings or leads
    has_bookings = db.query(Booking).filter(Booking.building_id == building_id).first()
    has_leads = db.query(Lead).filter(Lead.building_id == building_id).first()
    
    if has_bookings or has_leads:
        raise HTTPException(status_code=400, detail="Cannot delete a building that has associated leads or bookings.")
    
    db.delete(building)
    db.commit()
    return {"status": "success", "message": "Building removed."}