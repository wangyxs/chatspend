"""
Database models and session management
"""
from sqlalchemy import Column, String, Float, Boolean, DateTime, Text, JSON, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime
import uuid

Base = declarative_base()


class Transaction(Base):
    """Transaction model"""
    __tablename__ = "transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=True)  # For multi-user support
    
    # Transaction details
    amount = Column(Float, nullable=False)
    category = Column(String(50), nullable=False)
    subcategory = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    merchant = Column(String(200), nullable=True)
    payment_method = Column(String(50), nullable=True)
    
    # Time
    transaction_date = Column(String(10), nullable=False)  # YYYY-MM-DD
    transaction_time = Column(String(8), nullable=True)  # HH:MM:SS
    
    # Metadata
    tags = Column(JSON, nullable=True)
    location = Column(String(200), nullable=True)
    receipt_image = Column(String(500), nullable=True)
    voice_note = Column(String(500), nullable=True)
    
    # AI processing
    confidence_score = Column(Float, nullable=True)
    is_confirmed = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": str(self.id),
            "amount": self.amount,
            "category": self.category,
            "subcategory": self.subcategory,
            "description": self.description,
            "merchant": self.merchant,
            "payment_method": self.payment_method,
            "transaction_date": self.transaction_date,
            "transaction_time": self.transaction_time,
            "tags": self.tags,
            "confidence_score": self.confidence_score,
            "is_confirmed": self.is_confirmed,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Budget(Base):
    """Budget model"""
    __tablename__ = "budgets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Budget details
    budget_type = Column(String(20), nullable=False)  # 'total', 'category', 'custom'
    category = Column(String(50), nullable=True)
    amount = Column(Float, nullable=False)
    period = Column(String(20), nullable=False)  # 'daily', 'weekly', 'monthly', 'yearly'
    
    # Time range
    start_date = Column(String(10), nullable=False)  # YYYY-MM-DD
    end_date = Column(String(10), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": str(self.id),
            "budget_type": self.budget_type,
            "category": self.category,
            "amount": self.amount,
            "period": self.period,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "is_active": self.is_active,
        }


class Reminder(Base):
    """Reminder model"""
    __tablename__ = "reminders"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Reminder details
    reminder_type = Column(String(50), nullable=False)
    trigger_type = Column(String(20), nullable=False)  # 'time', 'event', 'condition'
    trigger_config = Column(JSON, nullable=False)
    message_template = Column(Text, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    last_triggered_at = Column(DateTime, nullable=True)
    next_trigger_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": str(self.id),
            "reminder_type": self.reminder_type,
            "trigger_type": self.trigger_type,
            "trigger_config": self.trigger_config,
            "is_active": self.is_active,
        }


class Category(Base):
    """Category model for classification"""
    __tablename__ = "categories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=True)  # NULL for system categories
    
    # Category details
    name = Column(String(50), nullable=False)
    parent_id = Column(UUID(as_uuid=True), nullable=True)
    icon = Column(String(50), nullable=True)
    color = Column(String(10), nullable=True)
    
    # Keywords for classification
    keywords = Column(JSON, nullable=True)
    
    # System vs custom
    is_system = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": str(self.id),
            "name": self.name,
            "parent_id": str(self.parent_id) if self.parent_id else None,
            "icon": self.icon,
            "color": self.color,
            "keywords": self.keywords,
            "is_system": self.is_system,
        }
