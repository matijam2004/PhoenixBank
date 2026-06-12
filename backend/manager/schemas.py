from typing import Optional
from datetime import datetime

from pydantic import Field, EmailStr, BaseModel, field_serializer
from shared.mongo import MongoModel, PyObjectId
from bson import ObjectId

class ManagerBase(BaseModel):
    first_name: str
    last_name:  str
    email: EmailStr
    phone: str
    street: str
    city: str
    state: str

class ManagerCreate(ManagerBase):
    password: str

class ManagerInDB(ManagerBase, MongoModel):
    id: PyObjectId = Field(default_factory=ObjectId, alias="_id")
    password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ManagerUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None

class ManagerDetails(ManagerBase, MongoModel):
    id: PyObjectId = Field(default_factory=ObjectId, alias="_id")
    created_at: datetime
    updated_at: Optional[datetime] = None