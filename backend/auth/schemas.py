from pydantic import constr, BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ChangePasswordRequest(BaseModel):
    current_password: constr(min_length=8)
    new_password: constr(min_length=8)

class ResetPasswordRequest(BaseModel):
    new_password: constr(min_length=8)

class ForgotPasswordRequest(BaseModel):
    """Request schema for forgot password endpoint"""
    email: EmailStr

class ResetPasswordWithTokenRequest(BaseModel):
    """Request schema for resetting password with a token"""
    token: str
    new_password: constr(min_length=8)