import os
import secrets
import logging
import traceback
import urllib.parse
from datetime import datetime, timedelta

from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)

# OAuth CSRF state is stored in MongoDB so it survives server restarts.
# Render's free tier spins down after inactivity — an in-memory dict would
# lose all pending states on restart, causing every Google login to fail.
# The oauth_states collection has a TTL index that expires documents after
# 10 minutes, so stale tokens clean themselves up automatically.

async def _create_oauth_state(flow: str, db) -> str:
    token = secrets.token_urlsafe(32)
    await db["oauth_states"].insert_one({
        "token": token,
        "flow": flow,
        "created_at": datetime.utcnow(),
    })
    return token

async def _consume_oauth_state(state: str, db) -> str:
    doc = await db["oauth_states"].find_one_and_delete({"token": state})
    if doc is None:
        raise HTTPException(status_code=400, detail="Invalid OAuth state — possible CSRF attack")
    return doc["flow"]

from fastapi import APIRouter, Depends, Response, HTTPException, status
from fastapi.responses import RedirectResponse
import httpx
from jose import jwt
from bson import ObjectId

from database.core import get_db

from .service import *
from .schemas import LoginRequest, TokenResponse, ForgotPasswordRequest, ResetPasswordWithTokenRequest
from customer.schemas import *
from manager.schemas import *

from customer.service import get_customer_service
from manager.service import get_manager_service
from shared.exceptions import DuplicateEmailError, DuplicatePhoneError

router = APIRouter(
    prefix="/auth", 
    tags=["auth"]
)
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")

# JWT constants
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    import secrets as _secrets
    JWT_SECRET = _secrets.token_hex(32)
JWT_ALG = os.getenv("JWT_ALG", "HS256")

COOKIE_NAME = "access_token"
COOKIE_HOURS = 12
COOKIE_MAX_AGE = COOKIE_HOURS * 60 * 60
# The Secure flag must be False during local HTTP development — browsers won't send
# the cookie to localhost over plain HTTP if it's set to True. Flip SECURE_COOKIES=true
# in the environment when the app sits behind an HTTPS terminator (nginx, load balancer).
SECURE = os.getenv("SECURE_COOKIES", "false").lower() == "true"

def _get_frontend_url() -> str:
    return os.getenv("FRONTEND_URL", "http://localhost:5173")

def _get_redirect_path(flow: str) -> str:
    """Get redirect path based on flow type"""
    return "/login" if flow == "login" else "/signup"

def _set_auth_cookie(response: Response, token: str):
    """Set authentication cookie"""
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=SECURE,
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        path="/",
    )

def _build_google_oauth_url(state: str) -> str:
    """Build Google OAuth URL with state parameter"""
    redirect_uri = urllib.parse.quote(GOOGLE_REDIRECT_URI, safe='')
    encoded_state = urllib.parse.quote(state, safe='')
    return (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
        f"&access_type=offline"
        f"&prompt=consent"
        f"&state={encoded_state}"
    )

@router.post("/register/customer", response_model=CustomerInDB, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/hour")
async def register_customer(request: Request, payload: CustomerCreate, db=Depends(get_db)):
    try:
        return await register_customer_service(payload, db)
    except (DuplicateEmailError, DuplicatePhoneError) as e:
        raise HTTPException(status_code=409, detail=str(e))

@router.get("/email/verify/{token}")
async def verify_email(token: str, db=Depends(get_db)):
    frontend_url = _get_frontend_url()
    try:
        jwt_token = await verify_email_service(token, db)
        return RedirectResponse(url=f"{frontend_url}/dashboard#token={urllib.parse.quote(jwt_token)}")
    except HTTPException as e:
        return RedirectResponse(url=f"{frontend_url}/verify-email?error={urllib.parse.quote(str(e.detail))}")


@router.post("/register/manager", response_model=ManagerDetails, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_scope("manager"))])
async def register_manager(payload: ManagerCreate, db=Depends(get_db)):
    """Only an existing manager can create another manager account."""
    try:
        return await register_manager_service(payload, db)
    except (DuplicateEmailError, DuplicatePhoneError) as e:
        raise HTTPException(status_code=409, detail=str(e))

