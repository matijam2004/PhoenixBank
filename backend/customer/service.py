import logging
from typing import List
from bson import ObjectId
from fastapi import HTTPException
from datetime import datetime
from pymongo import ReturnDocument

from shared.users import project_public, ensure_unique_email, ensure_unique_phone
from .schemas import *

logger = logging.getLogger(__name__)

async def create_customer_service(payload: CustomerCreate, db, *, session=None):    
    
    doc = payload.model_dump()
    doc["_id"] = ObjectId()
    doc["created_at"] = datetime.utcnow()
    doc["email"] = doc["email"].strip().lower()

    await ensure_unique_email(db, doc["email"])
    await ensure_unique_phone(db, doc['phone'])


    try:
        await db["customers"].insert_one(doc, session=session)
    except Exception:
        raise

    doc["_id"] = str(doc.pop("_id"))
    return CustomerInDB(**doc)

async def get_customer_service(customer_id: str, db) -> CustomerDetails:
    doc = await db["customers"].find_one(
        {"_id": ObjectId(customer_id)},
        projection={"password": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Customer not found")

    doc["_id"] = str(doc.pop("_id"))
    return CustomerDetails(**doc)

async def update_customer_service(customer_id: str, patch: CustomerUpdate, db) -> CustomerDetails:
    """
    Customer updates their own profile (by JWT sub).
    """

    try:
        customer_id = ObjectId(customer_id)
    except Exception:
        raise HTTPException(400, "Invalid customer id")

    updates = {k: v for k, v in patch.model_dump(exclude_unset=True).items()}
    if not updates:
        # nothing to change; return current doc
        current = await db["customers"].find_one({"_id": customer_id}, projection={"password": 0})
        if not current:
            raise HTTPException(404, "Customer not found")
        return CustomerDetails(**project_public(current))

    if "email" in updates:
        await ensure_unique_email(db, updates['email'], customer_id)

    updates["updated_at"] = datetime.utcnow()

    new_doc = await db["customers"].find_one_and_update(
        {"_id": customer_id},
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
        projection={"password": 0},
    )
    if not new_doc:
        raise HTTPException(404, "Customer not found")

    return CustomerDetails(**project_public(new_doc))

async def update_customer_by_id_service(customer_id: str, patch: CustomerUpdate, db) -> CustomerDetails:
    """
    Manager updates a customer profile by id.
    """
    try:
        customer_id = ObjectId(customer_id)
    except Exception:
        raise HTTPException(400, "Invalid customer id")
    
    updates = {k: v for k, v in patch.model_dump(exclude_unset=True).items()}
    if not updates:
        # nothing to change; return current doc
        current = await db["customers"].find_one({"_id": customer_id}, projection={"password": 0})
        if not current:
            raise HTTPException(404, "Customer not found")
        return CustomerDetails(**project_public(current))

    if "email" in updates:
        await ensure_unique_email(db, updates['email'], customer_id)

    updates["updated_at"] = datetime.utcnow()

    new_doc = await db["customers"].find_one_and_update(
        {"_id": customer_id},
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
        projection={"password": 0},
    )
    if not new_doc:
        raise HTTPException(404, "Customer not found")

    return CustomerDetails(**project_public(new_doc))

async def list_customers_service(db) -> List[CustomerDetails]:
    """
    List all customers (for managers).
    """
    cursor = db["customers"].find({}, projection={"password": 0})
    customers = []
    async for doc in cursor:
        doc["_id"] = str(doc.pop("_id"))
        customers.append(CustomerDetails(**project_public(doc)))
    return customers

# hard delete customer 