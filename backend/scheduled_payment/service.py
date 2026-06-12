import logging
from bson import ObjectId
from fastapi import HTTPException
from datetime import datetime, date, time, timedelta, timezone
from dateutil.relativedelta import relativedelta
from pymongo import ReturnDocument, ASCENDING

logger = logging.getLogger(__name__)

# charge_with_merchant is stubbed — wiring in a real PSP (Stripe, Adyen) here
# would replace the internal transaction creation with an external charge call.
from transaction.service import create_transaction_service
from transaction.schemas import TA_TransactionRequest
from database.mongo_decimal import to_decimal128
from .schemas import *
from shared.locks import try_acquire_lock, release_lock

import uuid

BATCH_SIZE = 100
LOCK_NAME = "process_due_payments"
LOCK_LEASE_SECONDS = 90

def _ensure_datetime(dt):
    if isinstance(dt, datetime):
        return dt
    if isinstance(dt, date):
        return datetime.combine(dt, time(0, 0, 0, tzinfo=timezone.utc))

    raise TypeError(f"run_date must be date/datetime, got {type(dt)}")


def compute_next_run(frequency, run_date):
    """
    Returns the next scheduled run datetime given a frequency and a base date.

    For one-time payments the run_date is returned as-is — the caller decides
    whether to cancel or keep a past-due one-time payment.

    For repeating frequencies we advance by one period from the base date until
    the result is in the future. This handles the case where the scheduler was
    offline for multiple periods — rather than firing missed runs, we jump ahead
    to the next future slot.
    """
    run_date = _ensure_datetime(run_date)
    now = datetime.now(timezone.utc)

    frequency = frequency.lower()

    if frequency == "once":
        return run_date

    # One step forward per frequency unit — used in the catch-up loop below.
    def step(date):
        if frequency == "daily":
            return date + timedelta(days=1)
        if frequency == "weekly":
            return date + timedelta(weeks=1)
        if frequency == "biweekly":
            return date + timedelta(weeks=2)
        if frequency == "monthly":
            return date + relativedelta(months=1)
        if frequency == "yearly":
            return date + relativedelta(years=1)
        raise ValueError(f"Unsupported frequency: {frequency}")

    if run_date > now:
        return run_date

    # The base date is in the past — advance one period so the payment fires
    # at the correct future time rather than immediately.
    next_run = step(run_date)

    return next_run

async def create_scheduled_payment_service(payload: ScheduledPaymentCreate, db):
    doc = payload.model_dump()
    doc['_id'] = ObjectId()
    doc['status'] = ScheduledPaymentStatus.active.value
    doc['created_at'] = datetime.utcnow()
    doc['next_run'] = compute_next_run(doc['frequency'], doc['date'])
    doc['amount'] = to_decimal128(doc.pop('amount'))
    doc['customer_id'] = ObjectId(doc.pop('customer_id'))
    doc['account_id'] = ObjectId(doc.pop('account_id'))
    doc['processing'] = False

    try:
        await db['scheduled_payments'].insert_one(doc)
    except Exception:
        raise

    return ScheduledPaymentInDB(**doc)

async def get_scheduled_payment_list_by_customer_service(customer_id: str, db):
    cursor = db['scheduled_payments'].find({"customer_id": ObjectId(customer_id)})
    
    return [ScheduledPaymentInDB(**doc) async for doc in cursor]

async def get_scheduled_payment_service(scheduled_payment_id: str, db):
    doc = await db['scheduled_payments'].find_one({'_id': ObjectId(scheduled_payment_id)})

    if not doc:
        raise HTTPException(404, 'Scheduled Payment not found')

    return ScheduledPaymentInDB(**doc)

async def update_scheduled_payment_service(scheduled_payment_id: str, patch: ScheduledPaymentUpdate, db):
    try:
        oid = ObjectId(scheduled_payment_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid scheduled_payment_id")

    updates = {k: v for k, v in patch.model_dump(exclude_unset=True).items()}
    if not updates:
        current = await db["scheduled_payments"].find_one({"_id": ObjectId(scheduled_payment_id)})
        if not current:
            raise HTTPException(404, "Scheduled Payment not found")
        return ScheduledPaymentInDB(**current)
    

    updates["updated_at"] = datetime.utcnow()

    if updates.get('date'):
        doc = await db["scheduled_payments"].find_one(
            {"_id": ObjectId(scheduled_payment_id)},
            projection={"frequency": 1, "_id": 0})
        updates['next_run'] = compute_next_run(doc['frequency'], updates['date'])

    if updates.get('amount'):
        updates["amount"] = to_decimal128(updates["amount"])

    new_doc = await db["scheduled_payments"].find_one_and_update(
        {"_id": ObjectId(scheduled_payment_id)},
        {"$set": updates},
        return_document=ReturnDocument.AFTER
    )
    
    if not new_doc:
        raise HTTPException(404, "Scheduled Payment not found")


    return ScheduledPaymentInDB(**new_doc)

async def delete_scheduled_payment_service(scheduled_payment_id: str, db):
    result = await db.scheduled_payments.delete_one({"_id": ObjectId(scheduled_payment_id)})

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Missing: Scheduled payment not found"
        )

    return None


async def process_scheduled_payments(db):
    now = datetime.now(timezone.utc)

    # Same distributed lock pattern as process_transactions — prevents overlapping
    # scheduler ticks from double-firing the same due payments.
    got_lock = await try_acquire_lock(db)
    if not got_lock:
        return

    try:
        cursor = db['scheduled_payments'].find(
            {"status": "active", "next_run": {"$lte": now}},
            sort=[("next_run", ASCENDING)],
            limit=BATCH_SIZE,
        )

        docs = await cursor.to_list(length=BATCH_SIZE)

        if not docs:
            return

        for doc in docs:
            try:
                new_uuid = str(uuid.uuid4())

                resp = await create_transaction_service(
                    TA_TransactionRequest.validate_python({   
                        "amount": doc["amount"].to_decimal(),
                        "description": doc["label"],
                        "type": "payment",
                        "account_id": doc["account_id"],
                    }),
                    new_uuid,
                    doc['customer_id'], 
                    db,
                )

                if resp:
                    next_run = compute_next_run(doc['frequency'], doc['date']) if doc['frequency'] != 'once' else None

                    await db['scheduled_payments'].update_one(
                        {"_id": doc["_id"]},
                        {
                            "$set": {
                                "last_run": datetime.now(timezone.utc),
                                "next_run": next_run,
                                "date": next_run,
                                "processing": False,
                                "last_error": 'no error',
                                "retry_count": 0,
                            }
                        }
                    )
            except Exception as e:
                await db['scheduled_payments'].update_one(
                    {"_id": doc["_id"]},
                    {
                        "$set": {
                            "last_error": str(e),
                            "processing": False,
                        },
                        "$inc": {"retry_count": 1},
                    },
                )

                logger.error("Scheduled payment failed: %s", e)
                raise

    finally:
        # Release eagerly so the next tick doesn't have to wait for the TTL lease.
        await release_lock(db)
    
