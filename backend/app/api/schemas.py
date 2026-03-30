"""
API schemas using Pydantic
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class TransactionCreate(BaseModel):
    """Transaction creation schema"""
    input: str = Field(..., description="Natural language input", example="今天午饭花了35块")
    input_type: str = Field(default="text", description="Input type: text, voice, image")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")


class TransactionResponse(BaseModel):
    """Transaction response schema"""
    id: str
    amount: float
    category: str
    subcategory: Optional[str]
    transaction_date: str
    transaction_time: Optional[str]
    description: Optional[str]
    merchant: Optional[str]
    payment_method: Optional[str]
    tags: Optional[List[str]]
    confidence_score: Optional[float]
    is_confirmed: bool
    created_at: Optional[str]

    class Config:
        from_attributes = True


class TransactionListResponse(BaseModel):
    """Transaction list response schema"""
    transactions: List[TransactionResponse]
    total: int
    message: Optional[str]


class ParsedTransaction(BaseModel):
    """Parsed transaction from natural language"""
    amount: Optional[float]
    category: str
    subcategory: Optional[str]
    transaction_date: str
    transaction_time: Optional[str]
    description: Optional[str]
    confidence: float
    requires_confirmation: bool


class ParseResponse(BaseModel):
    """Parse response schema"""
    success: bool = True
    transactions: List[ParsedTransaction]
    message: str
    requires_confirmation: bool = False
