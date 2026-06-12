from pydantic import BaseModel
from datetime import datetime
from enum import Enum
from typing import Optional
from decimal import Decimal
from base64 import b64encode

from pydantic import Field, condecimal, field_validator, model_validator, TypeAdapter
from shared.mongo import MongoModel, PyObjectId, BaseModel, ConfigDict, field_serializer, _oid_str
from bson import ObjectId, Decimal128

class ImageData(BaseModel):
    name: str
    mime: str
    size: int
    data: bytes  # Mongo stores Binary, which Pydantic can read as bytes

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        extra="ignore"  # in case Mongo adds extra metadata
    )

    @field_serializer("data")
    def _encode_bytes(self, v: bytes, _info):
        # convert raw bytes → base64 string
        return b64encode(v).decode("ascii")

class CheckStatus(str, Enum):
    pending  = "pending"
    approved   = "approved"
    denied   = "denied"

class OCRPayload(BaseModel):
    imageDataUrl: str  # data URL from react-webcam getScreenshot()

class CheckBase(BaseModel):
    customer_id: PyObjectId
    account_id: PyObjectId
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    status: CheckStatus
    front: ImageData
    back: ImageData
    created_at: datetime
    success: bool

    # Optional OCR fields
    payee_name: Optional[str] = None
    date: Optional[datetime] = None
    memo: Optional[str] = None
    routing_no: Optional[str] = None
    payer_account_id: Optional[str] = Field(None, alias="payer_account_id")  # avoid clash
    check_no: Optional[str] = None

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        str_strip_whitespace=True
    )

    @field_validator("date", mode="before")
    def empty_string_to_none(cls, v):
        if v == "":
            return None
        return v

class CheckInDB(CheckBase):
    id: PyObjectId = Field(default_factory=ObjectId, alias="_id")

    @field_serializer("id")
    def _serialize_id(self, v: Optional[ObjectId], _info):
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

class CheckUpdate(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0, max_digits=12, decimal_places=2)
    status: Optional[CheckStatus] = None
    payee_name: Optional[str] = None
    date: Optional[datetime] = None
    memo: Optional[str] = None
    routing_no: Optional[str] = None
    payer_account_id: Optional[str] = None
    check_no: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def map_empty_strings_to_none(cls, data):
        if isinstance(data, dict):
            return {
                k: (None if isinstance(v, str) and v.strip() == "" else v)
                for k, v in data.items()
            }
        return data
    