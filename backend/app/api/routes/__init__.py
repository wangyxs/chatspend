from fastapi import APIRouter
from .transactions import router as transactions_router

api_router = APIRouter()

# Include all route modules
api_router.include_router(transactions_router, prefix="/transactions", tags=["transactions"])

__all__ = ["api_router"]
