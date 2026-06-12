from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Response
from bson import ObjectId

from database.core import get_db
from auth.service import get_current_user, require_scope
from .schemas import *
from .service import *

router = APIRouter(prefix="/scheduled-payments", tags=["scheduled-payments"])

# CREATE

@router.post("/")
async def create_scheduled_payment(payload: ScheduledPaymentCreate, db=Depends(get_db)):
    try:
        return await create_scheduled_payment_service(payload, db)
    except Exception:
        raise

# RETRIEVE

@router.get('/{scheduled_payment_id}', response_model=ScheduledPaymentInDB)
async def get_scheduled_payment(scheduled_payment_id: str, db = Depends(get_db)):
    return await get_scheduled_payment_service(scheduled_payment_id, db)

# UPDATE

@router.patch('/{scheduled_payment_id}', response_model=ScheduledPaymentInDB)
async def update_scheduled_payment(scheduled_payment_id: str, payload: ScheduledPaymentUpdate, db = Depends(get_db)):
    return await update_scheduled_payment_service(scheduled_payment_id, payload, db)

# DELETE
@router.delete('/{scheduled_payment_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_scheduled_payment(scheduled_payment_id: str, db = Depends(get_db)):
    await delete_scheduled_payment_service(scheduled_payment_id, db)

    return Response(status_code=status.HTTP_204_NO_CONTENT)
