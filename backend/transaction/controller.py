from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, Request, Header, HTTPException, status, Query
from fastapi.encoders import jsonable_encoder
from bson import ObjectId

from database.core import get_db

from auth.service import get_current_user, require_scope
from shared.idempotency import ensure_idempotency, update_idempotency_record
from .schemas import *
from .service import *

router = APIRouter(
    prefix="/transactions", 
    tags=["transactions"]
)

@router.post("/", response_model=TransactionInDB, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    payload: TransactionRequest,
    request: Request, 
    user=Depends(require_scope("customer", "manager")), 
    db=Depends(get_db),
    idempotency_key: str = Header(..., alias="Idempotency-Key")
):

    idem = await ensure_idempotency(request, db, user_id=user['sub'])
    if idem.get("mode") == "replay":
        return idem["body"]

    return await create_transaction_service(payload, idempotency_key, user['sub'], db)


@router.get("/{transaction_id}", response_model=TransactionInDB)
async def get_transaction(transaction_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    txn = await get_transaction_service(transaction_id, db)
    if user["scope"] == "customer":
        # Customers may only view transactions that involve their own accounts
        customer_id = user["sub"]
        from_acc = str(txn.from_account_id) if txn.from_account_id else None
        to_acc   = str(txn.to_account_id)   if txn.to_account_id   else None
        # Verify the customer owns at least one of the accounts in the transaction
        owned = await db["accounts"].find_one({
            "_id": {"$in": [
                *([ObjectId(from_acc)] if from_acc else []),
                *([ObjectId(to_acc)]   if to_acc   else []),
            ]},
            "customer_id": ObjectId(customer_id),
        })
        if not owned:
            raise HTTPException(status_code=403, detail="Forbidden")
    return txn

@router.get("/", response_model=TransactionsPage)
async def get_transactions(
    transaction_id: Optional[str] = Query(None),
    account_id: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    status: Optional[str] = None,
    limit: int = 200,
    skip: int = 0,
    sort: str = "created_at",
    order: str = "desc",
    db = Depends(get_db),
    user = Depends(require_scope('customer', 'manager')),
):
    if (
        user['scope'] == 'customer' 
        and customer_id is not None 
        and user['sub'] != customer_id
    ):
        raise HTTPException(403, 'Forbidden: attempt to view other private transactions')

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
