import logging
import uuid
from datetime import datetime, date, time, timedelta, timezone
from fastapi import HTTPException
from bson import ObjectId
from pymongo import ReturnDocument, ASCENDING, DESCENDING
from typing import Union, Tuple, Optional
from database.mongo_decimal import to_decimal128
from decimal import Decimal
from .schemas import *

from shared.payments import charge_with_merchant
from shared.idempotency import ensure_idempotency, update_idempotency_record, create_idempotency
from shared.locks import try_acquire_lock, release_lock

logger = logging.getLogger(__name__)

BATCH_SIZE = 100
LOCK_NAME = "process_due_transactions"
LOCK_LEASE_SECONDS = 90

TRANSFER_TYPES = ['transfer', 'external', 'internal']

async def create_transaction_service(payload: TransactionRequest, idempotency_key: str, user_id, db):
    user_id = ObjectId(user_id)

    try:
        if payload.type == 'deposit':
            out = await deposit_service(payload, db)
        elif payload.type == 'withdraw':
            out = await withdraw_service(payload, db)
        elif payload.type in TRANSFER_TYPES:
            out = await transfer_service(payload, user_id, db)
        elif payload.type == 'check':
            await create_idempotency(idempotency_key, user_id, "", db)
            out = await deposit_service(payload, db)
        elif payload.type == 'payment':
            await create_idempotency(idempotency_key, user_id, "", db)
            out = await payment_service(payload, db)
        else:
            raise HTTPException(501, f'{payload.type} action is unknown')

        await update_idempotency_record(
            db,
            key=idempotency_key,
            user_id=user_id,
            status="completed",
            response_status=201,
            response_body=out,
        )

        return out

    except HTTPException as e:
        await update_idempotency_record(
            db,
            key=idempotency_key,
            user_id=user_id,
            status="failed",
            extra_fields={"error": e.detail},
        )

        raise

    except Exception as e:
        await update_idempotency_record(
            db,
            key=idempotency_key,
            user_id=user_id,
            status="failed",
            extra_fields={"error": str(e)},
        )

        raise