@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute;50/hour")
async def login(request: Request, body: LoginRequest, response: Response, db=Depends(get_db)):
    try:
        token_response = await login_service(body, db)
    except InvalidCredentialsError as e:
        raise HTTPException(status_code=401, detail=str(e))
    
    _set_auth_cookie(response, token_response.access_token)
    return token_response

@router.get("/google/login")
async def google_login(db=Depends(get_db)):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    state = await _create_oauth_state("login", db)
    return RedirectResponse(url=_build_google_oauth_url(state))

@router.get("/google/signup")
async def google_signup(db=Depends(get_db)):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    state = await _create_oauth_state("signup", db)
    return RedirectResponse(url=_build_google_oauth_url(state))

@router.get("/google/callback")
async def google_callback(
    code: str = None,
    state: str = None,
    error: str = None,
    response: Response = None,
    db=Depends(get_db)
):
    frontend_url = _get_frontend_url()

    # Validate CSRF state token before doing anything else
    if not state:
        return RedirectResponse(url=f"{frontend_url}/login?error=missing_state")
    try:
        flow = await _consume_oauth_state(state, db)
    except HTTPException:
        return RedirectResponse(url=f"{frontend_url}/login?error=invalid_state")
    
    if error:
        return RedirectResponse(url=f"{frontend_url}{_get_redirect_path(flow)}?error={error}")
    
    if not code:
        return RedirectResponse(url=f"{frontend_url}{_get_redirect_path(flow)}?error=no_code")
    
    try:
        token_response = await exchange_code_for_token(code, GOOGLE_REDIRECT_URI)
        user_info = await get_google_user_info(token_response["access_token"])

        if flow == "signup":
            token_response_obj = await google_register_service(user_info, db)
            # Check if profile is complete (has phone, address info)
            payload = jwt.decode(token_response_obj.access_token, JWT_SECRET, algorithms=[JWT_ALG])
            user_id = payload.get("sub")
            # Check if profile needs completion
            customer = await db["customers"].find_one({"_id": ObjectId(user_id)})
            if customer and (not customer.get("phone") or not customer.get("street") or 
                           not customer.get("city") or not customer.get("state") or not customer.get("zip")):
                redirect_path = "/complete-profile"
            else:
                redirect_path = "/dashboard"
        else:
            # Google login - check if profile is complete for customers
            token_response_obj = await google_login_service(user_info, db)
            payload = jwt.decode(token_response_obj.access_token, JWT_SECRET, algorithms=[JWT_ALG])
            user_type = payload.get("scope", "customer")
            user_id = payload.get("sub")
            
            # For customers, check if profile is complete
            if user_type == "customer":
                customer = await db["customers"].find_one({"_id": ObjectId(user_id)})
                if customer and (not customer.get("phone") or not customer.get("street") or 
                               not customer.get("city") or not customer.get("state") or not customer.get("zip")):
                    redirect_path = "/complete-profile"
                else:
                    redirect_path = "/dashboard"
            else:
                # Managers go to manager dashboard
                redirect_path = "/manager-dashboard"

        _set_auth_cookie(response, token_response_obj.access_token)

        token_hash = urllib.parse.quote(token_response_obj.access_token)
        return RedirectResponse(url=f"{frontend_url}{redirect_path}#token={token_hash}")

    except HTTPException as e:
        error_detail = str(e.detail)
        
        if flow == "login" and "not found" in error_detail.lower():
            return RedirectResponse(
                url=f"{frontend_url}/signup?error={urllib.parse.quote('This account does not exist. Please sign up to create a new account.')}"
            )
        
        if flow == "signup" and ("already exists" in error_detail.lower() or e.status_code == 409):
            return RedirectResponse(
                url=f"{frontend_url}/signup?error={urllib.parse.quote('An account with this email already exists. Please use the login page to sign in.')}"
            )
        
        return RedirectResponse(url=f"{frontend_url}{_get_redirect_path(flow)}?error={urllib.parse.quote(error_detail)}")
    except Exception as e:
        logger.error("OAuth callback unhandled exception: %s\n%s", e, traceback.format_exc())
        return RedirectResponse(url=f"{frontend_url}{_get_redirect_path(flow)}?error=oauth_failed")


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(response: Response):
    response.delete_cookie(
        key=COOKIE_NAME,
        samesite="lax",
        secure=SECURE,
        httponly=True,
        path="/",
    )
    return {"message": "logged out"}

