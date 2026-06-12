from enum import Enum
from typing import Annotated, Optional, Literal, List, Union
from decimal import Decimal
from datetime import datetime

from pydantic import Field, condecimal, field_validator, model_validator, TypeAdapter
from shared.mongo import MongoModel, PyObjectId, BaseModel, ConfigDict, field_serializer, _oid_str
from bson import ObjectId, Decimal128

class MongoModel(BaseModel):
    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        populate_by_name=True,   # lets you use "id" in code and "_id" in DB
    )

class TransactionType(str, Enum):
    deposit    = "deposit"
    withdrawal = "withdraw"
    transfer   = "transfer"
    payment    = "payment"
    external   = "external"
    internal   = "internal"

class TransactionStatus(str, Enum):
    pending  = "pending"
    posted   = "posted"
    failed   = "failed"
    reversed = "reversed"

class TransactionBase(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    description: Optional[str] = None
    run_at: Optional[datetime] = None

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        str_strip_whitespace=True
    )

class SingleAccountTxn(TransactionBase):
    type: Literal["deposit", "check", "withdraw", "payment"]
    account_id: PyObjectId

class TransferTxn(TransactionBase):
    type: Literal["transfer", "external", "internal"]
    from_account_id: PyObjectId
    to_account_id: PyObjectId

    @model_validator(mode="after")
    def accounts_must_differ(self):
        if self.from_account_id == self.to_account_id:
            raise ValueError("from_account_id and to_account_id must differ")
        return self

TransactionRequest = Annotated[
    Union[SingleAccountTxn, TransferTxn], 
    Field(discriminator="type"),
]

TA_TransactionRequest = TypeAdapter(TransactionRequest)

class TransactionCreate(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    account_id: PyObjectId
    type:  TransactionType
    amount: float
    description: Optional[str] = None
    external_bank_name:     Optional[str] = None
    external_routing_last4: Optional[str] = None
    external_account_last4: Optional[str] = None

# ---- Base shared by ALL transaction documents in DB ----
class TransactionBaseInDB(MongoModel):
    id: PyObjectId = Field(default_factory=ObjectId, alias="_id")
    type: TransactionType   # discriminator lives here
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    status: TransactionStatus
    description: Optional[str] = None
    run_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @field_serializer("id")
    def serialize_objectid(self, v: ObjectId, _info):
        return str(v)

    @field_validator("amount", mode="before")
    @classmethod
    def _amount_from_db(cls, v):
        if isinstance(v, Decimal128):
            return v.to_decimal()
        return v

    @field_serializer("amount")
    def _amount_to_json(self, v: Decimal):
        return str(v)

# ---- Variants (only their unique fields) ----
class DepositInDB(TransactionBaseInDB):
    type: Literal["deposit", "check"]
    to_account_id: PyObjectId

    @field_serializer("to_account_id")
    def serialize_objectid(self, v: ObjectId, _info):
        return str(v)

class WithdrawInDB(TransactionBaseInDB):
    type: Literal["withdraw"]
    from_account_id: PyObjectId

    @field_serializer("from_account_id")
    def serialize_objectid(self, v: ObjectId, _info):
        return str(v)

class PaymentInDB(TransactionBaseInDB):
    type: Literal["payment"]
    from_account_id: PyObjectId

    @field_serializer("from_account_id")
    def serialize_objectid(self, v: ObjectId, _info):
        return str(v)

class TransferInDB(TransactionBaseInDB):
    type: Literal["transfer", "external", "internal"]
    from_account_id: PyObjectId
    to_account_id: PyObjectId

    @field_serializer("to_account_id", 'from_account_id')
    def serialize_objectid(self, v: ObjectId, _info):
        return str(v)

TransactionInDB = Annotated[
    Union[DepositInDB, WithdrawInDB, PaymentInDB, TransferInDB],
    Field(discriminator="type"),
]

TA_TransactionInDB = TypeAdapter(TransactionInDB)
TA_TransactionList = TypeAdapter(list[TransactionInDB])

class TransactionsQuery(BaseModel):
    transaction_id: Optional[str] = None
    account_id: Optional[str] = None
    customer_id: Optional[str] = None

    start_date: Optional[str] = None
    end_date: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    status: Optional[str] = None
    sort: Literal["created_at", "amount", "_id"] = "created_at"
    order: Literal["asc", "desc"] = "desc"
    limit: int = 50
    skip: int = 0

    @field_validator("limit")
    @classmethod
    def clamp_limit(cls, v: int) -> int:
        return max(1, min(v, 200))

class TransactionOut(BaseModel):
    id: str
    type: str
    from_account_id: Optional[str] = None
    to_account_id: Optional[str] = None
    customer_id: Optional[str] = None
    amount: Decimal 
    description: Optional[str] = None
    status: str
    created_at: datetime
    run_at: Optional[datetime] = None 
    posted_at: Optional[datetime] = None

    model_config = {
        "populate_by_name": True,
        "json_encoders": {
            Decimal: lambda d: str(d),
            ObjectId: str,
        }
    }

    @classmethod
    def from_mongo(cls, d: dict) -> "TransactionOut":
        """Convert Mongo document (with Decimal128, ObjectId) into a TransactionOut"""
        amount = d.get("amount")

        # Convert Decimal128 → Decimal
        if isinstance(amount, Decimal128):
            amount = amount.to_decimal()
        elif isinstance(amount, (float, int, str)):
            amount = Decimal(str(amount))
        elif amount is None:
            amount = Decimal("0")

        return cls(
            id=str(d.get("_id")),
            type=d["type"],
            from_account_id=str(d["from_account_id"]) if d.get("from_account_id") else None,
            to_account_id=str(d["to_account_id"]) if d.get("to_account_id") else None,
            customer_id=str(d["customer_id"]) if d.get("customer_id") else None,
            amount=amount,
            description=d.get("description"),
            status=d["status"],
            created_at=d["created_at"],
            run_at=d.get('run_at'),
            posted_at=d.get("posted_at"),
        )


class TransactionsPage(BaseModel):
    items: List[TransactionOut]
    total: int
    limit: int
    skip: int