import logging
from bson import ObjectId
from fastapi import HTTPException
from datetime import datetime
from pymongo import ReturnDocument
from database.mongo_decimal import to_decimal128

logger = logging.getLogger(__name__)
import uuid

from .schemas import *

from transaction.service import create_transaction_service
from transaction.schemas import TA_TransactionRequest

async def get_my_checks_service(customer_id: str, db):
    cursor = db['checks'].find({'customer_id': ObjectId(customer_id)})
    return [CheckInDB(**doc) async for doc in cursor]

async def get_checks_service(db):
    cursor = db['checks'].find()
    return [CheckInDB(**doc) async for doc in cursor]

async def update_check_service(check_id: str, patch: CheckUpdate, db):
    doc_id = ObjectId(check_id)
    updates = {k:v for k, v in patch.model_dump(exclude_unset=True).items()}

    if not updates:
        current = await db['checks'].find_one({'_id': doc_id})
        if not current:
            raise HTTPException(404, "Check not found")
        return CheckInDB(**current)

    updates['updated_at'] = datetime.utcnow()

    if updates.get('amount'):
        updates["amount"] = to_decimal128(updates["amount"])

    try:
        async with await db.client.start_session() as s:
            async with s.start_transaction():
                
                new_doc = await db['checks'].find_one_and_update(
                    {'_id': doc_id},
                    {'$set': updates},
                    return_document = ReturnDocument.AFTER,
                    session = s,
                )

                if (updates.get("status", "denied") == "approved"):
                    new_uuid = str(uuid.uuid4())

                    resp = await create_transaction_service(
                        TA_TransactionRequest.validate_python({   
                            "amount": new_doc["amount"].to_decimal(),
                            "description": "Check Deposit",
                            "type": "check",
                            "account_id": new_doc["account_id"],
                        }),
                        new_uuid,
                        new_doc['customer_id'], 
                        db,
                    )
    except Exception as e:
        logger.error("Check processing failed: %s", e)
        raise

    if not new_doc:
        raise HTTPException(404, 'Check not found. Update failed.')

    return CheckInDB(**new_doc)