async def get_transaction_list_by_account_service(account_id: str, db):
    try:
        acct_oid = ObjectId(account_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid account_id")

    cur = db["transactions"].find({
        "$or": [
            {"from_account_id": acct_oid},
            {"to_account_id": acct_oid},
        ]
    }).sort("created_at", -1)

    docs = await cur.to_list(length=None)

    # TransactionOut strips internal fields and normalises Decimal128 values into
    # plain floats for the API response. We iterate defensively so a single
    # malformed document doesn't blow up the entire account view.
    items = []
    for d in docs:
        try:
            items.append(TransactionOut.from_mongo(d))
        except Exception as e:
            logger.error("Error converting transaction document: %s", e)
            continue
    
    return items

async def get_transaction_service(transaction_id: str, db):
    try:
        oid = ObjectId(transaction_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid transaction_id")

    doc = await db["transactions"].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Transaction not found")

    model = TA_TransactionInDB.validate_python(doc)

    return model


# Money-movement helpers. All callers are responsible for wrapping these in a
# MongoDB session and transaction to ensure atomicity across multiple accounts.

async def _inc_balance(db, account_id: ObjectId, amount: Decimal, session=None):
    """
    Atomically increments balance on an active account.
    Returns the updated account doc.
    Raises HTTPException if the account is missing/inactive.
    """

    amount: Decimal128 = to_decimal128(amount)

    doc = await db["accounts"].find_one_and_update(
        {"_id": account_id, "status": "active"},
        {"$inc": {"balance": amount}},
        return_document=ReturnDocument.AFTER,
        session=session,
    )

    if not doc:
        raise HTTPException(status_code=400, detail="Destination account unavailable")

    return doc

async def _dec_balance(db, account_id: ObjectId, amount: Decimal, session=None):
    """
    Atomically decrements balance on an active account.
    Returns the updated account doc.
    Raises HTTPException if the account is missing/inactive.
    """

    amount_orig: Decimal128 = to_decimal128(amount)
    amount_negative: Decimal128 = to_decimal128(-amount)

    acct = await db["accounts"].find_one({"_id": account_id})
    if not acct:
        raise HTTPException(status_code=404, detail="Account not found")

    if acct["status"] != "active":
        raise HTTPException(status_code=409, detail=f"Account is {acct['status']}")

    # The $gte guard is part of the query predicate rather than a separate check.
    # This makes the balance check and the decrement a single atomic operation —
    # a concurrent request can't sneak in between a check and an update.
    doc = await db["accounts"].find_one_and_update(
        {"_id": account_id, "balance": {"$gte": amount_orig}},
        {"$inc": {"balance": amount_negative}},
        return_document=ReturnDocument.AFTER,
        session=session,
    )

    if not doc:
        raise HTTPException(status_code=409, detail="Insufficient funds")

    return doc

async def _get_created_transaction(db, txn_id: ObjectId):
    doc = await db["transactions"].find_one({"_id": txn_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Transaction not found")

    model = TA_TransactionInDB.validate_python(doc)


    return model.model_dump(by_alias=True) 


async def deposit_service(payload: TransactionRequest, db):

    now = datetime.utcnow()

    data = payload.model_dump()
    txn = {
        **{k: v for k, v in data.items() if k != "account_id"},
        "status": "pending",
        "created_at": now,
        "run_at": data['run_at'] if data['run_at'] else now,
        "amount": to_decimal128(data["amount"]),
        "to_account_id": ObjectId(data["account_id"]),
    }

    try:
        async with await db.client.start_session() as s:
            async with s.start_transaction():
                
                amount = txn['amount'].to_decimal()

                await db["transactions"].insert_one(txn, session=s)
                await _inc_balance(db, txn["to_account_id"], amount, session=s)
                
                result = await db["transactions"].find_one_and_update(
                    {"_id": txn["_id"]},
                    {"$set": {"status": "posted", "posted_at": datetime.utcnow()}},
                    session=s,
                    return_document=ReturnDocument.AFTER,
                )

    except Exception as e:
        await db["transactions"].update_one(
            {"_id": txn["_id"]},
            {"$set": {"status": "failed", "reason": str(e)}},
        )

        logger.error("Transaction failed: %s", e)
        raise

    
    if result:
        return result
    else:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

async def withdraw_service(payload: TransactionRequest, db):

    now = datetime.utcnow()

    data = payload.model_dump()
    txn = {
        **{k: v for k, v in data.items() if k != "account_id"},
        "status": "pending",
        "created_at": now,
        "run_at": data['run_at'] if data['run_at'] else now,
        "amount": to_decimal128(data["amount"]),
        "from_account_id": ObjectId(data["account_id"]),
    }

    try:
        async with await db.client.start_session() as s:
            async with s.start_transaction():
                
                amount = txn['amount'].to_decimal()

                await db["transactions"].insert_one(txn, session=s)
                await _dec_balance(db, txn["from_account_id"], amount, session=s)
                
                result = await db["transactions"].find_one_and_update(
                    {"_id": txn["_id"]},
                    {"$set": {"status": "posted", "posted_at": datetime.utcnow()}},
                    session=s,
                    return_document=ReturnDocument.AFTER,
                )

    except Exception as e:
        await db["transactions"].update_one(
            {"_id": txn["_id"]},
            {"$set": {"status": "failed", "reason": str(e)}},
        )

        logger.error("Transaction failed: %s", e)
        raise

    
    if result:
        return result
    else:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

async def payment_service(payload: TransactionRequest, db):

    now = datetime.utcnow()

    data = payload.model_dump()
    txn = {
        **{k: v for k, v in data.items() if k != "account_id"},
        "status": "pending",
        "created_at": now,
        "run_at": data['run_at'] if data['run_at'] else now,
        "amount": to_decimal128(data["amount"]),
        "from_account_id": ObjectId(data["account_id"]),
    }

    result = await db["transactions"].insert_one(txn)
    
    if result.inserted_id:
        return txn
    else:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

async def transfer_service(payload: TransactionRequest, user_id, db):

    now = datetime.utcnow()

    data = payload.model_dump()
    txn = {
        **{k: v for k, v in data.items() if (k not in ["from_account_id", "to_account_id"])},
        "status": "pending",
        "created_at": now,
        "run_at": data['run_at'] if data['run_at'] else now,
        "amount": to_decimal128(data["amount"]),
        "from_account_id": ObjectId(data["from_account_id"]),
        "to_account_id": ObjectId(data["to_account_id"]),
        "customer_id": user_id
    }

    if txn['from_account_id'] == txn['to_account_id']:
        raise HTTPException(status_code=400, detail="Source and destination must differ")

    result = await db["transactions"].insert_one(txn)
    
    if result.inserted_id:
        return txn
    else:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


def _parse_dt(s: Optional[str], *, end_of_day: bool = False) -> Optional[datetime]:
    if not s:
        return None
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid datetime: {s}")
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    if end_of_day and dt.time() == datetime.min.time():
        dt = dt + timedelta(days=1) - timedelta(microseconds=1)
    return dt

async def build_filter(db, q) -> dict:
    # Short-circuit: a transaction_id lookup doesn't need any of the range logic below.
    if getattr(q, "transaction_id", None):
        try:
            return {"_id": ObjectId(q.transaction_id.strip())}
        except Exception:
            raise HTTPException(400, "Invalid transaction_id")

    filt: dict = {}

    acct_ids: list[ObjectId] = []
    queried_account_id = getattr(q, "account_id", None)

    if queried_account_id:
        try:
            acct_ids.append(ObjectId(q.account_id.strip()))
        except Exception:
            raise HTTPException(400, "Invalid account_id")

    if getattr(q, "customer_id", None):
        try:
            cust_oid = ObjectId(q.customer_id.strip())
        except Exception:
            raise HTTPException(400, "Invalid customer_id")

        if not queried_account_id:
            # No specific account requested — expand to every account this customer owns
            # so the query covers both sides of any transfers they made.
            owned = await db["accounts"].find(
                {"customer_id": cust_oid}, {"_id": 1}
            ).to_list(length=None)
            acct_ids.extend(doc["_id"] for doc in owned)

    # Transactions record both sides of a transfer, so we match on either
    # from_account_id or to_account_id to capture the full picture.
    if acct_ids:
        filt["$or"] = [
            {"from_account_id": {"$in": acct_ids}},
            {"to_account_id": {"$in": acct_ids}},
        ]

    start = _parse_dt(q.start_date, end_of_day=False) if q.start_date else None
    end = _parse_dt(q.end_date, end_of_day=True) if q.end_date else None
    if start or end:
        created_at = {}
        if start:
            created_at["$gte"] = start
        if end:
            created_at["$lte"] = end
        filt["created_at"] = created_at

    if q.min_amount is not None or q.max_amount is not None:
        amt = {}
        if q.min_amount is not None:
            amt["$gte"] = float(q.min_amount)
        if q.max_amount is not None:
            amt["$lte"] = float(q.max_amount)
        filt["amount"] = amt

    if getattr(q, "status", None):
        filt["status"] = q.status

    if getattr(q, "type", None):
        filt["type"] = q.type

    return filt

async def list_transactions(db, q) -> Tuple[List[TransactionOut], int]:
    
    filt = await build_filter(db, q)

    sort_dir = ASCENDING if q.order == "asc" else DESCENDING

    cursor = (
        db["transactions"]
        .find(filt)
        .sort(q.sort or "created_at", sort_dir)
        .skip(q.skip or 0)
    )

    if q.limit and q.limit > 0:
        cursor = cursor.limit(q.limit)

    docs = await cursor.to_list(length=q.limit or 1000)  # avoid length=0 → empty
    total = await db["transactions"].count_documents(filt)

    items = [TransactionOut.from_mongo(d) for d in docs]
    return items, total


async def process_transactions(db):
    now = datetime.now(timezone.utc)

    # The lock prevents two scheduler ticks from processing the same batch
    # simultaneously (e.g. if a tick runs late and overlaps with the next one).
    got_lock = await try_acquire_lock(db)
    if not got_lock:
        return

    try:
        cursor = db['transactions'].find(
            {"status": "pending", "run_at": {"$lte": now}},
            sort=[("run_at", ASCENDING)],
            limit=BATCH_SIZE,
        )

        docs = await cursor.to_list(length=BATCH_SIZE)

        if not docs:
            return

        for doc in docs:
            try:
                async with await db.client.start_session() as s:
                    async with s.start_transaction():
                        
                        amount = doc['amount'].to_decimal()

                        if doc['type'] in ['deposit', 'transfer', 'external', 'internal']:
                            await _inc_balance(db, doc["to_account_id"], amount, session=s)

                        if doc['type'] in ['withdraw', 'payment', 'transfer', 'external', 'internal']:
                            await _dec_balance(db, doc["from_account_id"], amount, session=s)

                        await db["transactions"].update_one(
                            {"_id": doc["_id"]},
                            {"$set": {"status": "posted", "posted_at": datetime.utcnow()}},
                            session=s,
                        )

            except Exception as e:
                await db["transactions"].update_one(
                    {"_id": doc["_id"]},
                    {"$set": {"status": "failed", "reason": str(e)}},
                )

                logger.error("Transaction processing failed: %s", e)
                raise

    finally:
        # Explicit release so the next tick can start immediately rather than
        # waiting for the TTL to expire. The TTL is a safety net, not the plan.
        await release_lock(db)
    
