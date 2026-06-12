from datetime import datetime
from pydantic import BaseModel, Field, constr, EmailStr, field_serializer, StringConstraints, field_validator
from shared.mongo import MongoModel, PyObjectId, _oid_str
from bson import ObjectId
from typing import Optional, Annotated
import re

# Retrieve-related schemas

class CustomerBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str = Field(..., pattern=r'^\d{10}$')
    street: str
    city: str
    state: str
    zip: str

PasswordStr = Annotated[str, StringConstraints(
    min_length=8,
    max_length=64,
    strip_whitespace=True,
)]

class CustomerCreate(CustomerBase):
    password: PasswordStr

    @field_validator('password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must include at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must include at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must include at least one digit')
        return v

class CustomerInDB(CustomerBase, MongoModel):
    id: PyObjectId = Field(default_factory=ObjectId, alias="_id")
    password: str
    phone: str = Field(default="", pattern=r'^(\d{10})?$')  # allow empty for Google OAuth users
    email_verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Update-related schemas

class CustomerUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None

class CustomerDetails(CustomerBase, MongoModel):
    """
    Public-facing response (no password).
    Use this as response_model for GET/PATCH profile endpoints.
    """
    id: PyObjectId = Field(default_factory=ObjectId, alias="_id")
    phone: str = Field(default="", pattern=r'^(\d{10})?$')  # allow empty for Google OAuth users
    email_verified: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
