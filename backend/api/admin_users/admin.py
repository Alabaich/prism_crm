from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import uuid

from database import SessionLocal
from models import AdminUser, Building
from api.auth.admin import get_current_admin, require_superadmin

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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


@router.get("/", response_model=List[AdminUserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin),
):
    return db.query(AdminUser).filter(AdminUser.is_active == True).all()


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


@router.get("/buildings", response_model=List[BuildingOut])
def list_buildings(
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin),
):
    return db.query(Building).all()


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
