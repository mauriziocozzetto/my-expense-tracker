from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlmodel import SQLModel, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date
from decimal import Decimal
import os
import calendar
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles

from backend.models import Account, Category, Tag, RecurringRule, Transaction, UserProfile

import os
os.makedirs("data", exist_ok=True)
# Configurazione Database (supporto per SQLite in dev, ma strutturato per PostgreSQL tramite URL)
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///data/expense_manager.db")

engine = create_async_engine(DATABASE_URL, echo=True, future=True)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

async def get_session() -> AsyncSession:
    async with AsyncSession(engine) as session:
        yield session

async def process_recurring_transactions(session: AsyncSession):
    """
    Inserisce automaticamente le transazioni ricorrenti se non sono già state processate per il mese in corso.
    Viene chiamato all'avvio dell'app per rispettare il requisito di "avvio applicazione".
    """
    today = date.today()
    statement = select(RecurringRule)
    result = await session.execute(statement)
    rules = result.scalars().all()
    
    for rule in rules:
        if rule.day_of_month and rule.day_of_month == today.day:
            stmt = select(Transaction).where(Transaction.recurring_rule_id == rule.id).order_by(Transaction.date.desc()).limit(1)
            res = await session.execute(stmt)
            last_tx = res.scalar_one_or_none()
            
            if last_tx:
                check_stmt = select(Transaction).where(
                    Transaction.recurring_rule_id == rule.id,
                    Transaction.date == today
                )
                check_res = await session.execute(check_stmt)
                if not check_res.first():
                    new_tx = Transaction(
                        amount=last_tx.amount,
                        date=today,
                        description=f"{last_tx.description} (Ricorrente)",
                        account_id=last_tx.account_id,
                        category_id=last_tx.category_id,
                        is_recurring=True,
                        recurring_rule_id=rule.id
                    )
                    session.add(new_tx)
                    account = await session.get(Account, last_tx.account_id)
                    if account:
                        account.balance += new_tx.amount
    
    await session.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    async with AsyncSession(engine) as session:
        await process_recurring_transactions(session)
    yield

app = FastAPI(title="Monthly Expense Manager API", lifespan=lifespan)

# Abilita CORS per permettere al frontend locale (es. localhost:8080 o file://) di chiamare le API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In produzione andrebbe limitato ai domini reali
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- ACCOUNTS ENDPOINTS ---

@app.get("/accounts/", response_model=List[Account])
async def get_accounts(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Account))
    return result.scalars().all()

@app.post("/accounts/", response_model=Account)
async def create_account(account: Account, session: AsyncSession = Depends(get_session)):
    session.add(account)
    await session.commit()
    await session.refresh(account)
    return account

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    balance: Optional[Decimal] = None

@app.patch("/accounts/{account_id}", response_model=Account)
async def update_account(account_id: int, account_update: AccountUpdate, session: AsyncSession = Depends(get_session)):
    account = await session.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account non trovato")
    
    if account_update.name is not None:
        account.name = account_update.name
    if account_update.balance is not None:
        account.balance = account_update.balance
        
    session.add(account)
    await session.commit()
    await session.refresh(account)
    return account

@app.delete("/accounts/{account_id}")
async def delete_account(account_id: int, session: AsyncSession = Depends(get_session)):
    account = await session.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account non trovato")
    await session.delete(account)
    await session.commit()
    return {"ok": True}

# --- CATEGORIES ENDPOINTS ---

@app.get("/categories/", response_model=List[Category])
async def get_categories(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Category))
    return result.scalars().all()

# --- TRANSACTIONS ENDPOINTS ---

class TransactionCreate(BaseModel):
    amount: Decimal
    date: date
    description: Optional[str] = None
    account_id: int
    category_id: int
    is_recurring: bool = False
    frequency: Optional[str] = None
    day_of_month: Optional[int] = None

