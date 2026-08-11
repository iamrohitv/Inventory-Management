from datetime import datetime
from typing import Any, Dict
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.config import settings
from app.core.database import get_database
from app.services.product_service import ProductService
from app.services.alert_service import AlertService
from app.services.dashboard_service import DashboardService


class InventoryAgent:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.running = False
        self.db: AsyncIOMotorDatabase = None
        self.product_service: ProductService = None
        self.alert_service: AlertService = None
        self.dashboard_service: DashboardService = None

    async def start(self) -> None:
        if self.running:
            return

        self.db = await get_database()
        self.product_service = ProductService(self.db)
        self.alert_service = AlertService(self.db)
        self.dashboard_service = DashboardService(self.db)
        self.running = True

        self.scheduler.add_job(
            self.check_inventory,
            IntervalTrigger(minutes=settings.AGENT_CHECK_INTERVAL_MINUTES),
            id="inventory_check",
            replace_existing=True,
        )
        self.scheduler.add_job(
            self.daily_summary,
            IntervalTrigger(hours=24),
            id="daily_summary",
            replace_existing=True,
        )
        self.scheduler.add_job(
            self.cleanup_old_alerts,
            IntervalTrigger(hours=24),
            id="cleanup_alerts",
            replace_existing=True,
        )

        self.scheduler.start()
        print(f"[InventoryAgent] Started - checking every {settings.AGENT_CHECK_INTERVAL_MINUTES} minutes")

        await self.check_inventory()

    async def stop(self) -> None:
        if not self.running:
            return
        self.scheduler.shutdown(wait=False)
        self.running = False
        print("[InventoryAgent] Stopped")

    async def check_inventory(self) -> None:
        print(f"[InventoryAgent] Running inventory check at {datetime.utcnow()}")
        try:
            page = await self.product_service.list_products(
                page=1, page_size=100, sort="sku", order="asc"
            )
            for product in page.items:
                await self.alert_service.refresh_alerts_for_product(product)
            print(f"[InventoryAgent] Check complete. {page.total} products scanned")
        except Exception as e:
            print(f"[InventoryAgent] Error during inventory check: {e}")

    async def daily_summary(self) -> None:
        print(f"[InventoryAgent] Generating daily summary at {datetime.utcnow()}")
        try:
            stats = await self.dashboard_service.get_stats()
            summary = (
                f"=== DAILY INVENTORY SUMMARY ===\n"
                f"Date: {datetime.utcnow().strftime('%Y-%m-%d')}\n"
                f"Total Products: {stats.total_products}\n"
                f"Low Stock: {stats.low_stock_count}\n"
                f"Critical Stock: {stats.critical_stock_count}\n"
                f"Out of Stock: {stats.out_of_stock_count}\n"
                f"Total Inventory Value: ${stats.total_inventory_value:,.2f}\n"
                f"Active Alerts: {stats.unread_alerts}\n"
                f"================================"
            )
            print(summary)
        except Exception as e:
            print(f"[InventoryAgent] Error generating daily summary: {e}")

    async def cleanup_old_alerts(self) -> None:
        deleted = await self.alert_service.clean_expired(days=30)
        print(f"[InventoryAgent] Cleaned up {deleted} old acknowledged alerts")

    async def force_check(self) -> None:
        await self.check_inventory()

    async def get_agent_status(self) -> Dict[str, Any]:
        job = self.scheduler.get_job("inventory_check")
        return {
            "running": self.running,
            "check_interval_minutes": settings.AGENT_CHECK_INTERVAL_MINUTES,
            "next_check": job.next_run_time.isoformat() if job else None,
            "jobs": [j.id for j in self.scheduler.get_jobs()],
            "last_check": datetime.utcnow().isoformat(),
        }


inventory_agent = InventoryAgent()
