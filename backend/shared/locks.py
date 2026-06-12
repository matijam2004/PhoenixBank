from datetime import datetime, timezone, timedelta
from pymongo import ReturnDocument

BATCH_SIZE = 100
LOCK_NAME = ""
LOCK_LEASE_SECONDS = 90

async def try_acquire_lock(db) -> bool:
    """
    Acquires a short-lived distributed lock using an atomic upsert.

    Only succeeds when there is no existing lock document, or the existing one
    has expired — which means a previous holder crashed without releasing it.
    The TTL index on expiresAt handles eventual cleanup so stale locks don't
    accumulate if release_lock is never called.
    """
    now = datetime.now(timezone.utc)
    new_expiry = now + timedelta(seconds=LOCK_LEASE_SECONDS)

    doc = await db['locks'].find_one_and_update(
        {
            "name": LOCK_NAME,
            "$or": [{"expiresAt": {"$lte": now}}, {"expiresAt": {"$exists": False}}],
        },
        {"$set": {"name": LOCK_NAME, "expiresAt": new_expiry}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )

    return doc is not None and doc.get("expiresAt", now) > now


async def release_lock(db):
    # Best-effort early release. The TTL index will clean up the document
    # automatically if this is never called (e.g. after a crash).
    await db['locks'].delete_one({"name": LOCK_NAME})