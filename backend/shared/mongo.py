from __future__ import annotations

from typing import Any, Optional

from bson import ObjectId
from pydantic import BaseModel as _BaseModel
from pydantic import ConfigDict as _ConfigDict
from pydantic import EmailStr
from pydantic import field_serializer
from pydantic import GetCoreSchemaHandler, GetJsonSchemaHandler
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import core_schema


class PyObjectId(ObjectId):
    """BSON ObjectId wrapper with native Pydantic v2 support."""

    @classmethod
    def _validate(cls, value: Any) -> ObjectId:
        if isinstance(value, ObjectId):
            return value
        if isinstance(value, str) and ObjectId.is_valid(value):
            return ObjectId(value)
        raise ValueError("Invalid ObjectId")

    @classmethod
    def __get_pydantic_core_schema__(
        cls,
        source_type: Any,
        handler: GetCoreSchemaHandler,
    ) -> core_schema.CoreSchema:
        """Allow ObjectId instances or hex strings."""
        return core_schema.no_info_after_validator_function(
            cls._validate,
            core_schema.union_schema(
                [
                    core_schema.is_instance_schema(ObjectId),
                    core_schema.str_schema(),
                ]
            ),
            serialization=core_schema.plain_serializer_function_ser_schema(lambda v: str(v)),
        )

    @classmethod
    def __get_pydantic_core_schema__(
        cls, 
        _source_type: Any, 
        _handler: GetCoreSchemaHandler
    ) -> core_schema.CoreSchema:
        # Validate from ObjectId or hex string
        union = core_schema.union_schema([
            core_schema.is_instance_schema(ObjectId),
            core_schema.str_schema(),
        ])
        # Attach a serializer that always renders JSON as str(ObjectId)
        return core_schema.no_info_after_validator_function(
            cls._validate,
            union,
            serialization=core_schema.plain_serializer_function_ser_schema(lambda v: str(v)),
        )

    @classmethod
    def __get_pydantic_json_schema__(
        cls,
        core_schema: core_schema.CoreSchema,
        handler: GetJsonSchemaHandler,
    ) -> JsonSchemaValue:
        json_schema = handler(core_schema)
        json_schema.update({"type": "string", "pattern": "^[0-9a-fA-F]{24}$"})
        return json_schema


def _oid_str(value: Optional[ObjectId]) -> Optional[str]:
    return str(value) if value is not None else None


# Re-export frequently used helpers for convenience
BaseModel = _BaseModel
ConfigDict = _ConfigDict

class MongoModel(BaseModel):
    model_config = _ConfigDict(populate_by_name=True, arbitrary_types_allowed=True, extra="ignore")
    
    @field_serializer("id", check_fields=False)
    def _serialize_id(self, value: Optional[ObjectId], _info):
        return _oid_str(value)
