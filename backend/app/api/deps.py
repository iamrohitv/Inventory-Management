from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_database
from app.services.product_service import ProductService
from app.services.alert_service import AlertService
from app.services.dashboard_service import DashboardService


async def get_db() -> AsyncIOMotorDatabase:
    return await get_database()


async def get_product_service() -> ProductService:
    return ProductService(await get_database())


async def get_alert_service() -> AlertService:
    return AlertService(await get_database())


async def get_dashboard_service() -> DashboardService:
    return DashboardService(await get_database())
