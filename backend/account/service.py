import logging
from datetime import datetime

from fastapi import HTTPException, status
from bson import ObjectId
from database.mongo_decimal import to_decimal128
from pymongo import ReturnDocument


from .schemas import *
from shared.exceptions import CustomerNotFoundError

logger = logging.getLogger(__name__)

# CREATE

async def create_account_service(payload: AccountCreate, db, *, session=None):
    customer = await db["customers"].find_one({"_id": ObjectId(str(payload.customer_id))}, session=session)
    
    if not customer:
        raise CustomerNotFoundError("Customer id does not exist in database.") 
    
    doc = payload.model_dump()
    doc['_id'] = ObjectId()
    # MongoDB doesn't have a native decimal type that survives float precision loss.
    # We store balances as BSON Decimal128 to avoid the rounding errors that come
    # with IEEE 754 floats — critical when the value represents actual money.
    doc['balance'] = to_decimal128(doc.pop('opening_balance'))
    doc['status'] = AccountStatus.active.value
    doc['created_at'] = datetime.utcnow()
    doc['customer_id'] = ObjectId(doc.pop('customer_id'))

    try:
        await db["accounts"].insert_one(doc, session=session)
    except Exception:
        raise
    
    return AccountInDB(**doc)

# RETRIEVE

async def get_account_list_service(db):
    """Returns every account in the system. Only called by manager-level reporting —
    not exposed through any customer-facing route."""

    cursor = db["accounts"].find()

    return [AccountInDB(**doc) async for doc in cursor]

async def get_account_list_by_customer_service(customer_id: str, db):
    """Returns all non-closed accounts for a customer.

    Closed accounts are intentionally excluded — they're kept for audit history
    but shouldn't appear in an active banking context. We iterate defensively and
    skip any documents that fail validation rather than surfacing a 500 to the user
    because of a single malformed record.
    """
    try:
        customer_oid = ObjectId(customer_id)
    except Exception:
        raise HTTPException(400, f"Invalid customer id: {customer_id}")

    cursor = db["accounts"].find({
        "customer_id": customer_oid,
        "status": { "$ne": "closed" }
    })

    accounts = []
    async for doc in cursor:
        try:
            accounts.append(AccountInDB(**doc))
        except Exception as e:
            logger.error("Error processing account document: %s", e)
            continue

    return accounts

# get_account_list_by_phone_service
async def get_account_list_by_phone_service(phone: str, db):
    """Looks up all accounts associated with a phone number.

    Used exclusively by the manager portal (the route requires manager scope).
    The phone number is a stable external identifier that managers can use to
    locate a customer when they only have a phone number to go on.
    """
    doc = await db["customers"].find_one({"phone": phone}, projection={"_id": 1})

    if not doc: return []

    customer_id = ObjectId(doc["_id"])
    cursor = db["accounts"].find({"customer_id": customer_id, "status": 'active'})

    return [AccountInDB(**d) async for d in cursor]

async def get_account_service(account_id: str, db):
    """Fetches a single account by ID. The calling controller is responsible for
    verifying that the requesting user actually owns this account."""

    doc = await db["accounts"].find_one({"_id": ObjectId(account_id)})
    
    if not doc:
        raise HTTPException(404, "Account not found")
    
    return AccountInDB(**doc)

# UPDATE

async def update_account_service(account_id: str, patch: AccountUpdate, db):
    """Applies a partial update to an account. Only manager-scoped routes call this —
    customers cannot directly modify their own account fields."""

    updates = {k: v for k, v in patch.model_dump(exclude_unset=True).items()}
    
    if not updates:
        current = await db["accounts"].find_one({"_id": ObjectId(account_id)})
        if not current:
            raise HTTPException(404, "Account not found")
        return AccountInDB(**current)

    # Convert balance to Decimal128 if present
    if "balance" in updates:
        try:
            updates["balance"] = to_decimal128(updates["balance"])
        except Exception:
            raise HTTPException(422, detail="balance must be a number")

    new_doc = await db['accounts'].find_one_and_update(
        {'_id': ObjectId(account_id)},
        {'$set': updates},
        return_document = ReturnDocument.AFTER
    )

    if not new_doc:
        raise HTTPException(404, 'Account not found')

    return AccountInDB(**new_doc)
