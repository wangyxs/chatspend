"""
Transaction API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from datetime import datetime, timedelta
from loguru import logger

from app.core import get_db
from app.models import Transaction
from app.agents import RecordingAgent
from app.agents.orchestrator import OrchestratorAgent
from app.api.schemas import (
    TransactionCreate,
    TransactionResponse,
    TransactionListResponse,
    ParseResponse,
    ParsedTransaction,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])
recording_agent = RecordingAgent()
orchestrator = OrchestratorAgent()


@router.post("/chat")
async def chat_with_agent(
    request: TransactionCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    统一对话入口 - Orchestrator Agent处理
    
    支持多种意图：
    - 记账：直接输入消费描述
    - 查询：询问消费记录
    - 分析：请求消费分析
    - 帮助：询问使用方法
    """
    try:
        logger.info(f"Chat request: {request.input}")
        
        context = {
            "current_time": datetime.now(),
            "db_session": db,
            **(request.context or {})
        }
        
        # 使用Orchestrator处理
        result = await orchestrator.process(request.input, context)
        
        return result
        
    except Exception as e:
        logger.error(f"Chat failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/parse", response_model=ParseResponse)
async def parse_transaction(
    request: TransactionCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Parse natural language into transaction(s)
    
    Example:
    - Input: "今天午饭花了35块"
    - Output: Parsed transaction with amount, category, date, etc.
    """
    try:
        logger.info(f"Parsing transaction: {request.input}")
        
        # Parse using Recording Agent
        context = {
            "current_time": datetime.now(),
            **(request.context or {})
        }
        
        parsed_transactions = await recording_agent.parse_transaction(
            request.input,
            context
        )
        
        # Generate response message
        if len(parsed_transactions) == 1:
            trans = parsed_transactions[0]
            message = f"已识别：{trans['category']}"
            if trans.get('subcategory'):
                message += f" - {trans['subcategory']}"
            message += f"，{trans['amount']}元"
            
            if trans.get('requires_confirmation'):
                message += "。请确认是否正确。"
        else:
            message = f"已识别{len(parsed_transactions)}笔交易"
        
        return ParseResponse(
            success=True,
            transactions=[ParsedTransaction(**t) for t in parsed_transactions],
            message=message,
            requires_confirmation=any(t.get('requires_confirmation', False) for t in parsed_transactions)
        )
        
    except Exception as e:
        logger.error(f"Failed to parse transaction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("", response_model=TransactionListResponse)
async def create_transaction(
    request: TransactionCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create transaction(s) from natural language
    
    Example:
    - Input: "今天午饭花了35块"
    - Output: Created transaction record
    """
    try:
        logger.info(f"Creating transaction: {request.input}")
        
        # Parse using Recording Agent
        context = {
            "current_time": datetime.now(),
            **(request.context or {})
        }
        
        parsed_transactions = await recording_agent.parse_transaction(
            request.input,
            context
        )
        
        # Create transaction records
        created_transactions = []
        
        for parsed in parsed_transactions:
            transaction = Transaction(
                amount=parsed["amount"],
                category=parsed["category"],
                subcategory=parsed.get("subcategory"),
                transaction_date=parsed["transaction_date"],
                transaction_time=parsed.get("transaction_time"),
                description=parsed.get("description"),
                confidence_score=parsed.get("confidence"),
                is_confirmed=not parsed.get("requires_confirmation", False),
            )
            
            db.add(transaction)
            await db.flush()  # Flush to get ID
            created_transactions.append(transaction)
        
        await db.commit()
        
        # Generate response message
        if len(created_transactions) == 1:
            trans = created_transactions[0]
            message = f"已记录：{trans.category}"
            if trans.subcategory:
                message += f" - {trans.subcategory}"
            message += f"，{trans.amount}元"
        else:
            message = f"已记录{len(created_transactions)}笔消费"
        
        return TransactionListResponse(
            transactions=[TransactionResponse(**t.to_dict()) for t in created_transactions],
            total=len(created_transactions),
            message=message
        )
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to create transaction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("", response_model=TransactionListResponse)
async def list_transactions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """
    List transactions with optional filters
    
    Query params:
    - start_date: Filter by start date (YYYY-MM-DD)
    - end_date: Filter by end date (YYYY-MM-DD)
    - category: Filter by category
    - limit: Number of results (default: 100)
    - offset: Offset for pagination (default: 0)
    """
    try:
        # Build query
        query = select(Transaction).where(Transaction.deleted_at.is_(None))
        
        # Apply filters
        if start_date:
            query = query.where(Transaction.transaction_date >= start_date)
        if end_date:
            query = query.where(Transaction.transaction_date <= end_date)
        if category:
            query = query.where(Transaction.category == category)
        
        # Order by date
        query = query.order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
        
        # Apply pagination
        query = query.limit(limit).offset(offset)
        
        # Execute query
        result = await db.execute(query)
        transactions = result.scalars().all()
        
        # Get total count
        count_query = select(func.count(Transaction.id)).where(Transaction.deleted_at.is_(None))
        if start_date:
            count_query = count_query.where(Transaction.transaction_date >= start_date)
        if end_date:
            count_query = count_query.where(Transaction.transaction_date <= end_date)
        if category:
            count_query = count_query.where(Transaction.category == category)
        
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        return TransactionListResponse(
            transactions=[TransactionResponse(**t.to_dict()) for t in transactions],
            total=total,
            message=f"查询到{len(transactions)}笔交易"
        )
        
    except Exception as e:
        logger.error(f"Failed to list transactions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get transaction by ID"""
    try:
        query = select(Transaction).where(Transaction.id == transaction_id)
        result = await db.execute(query)
        transaction = result.scalar_one_or_none()
        
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        
        return TransactionResponse(**transaction.to_dict())
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get transaction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete transaction (soft delete)"""
    try:
        query = select(Transaction).where(Transaction.id == transaction_id)
        result = await db.execute(query)
        transaction = result.scalar_one_or_none()
        
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        
        # Soft delete
        transaction.deleted_at = datetime.now()
        await db.commit()
        
        return {"message": "Transaction deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to delete transaction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
