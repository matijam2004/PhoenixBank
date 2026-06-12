from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.encoders import jsonable_encoder
from bson import ObjectId

from database.core import get_db
from auth.service import get_current_user, require_scope
from .schemas import *
from .service import *

from account.schemas import AccountInDB
from account.service import get_account_list_by_customer_service, get_account_list_by_phone_service

from transaction.schemas import TransactionInDB, TransactionsQuery, TransactionsPage
from transaction.service import list_transactions

from scheduled_payment.schemas import ScheduledPaymentInDB
from scheduled_payment.service import get_scheduled_payment_list_by_customer_service

router = APIRouter(prefix="/customers", tags=["customers"])

# CREATE


# UPDATE
@router.patch("/me", response_model=CustomerDetails)
async def update_me(
    patch: CustomerUpdate,
    user=Depends(require_scope("customer")),
    db=Depends(get_db),
):
    """Self-service profile update"""
    return await update_customer_service(user['sub'], patch, db)

@router.patch("/{customer_id}", response_model=CustomerDetails, dependencies=[Depends(require_scope("manager"))])
async def update_customer_by_id(
    customer_id: str, 
    patch: CustomerUpdate, 
    user=Depends(require_scope("manager")),
    db=Depends(get_db)
):
    """Manager-only profile update using given id"""
    return await update_customer_by_id_service(customer_id, patch, db)

# RETRIEVE

@router.get("/", response_model=List[CustomerDetails], dependencies=[Depends(require_scope("manager"))])
async def list_customers(db=Depends(get_db)):
    """List all customers (manager only)"""
    return await list_customers_service(db)

@router.get("/{customer_id}", response_model=CustomerDetails)
async def get_customer(customer_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    if user["scope"] == "customer" and user["sub"] != customer_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return await get_customer_service(customer_id, db)

# notifications-related
@router.get("/{customer_id}/notifications")
async def get_notifications(customer_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    if (user['sub'] != customer_id):
        raise HTTPException(status_code=403, detail="Forbidden: attempt to view other notifications")
    
    cursor = db['notifications'].find({"customer_id": ObjectId(customer_id)})

    return [Notification(**doc) async for doc in cursor]

# accounts-related
@router.get("/{customer_id}/accounts", response_model=List[AccountInDB])
async def get_account_list_by_customer(customer_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    if user["scope"] == "customer" and user["sub"] != customer_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        return await get_account_list_by_customer_service(customer_id, db)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/phones/{phone}/accounts", response_model=List[AccountInDB],
            dependencies=[Depends(require_scope("manager"))])
async def get_account_list_by_phone(phone: str, db=Depends(get_db)):
    return await get_account_list_by_phone_service(phone, db)

# Transaction endpoints
@router.get("/{customer_id}/transactions", response_model=TransactionsPage)
async def get_transactions_by_customer(
    customer_id: str,
    user=Depends(get_current_user),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    status: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    db=Depends(get_db),
):
    if user["scope"] == "customer" and user["sub"] != customer_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    q = TransactionsQuery(
        customer_id=customer_id,
        start_date=start_date,
        end_date=end_date,
        min_amount=min_amount,
        max_amount=max_amount,
        status=status,
        limit=max(0, min(limit, 200)),
        skip=max(0, skip),
    )

    items, total = await list_transactions(db, q)
    page = TransactionsPage(items=items, total=total, limit=q.limit, skip=q.skip)
    return jsonable_encoder(page)

@router.get("/{customer_id}/accounts/{account_id}/transactions", response_model=TransactionsPage)
async def get_transactions(
    account_id: str,
    customer_id: str,
    transaction_id: Optional[str] = Query(None),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    status: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    sort: str = "created_at",
    order: str = "desc",
    db = Depends(get_db),
):
    q = TransactionsQuery(
        transaction_id=transaction_id,
        account_id=account_id,
        customer_id=customer_id,
        start_date=start_date,
        end_date=end_date,
        min_amount=min_amount,
        max_amount=max_amount,
        status=status,
        limit=max(0, min(limit, 200)),
        skip=max(0, skip),
        sort=sort if sort in {"created_at", "amount", "_id"} else "created_at",
        order=order if order in {"asc", "desc"} else "desc",
    )

    items, total = await list_transactions(db, q)
    page = TransactionsPage(items=items, total=total, limit=q.limit, skip=q.skip)
    return jsonable_encoder(page)

# scheduled-payments related

@router.get('/{customer_id}/scheduled-payments', response_model=List[ScheduledPaymentInDB])
async def get_scheduled_payment_list_by_customer(customer_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    if user["scope"] == "customer" and user["sub"] != customer_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return await get_scheduled_payment_list_by_customer_service(customer_id, db)
