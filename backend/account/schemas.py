from enum import Enum
from datetime import datetime
from typing import Optional
from decimal import Decimal
from bson import ObjectId, Decimal128

from pydantic import Field, field_serializer, field_validator
from shared.mongo import MongoModel, PyObjectId, BaseModel, ConfigDict, _oid_str

class AccountType(str, Enum):
    checking = "checking"
    savings  = "savings"

class AccountStatus(str, Enum):
    active = "active"
    frozen = "frozen"
    closed = "closed"

class AccountCreate(BaseModel):
    customer_id:  PyObjectId
    account_type: AccountType
    opening_balance: Decimal = Field(default=Decimal("0.00"))
    
    model_config = ConfigDict(arbitrary_types_allowed=True) # needed since it uses BaseModel

class AccountInDB(MongoModel):
    id: PyObjectId = Field(default_factory=ObjectId, alias="_id")
    customer_id: PyObjectId
    account_type: AccountType
    balance: Decimal
    status:  AccountStatus = AccountStatus.active
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @field_serializer("customer_id")
    def _serialize_customer_id(self, v: Optional[ObjectId], _info):
        return _oid_str(v)

    @field_validator("balance", mode="before")
    @classmethod
    def _balance_from_db(cls, v):
        if isinstance(v, Decimal128):
            return v.to_decimal()
        return v

    @field_serializer("balance")
    def _balance_to_json(self, v: Decimal):
        return str(v)

class AccountUpdate(BaseModel):
    status: Optional[AccountStatus] = None
    balance: Optional[Decimal] = None

    model_config = ConfigDict(arbitrary_types_allowed=True)