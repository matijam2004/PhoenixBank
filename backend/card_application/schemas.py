from enum import Enum
from datetime import datetime
from typing import Optional
from bson import ObjectId
from pydantic import Field

from shared.mongo import MongoModel, PyObjectId, BaseModel, ConfigDict


class CardApplicationStatus(str, Enum):
    pending  = "pending"
    approved = "approved"
    rejected = "rejected"


class CardApplicationCreate(BaseModel):
    card_id:   str
    card_name: str
    # personal
    first_name: str
    last_name:  str
    dob:        str
    ssn_last4:  str
    address:    str
    city:       str
    state:      str
    zip:        str
    # financial
    employment:    str
    employer:      str = ""
    income:        float
    housing:       str
    monthly_rent:  float = 0.0

    model_config = ConfigDict(arbitrary_types_allowed=True)


class CardApplicationInDB(MongoModel):
    id: PyObjectId = Field(default_factory=ObjectId, alias="_id")
    customer_id: PyObjectId
    card_id:   str
    card_name: str
    first_name: str
    last_name:  str
    dob:        str
    ssn_last4:  str
    address:    str
    city:       str
    state:      str
    zip:        str
    employment:   str
    employer:     str = ""
    income:       float
    housing:      str
    monthly_rent: float = 0.0
    status:       CardApplicationStatus = CardApplicationStatus.pending
    created_at:   datetime = Field(default_factory=datetime.utcnow)
    reviewed_at:  Optional[datetime] = None
    reviewed_by:  Optional[str] = None
    rejection_reason: Optional[str] = None


class CardApplicationManagerSummary(MongoModel):
    """
    Stripped-down view used for the manager applications list endpoint.

    SSN last 4 and date of birth are intentionally absent here. The bulk list
    can return hundreds of rows and exposing PII in a paginated list creates a
    larger attack surface than necessary. Managers who need to verify identity
    details (SSN, DOB) must expand an individual application, which hits the
    dedicated GET /{id} endpoint that returns the full CardApplicationInDB schema.
    """
    id: PyObjectId = Field(default_factory=ObjectId, alias="_id")
    customer_id: PyObjectId
    card_id:   str
    card_name: str
    first_name: str
    last_name:  str
    address:    str
    city:       str
    state:      str
    zip:        str
    employment:   str
    employer:     str = ""
    income:       float
    housing:      str
    monthly_rent: float = 0.0
    status:       CardApplicationStatus = CardApplicationStatus.pending
    created_at:   datetime = Field(default_factory=datetime.utcnow)
    reviewed_at:  Optional[datetime] = None
    reviewed_by:  Optional[str] = None
    rejection_reason: Optional[str] = None
