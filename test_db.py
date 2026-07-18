import asyncio
from backend.main import create_transaction, TransactionCreate
from backend.models import engine
from sqlmodel.ext.asyncio.session import AsyncSession
from decimal import Decimal
import datetime

async def test():
    async with AsyncSession(engine) as session:
        t = TransactionCreate(
            amount=Decimal(1000), date=datetime.date.today(), account_id=1, category_id=1, description="Test", is_recurring=True, frequency="monthly", day_of_month=15
        )
        try:
            res = await create_transaction(t, session)
            print("OK", res)
        except Exception as e:
            import traceback
            traceback.print_exc()

asyncio.run(test())
