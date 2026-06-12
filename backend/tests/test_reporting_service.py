from __future__ import annotations

import sys
import unittest
from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional

from bson import ObjectId

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from reporting.service import generate_transactions_csv
from shared.exceptions import CustomerNotFoundError


class FakeCursor:
    def __init__(self, items: Iterable[Dict[str, Any]]):
        self._items: List[Dict[str, Any]] = list(items)
        self._index = 0

    def sort(self, field: str, direction: int):
        reverse = direction == -1
        sorted_items = sorted(
            self._items,
            key=lambda item: item.get(field),
            reverse=reverse,
        )
        return FakeCursor(sorted_items)

    def __aiter__(self):
        self._index = 0
        return self

    async def __anext__(self):
        if self._index >= len(self._items):
            raise StopAsyncIteration
        item = self._items[self._index]
        self._index += 1
        return item


class FakeCollection:
    def __init__(self, documents: Iterable[Dict[str, Any]]):
        self._documents: List[Dict[str, Any]] = list(documents)

    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for doc in self._documents:
            if all(doc.get(field) == value for field, value in query.items()):
                return doc
        return None

    def find(self, query: Dict[str, Any]):
        def match(document: Dict[str, Any], criteria: Dict[str, Any]) -> bool:
            for field, expected in criteria.items():
                if isinstance(expected, dict) and "$in" in expected:
                    if document.get(field) not in expected["$in"]:
                        return False
                else:
                    if document.get(field) != expected:
                        return False
            return True

        filtered = [doc for doc in self._documents if match(doc, query)]
        return FakeCursor(filtered)


class FakeDB:
    def __init__(self, **collections: FakeCollection):
        self._collections = collections

    def __getitem__(self, name: str) -> FakeCollection:
        return self._collections[name]


class ReportingServiceTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.customer_id = ObjectId()
        self.account_id = ObjectId()
        self.other_account_id = ObjectId()

        customers = FakeCollection(
            [{"_id": self.customer_id, "email": "customer@example.test"}]
        )
        accounts = FakeCollection(
            [
                {"_id": self.account_id, "customer_id": self.customer_id, "account_type": "checking"},
                {"_id": self.other_account_id, "customer_id": ObjectId(), "account_type": "savings"},
            ]
        )
        transactions = FakeCollection(
            [
                {
                    "_id": ObjectId(),
                    "account_id": self.account_id,
                    "type": "deposit",
                    "status": "posted",
                    "amount": 100.0,
                    "description": "Initial deposit",
                    "created_at": datetime.utcnow() - timedelta(days=1),
                },
                {
                    "_id": ObjectId(),
                    "account_id": self.account_id,
                    "type": "withdrawal",
                    "status": "posted",
                    "amount": 40.5,
                    "description": "ATM withdrawal",
                    "created_at": datetime.utcnow(),
                },
                {
                    "_id": ObjectId(),
                    "account_id": self.other_account_id,
                    "type": "deposit",
                    "status": "posted",
                    "amount": 999.99,
                    "description": "Other account",
                    "created_at": datetime.utcnow(),
                },
            ]
        )

        self.db = FakeDB(
            customers=customers,
            accounts=accounts,
            transactions=transactions,
        )

    async def test_generate_transactions_csv_includes_customer_transactions(self):
        csv_text = await generate_transactions_csv(str(self.customer_id), self.db)
        lines = [line for line in csv_text.strip().splitlines() if line]

        self.assertGreaterEqual(len(lines), 2)
        header = lines[0].split(",")
        self.assertIn("transaction_id", header)
        self.assertIn("customer_id", header)
        self.assertIn("created_at", header)

        self.assertTrue(
            any(str(self.customer_id) in row for row in lines[1:]),
            "CSV should include rows for the target customer",
        )
        self.assertFalse(
            any(str(self.other_account_id) in row for row in lines[1:]),
            "CSV should not include transactions for other accounts",
        )

    async def test_generate_transactions_csv_raises_when_customer_missing(self):
        missing_customer_id = ObjectId()
        with self.assertRaises(CustomerNotFoundError):
            await generate_transactions_csv(str(missing_customer_id), self.db)

    async def test_generate_transactions_csv_invalid_object_id(self):
        with self.assertRaises(CustomerNotFoundError):
            await generate_transactions_csv("not-a-valid-oid", self.db)


if __name__ == "__main__":
    unittest.main()
