from fastapi import APIRouter, Depends
from app.api.deps import get_dashboard_service
from app.schemas.dashboard import DashboardStats
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_stats(service: DashboardService = Depends(get_dashboard_service)):
    return await service.get_stats()
