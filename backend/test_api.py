import sys
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
try:
    response = client.post("/transactions/", json={
        "amount": 1000, "date": "2026-07-17", "account_id": 1, "category_id": 1, "description": "Stipendio", "is_recurring": True, "frequency": "monthly", "day_of_month": 15
    })
    print(response.status_code)
    print(response.json())
except Exception as e:
    import traceback
    traceback.print_exc()
