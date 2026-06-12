from bson import ObjectId
from fastapi import HTTPException
from typing import Dict, Any, Optional
from shared.exceptions import DuplicateEmailError, DuplicatePhoneError


def project_public(doc: Dict[str, Any]) -> Dict[str, Any]:
    doc["_id"] = str(doc["_id"])
    doc.pop("password", None)
    return doc

async def ensure_unique_email(db, new_email: str, current_id: Optional[ObjectId] = None):
    query = {"email": new_email}

    if current_id is not None:
        query["_id"] = {"$ne": current_id}

    exists = await db["customers"].find_one(query, projection={"_id": 1})
    
    if not exists:
        exists = await db["managers"].find_one(query, projection={"_id": 1})

    if exists:
        raise DuplicateEmailError("Email already registered")

async def ensure_unique_phone(db, new_phone: str, current_id: Optional[ObjectId] = None):
    # Allow empty phone numbers (e.g. during Google signup)
    if not new_phone:
        return

    # 555-XXXX numbers are reserved test numbers — skip uniqueness enforcement so
    # test accounts can share them without hitting duplicate-phone errors.
    if new_phone and (new_phone.startswith("555-") or new_phone.startswith("(555)") or
                      new_phone.replace("-", "").replace("(", "").replace(")", "").replace(" ", "").startswith("555")):
        return
    
    query = {"phone": new_phone}

    if current_id is not None:
        query["_id"] = {"$ne": current_id}

    exists = await db["customers"].find_one(query, projection={"_id": 1})
    
    if not exists:
        exists = await db["managers"].find_one(query, projection={"_id": 1})

    if exists:
        raise DuplicatePhoneError("Phone already registered")