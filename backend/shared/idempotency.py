# Idempotency middleware for mutation endpoints (transfers, transactions).
#
# Every POST that modifies money must include an `Idempotency-Key` header.
# On the first request we store a "processing" record keyed by (user_id, key).
# On a retry with the same key we either replay the stored response (if already
# completed) or return 425 (if still in-flight). This prevents double-charges
# caused by network retries, browser back-button submits, or client crashes.
import json, hashlib, time
from fastapi import Request, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from typing import Optional, Any
from datetime import datetime

def canonical_json(data) -> str:
    return json.dumps(data, sort_keys=True, separators=(",", ":"))

def request_fingerprint(method: str, path: str, body: dict) -> str:
    h = hashlib.sha256()
    h.update(method.upper().encode())
    h.update(b" ")
    h.update(path.encode())
    h.update(b" ")
    h.update(canonical_json(body or {}).encode())
    return h.hexdigest()

class IdempotencyRecord(BaseModel):
    key: str
    user_id: str
    fingerprint: str
    status: str  # "processing" | "completed" | "failed"
    response_status: Optional[int] = None
    response_body: Optional[dict] = None
    created_at: datetime

async def ensure_idempotency(request: Request, db, user_id: str):
    key = request.headers.get("Idempotency-Key")
    if not key:
        raise HTTPException(400, "Missing Idempotency-Key")

    body = await request.json() if request.method != "GET" else {}
    fp = request_fingerprint(request.method, request.url.path, body)

    return await create_idempotency(key, user_id, fp, db)

async def create_idempotency(key: str, user_id: str, fp: str, db):
    # Try to insert a reservation doc
    rec = {
        "key": key,
        "user_id": ObjectId(user_id),
        "fingerprint": fp,
        "status": "processing",
        "created_at": datetime.utcnow(),

    }

    try:
        await db["idempotency"].insert_one(rec)
        return {"mode": "new", "key": key, "fingerprint": fp}
    except Exception:
        # The insert failed — most likely a duplicate key on (user_id, key).
        # Look up the existing record to determine how to respond.
        existing = await db["idempotency"].find_one({"key": key, "user_id": ObjectId(user_id)})
        if not existing:
            raise HTTPException(500, "Idempotency state error")

        # Same key, different payload means the client is misusing the key.
        # Reject hard — silently replaying a different request would be dangerous.
        if existing["fingerprint"] != fp:
            raise HTTPException(409, "Idempotency-Key reused with different request")

        if existing["status"] == "completed":
            return {
                "mode": "replay",
                "status": existing.get("response_status", 200),
                "body": existing.get("response_body", {}),
            }
        elif existing["status"] == "processing":
            # A concurrent request with the same key is still in-flight.
            # 425 (Too Early) signals the client to back off and retry.
            raise HTTPException(425, "Request is processing; try again")
        else:
            # The previous attempt failed cleanly — let the client retry.
            return {"mode": "retry", "key": key, "fingerprint": fp}


async def update_idempotency_record(
    db,
    key: str,
    user_id: str,
    *,
    status: Optional[str] = None,
    response_body: Optional[Any] = None,
    response_status: Optional[int] = None,
    extra_fields: Optional[dict] = None,
) -> None:
    """
    Generic helper to update an idempotency record in the database.

    Parameters
    ----------
    db : AsyncIOMotorDatabase
        Database handle.
    key : str
        Idempotency key (from request header).
    user_id : str
        ID of the user that owns the request.
    status : Optional[str]
        Status value to set (e.g., "processing", "completed", "failed").
    response_body : Optional[Any]
        Optional response body snapshot to persist for replay.
    response_status : Optional[int]
        HTTP status code to save with the response (e.g., 201, 200).
    extra_fields : Optional[dict]
        Any additional fields to set (e.g., timestamps, errors, metadata).
    """
    update_doc = {"$set": {"updated_at": datetime.utcnow()}}

    if status is not None:
        update_doc["$set"]["status"] = status
    if response_body is not None:
        update_doc["$set"]["response_body"] = response_body
    if response_status is not None:
        update_doc["$set"]["response_status"] = response_status
    if extra_fields:
        update_doc["$set"].update(extra_fields)

    result = await db["idempotency"].find_one_and_update(
        {"key": key, "user_id": ObjectId(user_id)},
        update_doc,
        return_document=True,
    )

    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Idempotency record not found for key {key!r}",
        )