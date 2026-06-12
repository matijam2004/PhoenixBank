from bson import ObjectId
from fastapi import HTTPException
from datetime import datetime
from pymongo import ReturnDocument

from shared.users import project_public, ensure_unique_email, ensure_unique_phone
from .schemas import *

async def create_manager_service(payload: ManagerCreate, db, *, session=None):    
    
    doc = payload.model_dump()
    doc["_id"] = ObjectId()
    doc["created_at"] = datetime.utcnow()
    doc["email"] = doc["email"].strip().lower()

    await ensure_unique_email(db, doc['email'])
    await ensure_unique_phone(db, doc['phone'])

    try:
        await db["managers"].insert_one(doc, session=session)
    except Exception:
        raise

    doc["_id"] = str(doc.pop("_id"))
    return ManagerDetails(**doc)

async def get_manager_service(manager_id: str, db) -> ManagerDetails:
    doc = await db["managers"].find_one(
        {"_id": ObjectId(manager_id)},
        projection={"password": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Manager not found")

    doc["_id"] = str(doc.pop("_id"))
    return ManagerDetails(**doc)

async def update_manager_service(manager_id: str, patch: ManagerUpdate, db) -> ManagerDetails:
    try:
        manager_id = ObjectId(manager_id)
    except Exception:
        raise HTTPException(400, "Invalid manager id")
    
    updates = {k: v for k, v in patch.model_dump(exclude_unset=True).items()}
    if not updates:
        current = await db["managers"].find_one({"_id": manager_id}, projection={"password": 0})
        if not current:
            raise HTTPException(404, "Manager not found")
        return ManagerDetails(current)

    if "email" in updates:
        await ensure_unique_email(db, updates['email'], manager_id)

    updates["updated_at"] = datetime.utcnow()

    new_doc = await db["managers"].find_one_and_update(
        {"_id": manager_id},
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
        projection={"password": 0},
    )
    if not new_doc:
        raise HTTPException(404, "Manager not found")

    return ManagerDetails(**new_doc)    