@app.post("/transactions/", response_model=Transaction)
async def create_transaction(transaction_data: TransactionCreate, session: AsyncSession = Depends(get_session)):
    account = await session.get(Account, transaction_data.account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Conto non trovato")
    category = await session.get(Category, transaction_data.category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoria non trovata")
    
    recurring_rule_id = None
    if transaction_data.is_recurring and transaction_data.frequency:
        rule = RecurringRule(
            frequency=transaction_data.frequency,
            day_of_month=transaction_data.day_of_month
        )
        session.add(rule)
        await session.flush()
        await session.refresh(rule)
        recurring_rule_id = rule.id
    
    transaction = Transaction(
        amount=transaction_data.amount,
        date=transaction_data.date,
        description=transaction_data.description,
        account_id=transaction_data.account_id,
        category_id=transaction_data.category_id,
        is_recurring=transaction_data.is_recurring,
        recurring_rule_id=recurring_rule_id
    )
    
    account.balance += transaction.amount
    session.add(account)
    session.add(transaction)
    await session.commit()
    await session.refresh(transaction)
    return transaction

import datetime

class TransactionUpdate(BaseModel):
    amount: Optional[Decimal] = None
    date: Optional[datetime.date] = None
    description: Optional[str] = None
    account_id: Optional[int] = None
    category_id: Optional[int] = None

@app.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: int, session: AsyncSession = Depends(get_session)):
    transaction = await session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transazione non trovata")
    
    account = await session.get(Account, transaction.account_id)
    if account:
        account.balance -= transaction.amount
        session.add(account)
        
    await session.delete(transaction)
    await session.commit()
    return {"ok": True}

@app.patch("/transactions/{transaction_id}", response_model=Transaction)
async def update_transaction(transaction_id: int, transaction_update: TransactionUpdate, session: AsyncSession = Depends(get_session)):
    transaction = await session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transazione non trovata")
        
    old_account_id = transaction.account_id
    old_amount = transaction.amount
    
    new_account_id = transaction_update.account_id if transaction_update.account_id is not None else old_account_id
    new_amount = transaction_update.amount if transaction_update.amount is not None else old_amount
    
    if old_account_id != new_account_id:
        old_account = await session.get(Account, old_account_id)
        if old_account:
            old_account.balance -= old_amount
            session.add(old_account)
            
        new_account = await session.get(Account, new_account_id)
        if not new_account:
            raise HTTPException(status_code=404, detail="Nuovo conto non trovato")
        new_account.balance += new_amount
        session.add(new_account)
    else:
        if old_amount != new_amount:
            account = await session.get(Account, old_account_id)
            if account:
                account.balance -= old_amount
                account.balance += new_amount
                session.add(account)
                
    if transaction_update.amount is not None:
        transaction.amount = transaction_update.amount
    if transaction_update.date is not None:
        transaction.date = transaction_update.date
    if transaction_update.description is not None:
        transaction.description = transaction_update.description
    if transaction_update.account_id is not None:
        transaction.account_id = transaction_update.account_id
    if transaction_update.category_id is not None:
        transaction.category_id = transaction_update.category_id
        
    session.add(transaction)
    await session.commit()
    await session.refresh(transaction)
    return transaction

@app.get("/transactions/")
async def get_transactions(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category_id: Optional[int] = None,
    account_id: Optional[int] = None,
    tags: Optional[List[str]] = Query(None),
    search: Optional[str] = None,
    session: AsyncSession = Depends(get_session)
):
    query = select(Transaction).options(selectinload(Transaction.tags))
    
    if start_date:
        query = query.where(Transaction.date >= start_date)
    if end_date:
        query = query.where(Transaction.date <= end_date)
    if account_id:
        query = query.where(Transaction.account_id == account_id)
    if search:
        query = query.where(Transaction.description.ilike(f"%{search}%"))
        
    if category_id:
        cat_query = select(Category).where(Category.parent_id == category_id)
        res = await session.execute(cat_query)
        sub_cats = res.scalars().all()
        cat_ids = [category_id] + [c.id for c in sub_cats]
        query = query.where(Transaction.category_id.in_(cat_ids))
        
    if tags:
        for tag_name in tags:
            query = query.where(Transaction.tags.any(Tag.name == tag_name))

    result = await session.execute(query)
    return result.scalars().all()

# --- USER PROFILE ENDPOINTS ---
class UserProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None

@app.get("/profile", response_model=UserProfile)
async def get_profile(session: AsyncSession = Depends(get_session)):
    statement = select(UserProfile).limit(1)
    result = await session.execute(statement)
    profile = result.scalar_one_or_none()
    if not profile:
        profile = UserProfile()
        session.add(profile)
        await session.commit()
        await session.refresh(profile)
    return profile

@app.patch("/profile", response_model=UserProfile)
async def update_profile(profile_update: UserProfileUpdate, session: AsyncSession = Depends(get_session)):
    statement = select(UserProfile).limit(1)
    result = await session.execute(statement)
    profile = result.scalar_one_or_none()
    
    if not profile:
        profile = UserProfile()
        session.add(profile)
    
    update_data = profile_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(profile, key, value)
        
    await session.commit()
    await session.refresh(profile)
    return profile

@app.get("/stats/annual")
async def get_annual_stats(year: int = Query(default_factory=lambda: date.today().year), session: AsyncSession = Depends(get_session)):
    start_of_year = date(year, 1, 1)
    end_of_year = date(year, 12, 31)
    
    query = select(Transaction).where(
        Transaction.date >= start_of_year,
        Transaction.date <= end_of_year,
        Transaction.amount < 0
    )
    result = await session.execute(query)
    transactions = result.scalars().all()
    
    monthly_totals = {i: Decimal("0.00") for i in range(1, 13)}
    
    for tx in transactions:
        monthly_totals[tx.date.month] += abs(tx.amount)
        
    return [
        {"month": calendar.month_abbr[month], "total": float(monthly_totals[month])}
        for month in range(1, 13)
    ]

@app.get("/stats/categories")
async def get_category_stats(
    year: int = Query(default_factory=lambda: date.today().year),
    month: int = Query(default_factory=lambda: date.today().month),
    session: AsyncSession = Depends(get_session)
):
    start_date = date(year, month, 1)
    _, last_day = calendar.monthrange(year, month)
    end_date = date(year, month, last_day)
    
    query = select(Transaction).options(selectinload(Transaction.category)).where(
        Transaction.date >= start_date,
        Transaction.date <= end_date,
        Transaction.amount < 0
    )
    
    result = await session.execute(query)
    transactions = result.scalars().all()
    
    total_spent = Decimal("0.00")
    category_totals = {}
    
    for tx in transactions:
        abs_amount = abs(tx.amount)
        total_spent += abs_amount
        
        cat = tx.category
        macro_cat_name = cat.name
        
        if cat.parent_id:
            parent_cat = await session.get(Category, cat.parent_id)
            if parent_cat:
                macro_cat_name = parent_cat.name
                
        if macro_cat_name not in category_totals:
            category_totals[macro_cat_name] = Decimal("0.00")
        category_totals[macro_cat_name] += abs_amount
        
    stats = []
    if total_spent > 0:
        for cat_name, amount in category_totals.items():
            percentage = (amount / total_spent) * 100
            stats.append({
                "category": cat_name,
                "amount": float(amount),
                "percentage": round(float(percentage), 2)
            })
            
    stats.sort(key=lambda x: x["percentage"], reverse=True)
    return stats

# Serve il frontend statico
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
