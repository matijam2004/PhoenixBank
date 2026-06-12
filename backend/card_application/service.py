from datetime import datetime
from bson import ObjectId
from fastapi import HTTPException

from .schemas import CardApplicationCreate, CardApplicationInDB, CardApplicationStatus


async def create_application_service(customer_id: str, payload: CardApplicationCreate, db):
    doc = payload.model_dump()
    doc["_id"]         = ObjectId()
    doc["customer_id"] = ObjectId(customer_id)
    doc["status"]      = CardApplicationStatus.pending.value
    doc["created_at"]  = datetime.utcnow()
    await db["card_applications"].insert_one(doc)
    return CardApplicationInDB(**doc)


async def get_my_applications_service(customer_id: str, db):
    cursor = db["card_applications"].find({"customer_id": ObjectId(customer_id)})
    return [CardApplicationInDB(**d) async for d in cursor]


async def get_application_by_id_service(app_id: str, db):
    try:
        oid = ObjectId(app_id)
    except Exception:
        raise HTTPException(400, "Invalid application ID")
    doc = await db["card_applications"].find_one({"_id": oid})
    if not doc:
        raise HTTPException(404, "Application not found")
    return CardApplicationInDB(**doc)


async def get_all_applications_service(db, status: str = None):
    query = {}
    if status:
        query["status"] = status
    cursor = db["card_applications"].find(query).sort("created_at", -1)
    return [CardApplicationInDB(**d) async for d in cursor]


async def approve_application_service(app_id: str, manager_id: str, db):
    doc = await db["card_applications"].find_one({"_id": ObjectId(app_id)})
    if not doc:
        raise HTTPException(404, "Application not found")
    if doc["status"] != CardApplicationStatus.pending.value:
        raise HTTPException(400, "Only pending applications can be approved")

    updated = await db["card_applications"].find_one_and_update(
        {"_id": ObjectId(app_id)},
        {"$set": {
            "status":      CardApplicationStatus.approved.value,
            "reviewed_at": datetime.utcnow(),
            "reviewed_by": manager_id,
        }},
        return_document=True,
    )
    return CardApplicationInDB(**updated)


async def reject_application_service(app_id: str, manager_id: str, reason: str, db):
    doc = await db["card_applications"].find_one({"_id": ObjectId(app_id)})
    if not doc:
        raise HTTPException(404, "Application not found")
    if doc["status"] != CardApplicationStatus.pending.value:
        raise HTTPException(400, "Only pending applications can be rejected")

    updated = await db["card_applications"].find_one_and_update(
        {"_id": ObjectId(app_id)},
        {"$set": {
            "status":           CardApplicationStatus.rejected.value,
            "reviewed_at":      datetime.utcnow(),
            "reviewed_by":      manager_id,
            "rejection_reason": reason,
        }},
        return_document=True,
    )
    return CardApplicationInDB(**updated)