@router.get("/me")
async def me(user=Depends(get_current_user)):
    return user

@router.get("/profile")
async def my_profile(user=Depends(get_current_user), db=Depends(get_db)):
    try:
        if user["scope"] == "customer":
            return await get_customer_service(user["sub"], db)
        elif user["scope"] == "manager":
            return await get_manager_service(user["sub"], db)
    except Exception:
        raise
    raise HTTPException(403, 'Forbidden')

@router.post("/password/change", response_model=TokenResponse)
async def change_password(body: ChangePasswordRequest, response: Response, user=Depends(get_current_user), db=Depends(get_db)):
    token_resp = await change_password_service(user, body, db)
    _set_auth_cookie(response, token_resp.access_token)
    return token_resp

# Password Reset Flow Endpoints
# Note: Specific routes must come before parameterized routes to avoid conflicts

@router.post("/password/forgot", status_code=status.HTTP_200_OK)
@limiter.limit("5/hour")
async def forgot_password(request: Request, body: ForgotPasswordRequest, db=Depends(get_db)):
    """
    Request password reset for an email address.
    Generates secure reset token and sends email with reset link.
    Always returns success to prevent email enumeration attacks.
    """
    try:
        result = await request_password_reset_service(body.email, db)
        return result
    except Exception as e:
        logger.error("Error in forgot_password endpoint: %s", e)
        return {"message": "If that email exists, a password reset link has been sent."}


@router.get("/password/reset/verify/{token}", status_code=status.HTTP_200_OK)
async def verify_reset_token(token: str, db=Depends(get_db)):
    """
    Verify password reset token is valid and not expired.
    Called when user clicks reset link in email.
    """
    return await verify_reset_token_service(token, db)


@router.post("/password/reset/confirm", response_model=TokenResponse)
@limiter.limit("5/hour")
async def reset_password_confirm(request: Request, body: ResetPasswordWithTokenRequest, response: Response, db=Depends(get_db)):
    """
    Reset password using the reset token.
    Verifies token, updates password, and returns new JWT token for automatic login.
    """
    try:
        token_resp = await reset_password_with_token_service(body.token, body.new_password, db)
        _set_auth_cookie(response, token_resp.access_token)
        return token_resp
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Unexpected error in reset_password_confirm: %s", type(e).__name__)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/password/reset/{customer_id}", status_code=status.HTTP_200_OK, dependencies=[Depends(require_scope("manager"))])
async def reset_password_for_customer(customer_id: str, body: ResetPasswordRequest, user=Depends(get_current_user), db=Depends(get_db)):
    return await admin_reset_password_service(user, customer_id, body, db)

async def exchange_code_for_token(code: str, redirect_uri: str) -> dict:
    """Exchange OAuth code for access token"""
    async with httpx.AsyncClient() as client:
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }
        response = await client.post(token_url, data=data)
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Token exchange failed: {response.text}"
            )
        return response.json()


async def get_google_user_info(access_token: str) -> dict:
    """Fetch user info from Google API"""
    async with httpx.AsyncClient() as client:
        user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        headers = {"Authorization": f"Bearer {access_token}"}
        response = await client.get(user_info_url, headers=headers)
        response.raise_for_status()
        return response.json()
