import asyncio
from decimal import Decimal

async def charge_with_merchant(payment_id: str, amount: Decimal, idempotency_key: str):
    # Stub — replace with a real Stripe/Adyen call, forwarding idempotency_key.
    await asyncio.sleep(0.01)
    return {"status": "succeeded", "psp_charge_id": f"ch_{payment_id}"}
