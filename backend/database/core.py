import os
from pathlib import Path
from typing import Optional, List, Tuple, Any, Dict
from datetime import timezone

import certifi
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from dotenv import load_dotenv

_BASE_DIR = Path(__file__).resolve().parents[1]
_ENV_PATH = _BASE_DIR / ".env"
if _ENV_PATH.exists():
    load_dotenv(_ENV_PATH, override=True)
else:
    load_dotenv()

_DB_NAME = os.getenv("DB_NAME", "phoenix")

_client: Optional[AsyncIOMotorClient] = None


async def _ensure_index(
    coll,
    keys: List[Tuple[str, int]],
    **opts: Any,
) -> str:
    existing: Dict[str, Dict[str, Any]] = await coll.index_information()  
    for name, spec in existing.items():
        if spec.get("key") == keys:
            return name

    return await coll.create_index(keys, **opts)


async def connect() -> None:
    """Create the global Mongo client and ensure useful indexes."""
    global _client
    if _client is not None:
        return
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        raise RuntimeError(
            "MONGO_URI environment variable is not set. "
            "Ensure backend/.env exists or configure the variable before starting the server."
        )


    # Atlas connections use the mongodb+srv:// scheme and require TLS.
    # Local MongoDB instances typically don't — injecting the CA file there
    # causes a handshake failure, so we only add it when the URI demands it.
    client_kwargs = {
        "tz_aware": True,
        "tzinfo": timezone.utc,
    }

    if mongo_uri.startswith("mongodb+srv://"):
        client_kwargs["tlsCAFile"] = certifi.where()
    
    _client = AsyncIOMotorClient(mongo_uri, **client_kwargs)
    db = get_db()

    await _ensure_index(db["customers"], [("email", 1)], unique=True)
    # Google OAuth signups don't provide a phone number, so the field can be empty.
    # A standard unique index would treat every empty string as a duplicate, so we
    # use a partial filter that only enforces uniqueness for non-empty values.
    await _ensure_index(
        db["customers"], 
        [("phone", 1)], 
        unique=True, 
        partialFilterExpression={"phone": {"$type": "string", "$gt": ""}}
    )
    
    await _ensure_index(db["managers"], [("email", 1)], unique=True)
    await _ensure_index(
        db["managers"], 
        [("phone", 1)], 
        unique=True,
        partialFilterExpression={"phone": {"$type": "string", "$gt": ""}}
    )

    await _ensure_index(db["accounts"], [("customer_id", 1)])

    await _ensure_index(db["transactions"], [("account_id", 1)])
    await _ensure_index(db["transactions"], [("created_at", 1)])
    await _ensure_index(db["transactions"], [("transaction_id", 1)])
    await _ensure_index(db["transactions"], [("account_id", 1), ("created_at", 1)])

    await _ensure_index(db["idempotency"], [("user_id", 1), ("key", 1)], unique=True)
    await _ensure_index(db["idempotency"], [("created_at", 1)], expireAfterSeconds=1*24*3600)
    
    await _ensure_index(db["scheduled_payments"], [("next_run", 1)])
    await _ensure_index(db["scheduled_payments"], [("customer_id", 1)])

    await _ensure_index(db["email_verifications"], [("token", 1)], unique=True)
    await _ensure_index(db["email_verifications"], [("created_at", 1)], expireAfterSeconds=24*3600)

    await _ensure_index(db["oauth_states"], [("token", 1)], unique=True)
    await _ensure_index(db["oauth_states"], [("created_at", 1)], expireAfterSeconds=600)

def get_db() -> AsyncIOMotorDatabase:
    if _client is None:
        raise RuntimeError("Mongo client not initialized. Did you call connect() on startup?")
    return _client[_DB_NAME]


async def close() -> None:
    global _client
    if _client:
        _client.close()
        _client = None
