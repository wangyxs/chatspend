from fastapi import APIRouter
from .transactions import router as transactions_router
from .multimodal import router as multimodal_router

api_router = APIRouter()

# Include all route modules
api_router.include_router(transactions_router, tags=["transactions"])
api_router.include_router(multimodal_router, tags=["multimodal"])

__all__ = ["api_router"]
