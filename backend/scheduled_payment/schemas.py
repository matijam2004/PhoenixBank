from enum import Enum
from datetime import datetime
from typing import Optional
from decimal import Decimal
from bson import ObjectId, Decimal128

from pydantic import Field, field_serializer, field_validator
from shared.mongo import MongoModel, PyObjectId, BaseModel, ConfigDict, _oid_str

class ScheduledPaymentStatus(str, Enum):
    active = 'active'
    paused = 'paused'

class ScheduledPaymentFrequency(str, Enum):
    once = 'once'
    daily = 'daily'
    weekly = 'weekly' 
    biweekly = 'biweekly'
    monthly = 'monthly' 
    annual = 'annual'

class Payee(BaseModel):
    name: str
    account_id: str
    routing_no: str

class ScheduledPaymentCreate(BaseModel):
    customer_id: PyObjectId
    account_id: PyObjectId
    label: str
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    payee: Payee
    frequency: ScheduledPaymentFrequency
    date: datetime

    model_config = ConfigDict(arbitrary_types_allowed=True)

class ScheduledPaymentInDB(MongoModel):
    id: PyObjectId = Field(default_factory=ObjectId, alias="_id")
    customer_id: PyObjectId
    account_id: PyObjectId
    label: str
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    payee: Payee
    frequency: ScheduledPaymentFrequency
    date: datetime
    next_run: Optional[datetime] = None
    last_run: Optional[datetime] = None
    status: ScheduledPaymentStatus
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_serializer("account_id")
    def _serialize_customer_id(self, v: Optional[ObjectId], _info):
        return _oid_str(v)

    @field_validator("amount", mode="before")
    @classmethod
    def _balance_from_db(cls, v):
        if isinstance(v, Decimal128):
            return v.to_decimal()
        return v

    @field_serializer("amount")
    def _balance_to_json(self, v: Decimal):
        return str(v)

class ScheduledPaymentUpdate(BaseModel):
    account_id: Optional[PyObjectId] = None
    amount: Optional[Decimal] = None
    payee: Optional[Payee] = None
    frequency: Optional[ScheduledPaymentFrequency] = None
    date: Optional[datetime] = None
    status: Optional[ScheduledPaymentStatus] = None
    label: Optional[str] = None

    model_config = ConfigDict(
        arbitrary_types_allowed = True,
        populate_by_name = True
    )