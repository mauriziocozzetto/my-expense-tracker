import asyncio
from sqlmodel import SQLModel, create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from backend.models import Account, Category, Tag
from backend.main import init_db
from decimal import Decimal

DATABASE_URL = "sqlite+aiosqlite:///../data/expense_manager.db"
engine = create_async_engine(DATABASE_URL, echo=True)

async def seed_data():
    # Inizializza le tabelle se non esistono
    await init_db()
    
    async with AsyncSession(engine) as session:
        # Creiamo un po' di dati solo se il DB è vuoto per evitare duplicati
        # Controlliamo se esiste già l'account "Conto Corrente"
        from sqlmodel import select
        res = await session.execute(select(Account).where(Account.name == "Conto Corrente"))
        if res.first():
            print("Il database contiene già dei dati, skipping seed.")
            return

        print("Popolamento del database in corso...")
        
        # 1. Accounts
        acc1 = Account(name="Conto Corrente", balance=Decimal("4500.50"))
        acc2 = Account(name="Carta di Credito", balance=Decimal("-520.00"))
        acc3 = Account(name="Risparmi", balance=Decimal("12000.00"))
        
        # 2. Categories
        cat1 = Category(name="Spesa")
        cat2 = Category(name="Affitto")
        cat3 = Category(name="Stipendio")
        cat4 = Category(name="Trasporti")
        cat5 = Category(name="Svago")
        
        # 3. Tags
        tag1 = Tag(name="Urgente")
        tag2 = Tag(name="Casa")
        tag3 = Tag(name="Lavoro")

        session.add_all([acc1, acc2, acc3, cat1, cat2, cat3, cat4, cat5, tag1, tag2, tag3])
        await session.commit()
        print("Dati iniziali (Account, Categorie e Tag) inseriti con successo!")

if __name__ == "__main__":
    asyncio.run(seed_data())
