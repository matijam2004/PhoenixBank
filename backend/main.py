from datetime import datetime, timezone
import os
from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from database.core import connect, close
from typing import Annotated

from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database.core import get_db
from scheduled_payment.service import process_scheduled_payments
from transaction.service import process_transactions

from auth.controller import router as auth_router
from account.controller import router as accounts_router
from transaction.controller import router as transactions_router
from customer.controller import router as customers_router
from manager.controller import router as manager_router
from check.controller import router as check_router
from reporting.controller import router as reporting_router
from scheduled_payment.controller import router as scheduled_payment_router
from notification.controller import router as notification_router
from card_application.controller import router as card_application_router

import logging

# Rate limiter shared across the application. Individual endpoints opt in
# with @limiter.limit("N/period") decorators — the limiter itself just
# provides the shared state and the 429 exception handler.
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Phoenix Banking API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
logger = logging.getLogger("uvicorn.error")

# In production the CORS_ORIGINS env var should be set to the real domain(s).
# The fallback list covers every localhost variant used during development so
# engineers don't need to configure anything to get a working local setup.
allowed_origins = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost",
    "http://127.0.0.1",
    "http://localhost:80",
    "http://127.0.0.1:80",
]
# Splitting on commas can produce empty strings if the env var has trailing
# commas or spaces — filter them out so the CORS middleware doesn't reject requests.
allowed_origins = [origin for origin in allowed_origins if origin]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def _startup():
    global scheduler
    
    await connect()

    db = get_db()

    scheduler = AsyncIOScheduler(timezone="UTC")
    
    scheduler.add_job(
        process_scheduled_payments, "interval", 
        seconds=300, coalesce=True, max_instances=1, args=[db]
    )
    
    scheduler.add_job(
        process_transactions, "interval", 
        seconds=300, coalesce=True, max_instances=1, args=[db]
    )

    scheduler.start()

    asyncio.create_task(process_scheduled_payments(db))
    asyncio.create_task(process_transactions(db))

@app.on_event("shutdown")
async def _shutdown():
    if scheduler:
        scheduler.shutdown(wait=False)
    
    await close()

@app.get("/")
async def root():
    return {
        "message": "Phoenix Banking API",
        "docs_url": "/docs",
        "health_url": "/api/health",
    }

@app.get("/api/health")
async def health():
    return {"status": "OK", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error: {exc.errors()}")
    logger.error(f"Body: {exc.body}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

app.include_router(auth_router,         prefix="/api")
app.include_router(accounts_router,     prefix="/api")
app.include_router(transactions_router, prefix="/api")
app.include_router(customers_router,    prefix="/api")
app.include_router(manager_router, prefix="/api")
app.include_router(check_router,       prefix="/api")
app.include_router(reporting_router,   prefix="/api")
app.include_router(scheduled_payment_router, prefix="/api")
app.include_router(notification_router, prefix="/api")
app.include_router(card_application_router, prefix="/api")
