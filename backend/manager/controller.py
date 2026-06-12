from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from database.core import get_db
from auth.service import get_current_user, require_scope
from .schemas import *
from .service import *

router = APIRouter(prefix="/managers", tags=["managers"], dependencies=[Depends(require_scope("manager"))])

@router.post("/{manager_id}", response_model=ManagerDetails)
async def get_manager(manager_id: str, db=Depends(get_db)):
    return await get_manager_service(ObjectId(manager_id), db)

@router.patch("/me", response_model=ManagerDetails)
async def update_me(
    patch: ManagerUpdate, 
    user=Depends(get_current_user), 
    db=Depends(get_db)
):
    """Self-service profile update"""
    return await update_manager_service(user['sub'], patch, db)

@router.patch("/{manager_id}", response_model=ManagerDetails)
async def update_manager_by_id(
    manager_id: str, 
    patch: ManagerUpdate,
    user=Depends(require_scope("manager")),
    db=Depends(get_db)
):
    """Manager-only profile update using given id"""
    return await update_manager_service(manager_id, patch, db)