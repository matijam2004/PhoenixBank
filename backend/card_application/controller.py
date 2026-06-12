from typing import List, Optional
from fastapi import APIRouter, Depends, Query

from database.core import get_db
from auth.service import require_scope
from .schemas import CardApplicationCreate, CardApplicationInDB, CardApplicationManagerSummary
from .service import (
    create_application_service,
    get_my_applications_service,
    get_all_applications_service,
    get_application_by_id_service,
    approve_application_service,
    reject_application_service,
)

router = APIRouter(prefix="/card-applications", tags=["card-applications"])


@router.post("/", response_model=CardApplicationInDB, status_code=201)
async def submit_application(
    payload: CardApplicationCreate,
    user=Depends(require_scope("customer")),
    db=Depends(get_db),
):
    return await create_application_service(user["sub"], payload, db)


@router.get("/my", response_model=List[CardApplicationInDB])
async def my_applications(
    user=Depends(require_scope("customer")),
    db=Depends(get_db),
):
    return await get_my_applications_service(user["sub"], db)


@router.get("/", response_model=List[CardApplicationManagerSummary])
async def all_applications(
    status: Optional[str] = Query(None),
    user=Depends(require_scope("manager")),
    db=Depends(get_db),
):
    # SSN and DOB excluded from bulk list via CardApplicationManagerSummary response model
    return await get_all_applications_service(db, status)


@router.get("/{app_id}", response_model=CardApplicationInDB)
async def get_application(
    app_id: str,
    user=Depends(require_scope("manager")),
    db=Depends(get_db),
):
    """Full application detail including SSN last 4 and DOB — manager only."""
    return await get_application_by_id_service(app_id, db)


@router.patch("/{app_id}/approve", response_model=CardApplicationInDB)
async def approve_application(
    app_id: str,
    user=Depends(require_scope("manager")),
    db=Depends(get_db),
):
    return await approve_application_service(app_id, user["sub"], db)


@router.patch("/{app_id}/reject", response_model=CardApplicationInDB)
async def reject_application(
    app_id: str,
    reason: str = Query(default=""),
    user=Depends(require_scope("manager")),
    db=Depends(get_db),
):
    return await reject_application_service(app_id, user["sub"], reason, db)
