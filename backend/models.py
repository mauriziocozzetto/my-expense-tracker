from decimal import Decimal
from datetime import date
from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship

class TransactionTag(SQLModel, table=True):
    """Tabella di associazione per la relazione Many-to-Many tra Transaction e Tag"""
    transaction_id: Optional[int] = Field(default=None, foreign_key="transaction.id", primary_key=True)
    tag_id: Optional[int] = Field(default=None, foreign_key="tag.id", primary_key=True)

class Account(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    balance: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    
    transactions: List["Transaction"] = Relationship(back_populates="account")

class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    parent_id: Optional[int] = Field(default=None, foreign_key="category.id")
    
    # Self-referencing relationship per gestire Categorie Principali e Sotto-categorie
    parent: Optional["Category"] = Relationship(
        back_populates="subcategories",
        sa_relationship_kwargs=dict(remote_side="Category.id")
    )
    subcategories: List["Category"] = Relationship(back_populates="parent")
    transactions: List["Transaction"] = Relationship(back_populates="category")

class Tag(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    
    transactions: List["Transaction"] = Relationship(back_populates="tags", link_model=TransactionTag)

class RecurringRule(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    frequency: str  # es. "mensile", "settimanale"
    interval: int = Field(default=1)
    day_of_month: Optional[int] = Field(default=None) # es. giorno 15
    
    transactions: List["Transaction"] = Relationship(back_populates="recurring_rule")

class Transaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    amount: Decimal = Field(max_digits=12, decimal_places=2) # positivo entrate, negativo uscite
    date: date
    description: Optional[str] = Field(default=None)
    
    account_id: int = Field(foreign_key="account.id")
    category_id: int = Field(foreign_key="category.id")
    
    is_recurring: bool = Field(default=False)
    recurring_rule_id: Optional[int] = Field(default=None, foreign_key="recurringrule.id")
    
    account: Account = Relationship(back_populates="transactions")
    category: Category = Relationship(back_populates="transactions")
    recurring_rule: Optional[RecurringRule] = Relationship(back_populates="transactions")
    tags: List[Tag] = Relationship(back_populates="transactions", link_model=TransactionTag)

class UserProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    first_name: Optional[str] = Field(default=None)
    last_name: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    address: Optional[str] = Field(default=None)
    email: Optional[str] = Field(default=None)
