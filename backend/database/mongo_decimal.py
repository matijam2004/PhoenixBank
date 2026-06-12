# app/db/mongo_decimal.py
from decimal import Decimal
import decimal
from bson.decimal128 import Decimal128, create_decimal128_context

DEC128_CTX = create_decimal128_context()

def to_decimal128(d: Decimal, quantize: str = "0.01") -> Decimal128:
    """
    Convert a Python Decimal to Decimal128 with a fixed quantization (e.g., 2 dp).
    """
    if not isinstance(d, Decimal):
        d = Decimal(str(d))
    with decimal.localcontext(DEC128_CTX):
        return Decimal128(d.quantize(Decimal(quantize)))
