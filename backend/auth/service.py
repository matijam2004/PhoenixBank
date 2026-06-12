from datetime import datetime, timedelta
import os
import secrets

from fastapi import HTTPException, status, Request, Depends
import bcrypt
from jwt import encode
from jose import jwt, JWTError
from bson import ObjectId
from pymongo.errors import ConfigurationError
from typing import Union

from .schemas import *
from customer.schemas import *
from manager.schemas import *
from account.schemas import *

from customer.service import create_customer_service
from manager.service import create_manager_service
from account.service import create_account_service

from shared.exceptions import *
from shared.email import send_password_reset_email, send_verification_email, send_welcome_email

import logging as _logging
_logger = _logging.getLogger(__name__)

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    import secrets as _secrets
    _logger.warning("JWT_SECRET env var not set — using a random secret. All sessions will be lost on restart.")
    JWT_SECRET = _secrets.token_hex(32)
JWT_ALG = os.getenv("JWT_ALG", "HS256")
COOKIE_HOURS = 12

def _hash_password(password: str) -> str:
    """Hash password with bcrypt."""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def _verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password with bcrypt."""
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except ValueError:
        # A ValueError here means the stored hash is malformed — either corrupted
        # or, in older data, accidentally stored as plain text. Treat it as a
        # failed match rather than crashing; the user will need to reset their password.
        return False

def _decode(token: str):
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])

def _get_token_from_request(request: Request) -> Union[str, None]:
    # Prefer the Authorization header so API clients and mobile apps work naturally.
    # Fall back to the HttpOnly cookie for browser sessions — the cookie path is set
    # to "/" so it travels with every request without any client-side JS involvement.
    auth = request.headers.get("Authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return request.cookies.get("access_token")

def _collection_for_scope(db, scope: str):
    """
    Resolves which MongoDB collection to hit based on the JWT scope.
    Centralising this avoids scattered string literals throughout the service layer.
    """

    if scope == "customer":
        return db["customers"]
    if scope == "manager":
        return db["managers"]
    raise HTTPException(400, "Unsupported scope")

def require_scope(*allowed_scopes: str):
    async def checker(user=Depends(get_current_user)):
        scope = user.get("scope")

        if scope not in allowed_scopes:
            raise HTTPException(status_code=403, detail=f"Forbidden: {scope} not authorized.")
        return user

    return checker

async def get_current_user(request: Request):
    token = _get_token_from_request(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = _decode(token)
    except JWTError as e:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload  # contains sub, scope, exp

async def register_customer_service(payload: CustomerCreate, db):
    try:
        async with await db.client.start_session() as s:
            async with s.start_transaction():
                payload.password = _hash_password(payload.password)

                customer = await create_customer_service(payload, db, session=s)

                new_checking_acc = AccountCreate(
                    customer_id=ObjectId(customer.id),
                    account_type=AccountType.checking.value,
                    opening_balance=Decimal('0.00')
                )
                new_savings_acc = AccountCreate(
                    customer_id=ObjectId(customer.id),
                    account_type=AccountType.savings.value,
                    opening_balance=Decimal('0.00')
                )

                await create_account_service(new_checking_acc, db, session=s)
                await create_account_service(new_savings_acc, db, session=s)

        # The email verification step intentionally runs outside the transaction.
        # If the SMTP call fails we still want the account and accounts to exist —
        # the user can request a new verification email rather than losing their signup.
        token = secrets.token_urlsafe(32)
        await db["email_verifications"].insert_one({
            "token": token,
            "user_id": str(customer.id),
            "email": payload.email,
            "created_at": datetime.utcnow(),
        })
        await send_verification_email(payload.email, token)

        return customer
    except Exception:
        raise

async def register_manager_service(payload: ManagerCreate, db):

    try:
        async with await db.client.start_session() as s:
            async with s.start_transaction():
                payload.password = _hash_password(payload.password)

                manager = await create_manager_service(payload, db, session=s)

                return manager
    except Exception:
        raise


async def verify_email_service(token: str, db) -> str:
    record = await db["email_verifications"].find_one({"token": token})
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link.")

    await db["customers"].update_one(
        {"_id": ObjectId(record["user_id"])},
        {"$set": {"email_verified": True}}
    )
    await db["email_verifications"].delete_one({"token": token})

    # After verifying the email we issue a full JWT so the redirect lands the user
    # directly on their dashboard without an extra login step. The token is embedded
    # in the URL fragment so it never hits server logs.
    payload = {
        "sub": record["user_id"],
        "scope": "customer",
        "exp": datetime.utcnow() + timedelta(hours=COOKIE_HOURS)
    }
    return encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def login_service(body: LoginRequest, db):
    """
    Universal login endpoint - automatically detects if user is customer or manager
    """
    email = body.email.strip().lower()
    
    user = await db["customers"].find_one({"email": email})
    user_type = "customer"

    if not user:
        user = await db["managers"].find_one({"email": email})
        user_type = "manager"

    if not user:
        raise HTTPException(404, "Missing: User not found")

    if not _verify_password(body.password, user["password"]):
        raise HTTPException(401, "Unauthorized: Invalid credentials")
    
    payload = {
        "sub": str(user["_id"]), 
        "scope": user_type, 
        "exp": datetime.utcnow() + timedelta(hours=COOKIE_HOURS)
    }

    token = encode(payload, JWT_SECRET, algorithm=JWT_ALG)
    return TokenResponse(access_token=token)

async def google_login_service(google_user_info: dict, db):
    """
    Handle Google OAuth login for existing users.
    Looks up user by email and returns JWT token if found.
    Raises error if user doesn't exist.
    """
    email = google_user_info.get("email", "").strip().lower()
    
    if not email:
        raise HTTPException(400, "Email not provided by Google")
    
    # Check if user already exists (customer or manager)
    user = await db["customers"].find_one({"email": email})
    user_type = "customer"
    
    if not user:
        user = await db["managers"].find_one({"email": email})
        user_type = "manager"
    
    # If user doesn't exist, raise error
    if not user:
        raise HTTPException(404, "User not found. Please sign up first.")
    
    # User exists - log them in
    payload = {
        "sub": str(user["_id"]),
        "scope": user_type,
        "exp": datetime.utcnow() + timedelta(hours=COOKIE_HOURS)
    }
    token = encode(payload, JWT_SECRET, algorithm=JWT_ALG)
    return TokenResponse(access_token=token)


async def google_register_service(google_user_info: dict, db):
    """
    Handle Google OAuth registration for new users.
    Creates customer account with Google profile information.
    Returns JWT token for immediate login.
    """
    import secrets
    
    email = google_user_info.get("email", "").strip().lower()
    
    if not email:
        raise HTTPException(400, "Email not provided by Google")
    
    # Check if user already exists
    existing_user = await db["customers"].find_one({"email": email})
    if existing_user:
        raise HTTPException(409, "User already exists. Please log in instead.")
    
    existing_manager = await db["managers"].find_one({"email": email})
    if existing_manager:
        raise HTTPException(409, "User already exists. Please log in instead.")
    
    # Extract name from Google user info
    given_name = google_user_info.get("given_name", "")
    family_name = google_user_info.get("family_name", "")
    
    # If name not split, try to split from full name
    if not given_name or not family_name:
        full_name = google_user_info.get("name", "").split(" ", 1)
        given_name = full_name[0] if len(full_name) > 0 else "User"
        family_name = full_name[1] if len(full_name) > 1 else ""
    
    # Generate a random password (user won't need it for Google login)
    random_password = secrets.token_urlsafe(32)
    
    # Skip pydantic validation — Google doesn't provide phone/address,
    # user is sent to complete-profile to fill them in.
    customer_payload = CustomerCreate.model_construct(
        first_name=given_name or "User",
        last_name=family_name or "",
        email=email,
        phone="",
        street="",
        city="",
        state="",
        zip="",
        password=random_password
    )
    
    try:
        # Register the customer (this will create account too)
        customer = await register_customer_service(customer_payload, db)

        # Send luxury welcome email (non-blocking)
        await send_welcome_email(email, given_name or "Valued Member")

        # Generate JWT for new user
        payload = {
            "sub": str(customer.id),
            "scope": "customer",
            "exp": datetime.utcnow() + timedelta(hours=COOKIE_HOURS)
        }
        token = encode(payload, JWT_SECRET, algorithm=JWT_ALG)
        return TokenResponse(access_token=token)

    except Exception as e:
        raise HTTPException(500, f"Failed to create user: {str(e)}")

# Password changing services

async def change_password_service(user: dict, body: ChangePasswordRequest, db):
    """
    Self-service: the logged-in user changes their password.
    - Verifies current password
    - Prevents reusing the same password
    - Updates password hash
    - Sets password_changed_at
    - Returns a fresh JWT
    """
    coll = _collection_for_scope(db, user["scope"])
    oid = ObjectId(user["sub"])

    doc = await coll.find_one({"_id": oid})
    if not doc:
        raise HTTPException(404, "User not found")

    if not _verify_password(body.current_password, doc["password"]):
        raise HTTPException(401, "Current password is incorrect")

    if _verify_password(body.new_password, doc["password"]):
        raise HTTPException(400, "New password must be different from the current password")

    new_hash = _hash_password(body.new_password)
    await coll.update_one(
        {"_id": oid},
        {"$set": {"password": new_hash, "updated_at": datetime.utcnow(), "password_changed_at": datetime.utcnow()}}
    )

    payload = {
        "sub": str(oid),
        "scope": user["scope"],
        "exp": datetime.utcnow() + timedelta(hours=COOKIE_HOURS),
    }

    token = encode(payload, JWT_SECRET, algorithm=JWT_ALG)
    return TokenResponse(access_token=token)

async def admin_reset_password_service(user: dict, target_user_id: str, body: ResetPasswordRequest, db):
    """
    Manager resets a customer's (or another manager's) password without knowing the current one.
    Adjust rules if managers should only reset customers.
    """
    if user.get("scope") != "manager":
        raise HTTPException(403, "Forbidden: managers only")

    try:
        target_oid = ObjectId(target_user_id)
    except Exception:
        raise HTTPException(400, "Invalid user id")

    coll = db["customers"]
    doc = await coll.find_one({"_id": target_oid})

    if not doc:
        # Prevent managers from resetting other managers' passwords
        manager_doc = await db["managers"].find_one({"_id": target_oid})
        if manager_doc:
            raise HTTPException(403, "Forbidden: cannot reset another manager's password")
        raise HTTPException(404, "User not found")

    new_hash = _hash_password(body.new_password)
    
    await coll.update_one(
        {"_id": target_oid},
        {"$set": {"password": new_hash, "updated_at": datetime.utcnow(), "password_changed_at": datetime.utcnow()}}
    )
    return {"message": "Password reset successfully"}


# Password Reset Flow Services

async def request_password_reset_service(email: str, db):
    """
    Step 1: User requests password reset by providing their email.
    
    This function:
    1. Finds the user by email (checks both customers and managers)
    2. Generates a secure, unique reset token
    3. Stores the token in the database with expiration (1 hour)
    4. Sends an email with the reset link
    
    Security Note: We always return success, even if email doesn't exist.
    This prevents email enumeration attacks (users can't check if an email is registered).
    
    Args:
        email: User's email address
        db: Database connection
        
    Returns:
        dict: Success message (always returns success for security)
    """
    email = email.strip().lower()
    
    if not email:
        return {"message": "If that email exists, a password reset link has been sent."}
    
    # Customers and managers share a login flow but live in separate collections,
    # so we try customers first (the common path) and fall back to managers.
    user = await db["customers"].find_one({"email": email})
    user_type = "customer"

    if not user:
        user = await db["managers"].find_one({"email": email})
        user_type = "manager"

    # Returning the same response whether or not the email exists prevents
    # attackers from using this endpoint to enumerate registered addresses.
    if not user:
        return {"message": "If that email exists, a password reset link has been sent."}

    # token_urlsafe(32) gives 256 bits of entropy — effectively unguessable even with
    # a large number of parallel attempts before the 1-hour TTL expires.
    reset_token = secrets.token_urlsafe(32)

    # MongoDB Atlas stores timezone-aware datetimes, so using utcnow() here would
    # cause silent comparison failures. Use timezone.utc consistently.
    from datetime import timezone
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    # The `used` flag lets us invalidate a token immediately after it's consumed,
    # preventing replay if an email is intercepted after the link is clicked.
    await db["password_resets"].insert_one({
        "user_id": str(user["_id"]),
        "user_type": user_type,
        "token": reset_token,
        "expires_at": expires_at,
        "used": False,
        "created_at": datetime.utcnow()
    })
    
    try:
        await send_password_reset_email(email, reset_token)
    except Exception as e:
        _logger.error("Failed to send password reset email: %s", e)
    
    return {"message": "If that email exists, a password reset link has been sent."}


async def verify_reset_token_service(token: str, db) -> dict:
    """
    Step 2: Verify that a reset token is valid and not expired.
    
    This is called when the user clicks the reset link in their email.
    The frontend will use this to verify the token before showing the reset form.
    
    Args:
        token: The reset token from the URL
        db: Database connection
        
    Returns:
        dict: Token verification status with user info if valid
        
    Raises:
        HTTPException: If token is invalid, expired, or already used
    """
    # Find the reset record
    reset_record = await db["password_resets"].find_one({
        "token": token,
        "used": False
    })
    
    if not reset_record:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token. Please request a new password reset."
        )
    
    # MongoDB Atlas returns timezone-aware datetimes. Comparing against a naive
    # datetime.utcnow() would raise a TypeError at runtime, so we always use
    # datetime.now(timezone.utc) when working with values from the database.
    from datetime import timezone
    expires_at = reset_record["expires_at"]
    now = datetime.now(timezone.utc)

    if expires_at < now:
        raise HTTPException(
            status_code=400,
            detail="Reset token has expired. Please request a new password reset."
        )
    
    return {
        "valid": True,
        "message": "Token is valid. You can now reset your password."
    }


async def reset_password_with_token_service(token: str, new_password: str, db):
    """
    Step 3: Reset the password using a valid token.
    
    This function:
    1. Verifies the token is valid and not expired
    2. Finds the user associated with the token
    3. Updates their password
    4. Marks the token as used (prevents reuse)
    5. Returns a new JWT token so user is automatically logged in
    
    Args:
        token: The reset token from the URL
        new_password: The new password to set
        db: Database connection
        
    Returns:
        TokenResponse: New JWT token for the user
        
    Raises:
        HTTPException: If token is invalid, expired, or already used
    """
    # Find the reset record
    reset_record = await db["password_resets"].find_one({
        "token": token,
        "used": False
    })
    
    if not reset_record:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token. Please request a new password reset."
        )
    
    # Same timezone-aware comparison as verify_reset_token_service — see note there.
    from datetime import timezone
    expires_at = reset_record["expires_at"]
    now = datetime.now(timezone.utc)

    if expires_at < now:
        raise HTTPException(
            status_code=400,
            detail="Reset token has expired. Please request a new password reset."
        )
    
    # Get user info from reset record
    user_id = reset_record["user_id"]
    user_type = reset_record["user_type"]
    
    # The reset record carries the user_type so we know which collection to update
    # without a second lookup across both tables.
    try:
        user_oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(400, "Invalid user ID in reset token")
    
    coll = _collection_for_scope(db, user_type)
    user = await coll.find_one({"_id": user_oid})
    
    if not user:
        raise HTTPException(404, "User not found")
    
    # Reject reuse of the current password — common compliance requirement and a small
    # but real barrier against account takeover via a compromised reset link.
    if _verify_password(new_password, user["password"]):
         raise HTTPException(
            status_code=400,
            detail="New password must be different from the current password."
        )
    
    # Hash the new password
    new_password_hash = _hash_password(new_password)
    
    # Update user's password
    # Use timezone-aware datetime to match MongoDB
    from datetime import timezone
    now_utc = datetime.now(timezone.utc)
    
    await coll.update_one(
        {"_id": user_oid},
        {
            "$set": {
                "password": new_password_hash,
                "updated_at": now_utc,
                "password_changed_at": now_utc
            }
        }
    )
    
    _logger.info("Password updated for %s user", user_type)
    
    # Invalidate the token immediately so a second use of the same link is rejected,
    # even if the email was intercepted after the legitimate reset completed.
    await db["password_resets"].update_one(
        {"token": token},
        {"$set": {"used": True, "used_at": datetime.utcnow()}}
    )
    
    # Issue a fresh JWT so the user lands on their dashboard without a separate
    # login step — same UX pattern used after email verification.
    payload = {
        "sub": str(user_oid),
        "scope": user_type,
        "exp": datetime.utcnow() + timedelta(hours=COOKIE_HOURS)
    }
    
    token = encode(payload, JWT_SECRET, algorithm=JWT_ALG)
    return TokenResponse(access_token=token)

    
