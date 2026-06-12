from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from database.core import get_db
from .schemas import *
from .service import *

from transaction.schemas import TransactionInDB, TransactionOut
from transaction.service import get_transaction_list_by_account_service, get_transaction_service
from auth.service import require_scope, get_current_user

router = APIRouter(prefix="/accounts", tags=["accounts"])

# CREATE

@router.post("/", response_model=AccountInDB, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_scope("manager"))])
async def create_account(payload: AccountCreate, db=Depends(get_db)):
    return await create_account_service(payload, db)

# RETRIEVE ACCOUNT

@router.get("/{account_id}", response_model=AccountInDB)
async def get_account(account_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    account = await get_account_service(account_id, db)
    if user["scope"] == "customer" and str(account.customer_id) != user["sub"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return account

# RETRIEVE ACCOUNT/TRANSACTIONS

@router.get("/{account_id}/transactions", response_model=List[TransactionOut])
async def get_transaction_list_by_account(account_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    account = await get_account_service(account_id, db)
    if user["scope"] == "customer" and str(account.customer_id) != user["sub"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return await get_transaction_list_by_account_service(account_id, db)

@router.get("/{account_id}/transactions/{transaction_id}", response_model=TransactionInDB)
async def get_transaction(account_id: str, transaction_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    account = await get_account_service(account_id, db)
    if user["scope"] == "customer" and str(account.customer_id) != user["sub"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return await get_transaction_service(transaction_id, db)

# UPDATE

@router.patch(
    "/{account_id}",
    response_model=AccountInDB,
    dependencies=[Depends(require_scope("manager"))],
)
async def update_account(account_id: str, payload: AccountUpdate, db=Depends(get_db)):
    return await update_account_service(account_id, payload, db)
