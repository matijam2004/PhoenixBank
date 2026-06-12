from enum import Enum
from datetime import datetime
from typing import Optional
from decimal import Decimal
from bson import ObjectId, Decimal128

from pydantic import Field, field_serializer, field_validator
from shared.mongo import MongoModel, PyObjectId, BaseModel, ConfigDict, _oid_str

class Notification(BaseModel):
    id: PyObjectId = Field(default_factory=ObjectId, alias="_id")
    customer_id: PyObjectId
    message: str
    type: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @field_serializer("customer_id", "id")
    def serialize_objectid(self, v: ObjectId, _info):
        return _oid_str(v)

class NotificationCreate(BaseModel):
    customer_id: PyObjectId
    message: str
    type: str

