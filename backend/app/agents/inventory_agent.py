import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any
from bson import ObjectId
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.config import settings
from app.core.database import get_database
from app.services.inventory_service import InventoryService
from app.models.inventory import AlertInDB, AlertCreate


class InventoryAgent:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.running = False
        self.db: AsyncIOMotorDatabase = None
        self.service: InventoryService = None

    async def start(self):
        if self.running:
            return

        self.db = await get_database()
        self.service = InventoryService(self.db)
        self.running = True

        self.scheduler.add_job(
            self.check_inventory,
            IntervalTrigger(minutes=settings.AGENT_CHECK_INTERVAL_MINUTES),
            id="inventory_check",
            replace_existing=True
        )
        self.scheduler.add_job(
            self.daily_summary,
            IntervalTrigger(hours=24),
            id="daily_summary",
            replace_existing=True
        )
        self.scheduler.add_job(
            self.cleanup_old_alerts,
            IntervalTrigger(hours=24),
            id="cleanup_alerts",
            replace_existing=True
        )

        self.scheduler.start()
        print(f"[InventoryAgent] Started - checking every {settings.AGENT_CHECK_INTERVAL_MINUTES} minutes")

        await self.check_inventory()

    async def stop(self):
        if not self.running:
            return
        self.scheduler.shutdown()
        self.running = False
        print("[InventoryAgent] Stopped")

    async def check_inventory(self):
        print(f"[InventoryAgent] Running inventory check at {datetime.utcnow()}")
        try:
            products = await self.service.list_products(limit=1000)
            alerts_created = 0

            for product in products:
                available = product.available_stock

                if available <= 0:
                    await self._create_alert(product, "out_of_stock", 0)
                    alerts_created += 1
                elif available <= settings.CRITICAL_STOCK_THRESHOLD:
                    await self._create_alert(product, "critical_stock", settings.CRITICAL_STOCK_THRESHOLD)
                    alerts_created += 1
                elif available <= product.reorder_point:
                    await self._create_alert(product, "low_stock", product.reorder_point)
                    alerts_created += 1
                elif available <= product.reorder_point + 5:
                    await self._create_alert(product, "reorder_needed", product.reorder_point)
                    alerts_created += 1

            print(f"[InventoryAgent] Check complete. {len(products)} products scanned, {alerts_created} alerts created")

        except Exception as e:
            print(f"[InventoryAgent] Error during inventory check: {e}")

    async def _create_alert(self, product, alert_type: str, threshold: int):
        existing = await self.db.alerts.find_one({
            "product_id": product.id,
            "alert_type": alert_type,
            "is_read": False
        })

        if existing:
            await self.db.alerts.update_one(
                {"_id": existing["_id"]},
                {"$set": {"current_stock": product.available_stock, "created_at": datetime.utcnow()}}
            )
            return

        messages = {
            "out_of_stock": f"🚨 OUT OF STOCK: {product.name} ({product.sku}) - 0 units available!",
            "critical_stock": f"🔴 CRITICAL: {product.name} ({product.sku}) - Only {product.available_stock} units left!",
            "low_stock": f"🟡 LOW STOCK: {product.name} ({product.sku}) - {product.available_stock} units (reorder at {product.reorder_point})",
            "reorder_needed": f"🔵 REORDER SOON: {product.name} ({product.sku}) - {product.available_stock} units, approaching reorder point"
        }

        alert = AlertInDB(
            product_id=product.id,
            product_sku=product.sku,
            product_name=product.name,
            alert_type=alert_type,
            message=messages.get(alert_type, f"Alert for {product.sku}"),
            current_stock=product.available_stock,
            threshold=threshold
        )

        await self.db.alerts.insert_one(alert.model_dump(by_alias=True))
        await self._send_notification(alert)

    async def _send_notification(self, alert: AlertInDB):
        print(f"[NOTIFICATION] {alert.message}")

        if settings.SMTP_HOST and settings.SMTP_USER and settings.ALERT_EMAIL:
            try:
                await self._send_email(alert)
            except Exception as e:
                print(f"[InventoryAgent] Failed to send email: {e}")

    async def _send_email(self, alert: AlertInDB):
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        msg = MIMEMultipart()
        msg["From"] = settings.SMTP_USER
        msg["To"] = settings.ALERT_EMAIL
        msg["Subject"] = f"Inventory Alert: {alert.alert_type.replace('_', ' ').title()} - {alert.product_sku}"

        body = f"""
        Inventory Alert Triggered

        Product: {alert.product_name} ({alert.product_sku})
        Alert Type: {alert.alert_type.replace('_', ' ').title()}
        Current Stock: {alert.current_stock}
        Threshold: {alert.threshold}
        Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC

        Message: {alert.message}

        Please check the inventory dashboard for more details.
        """

        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)

    async def daily_summary(self):
        print(f"[InventoryAgent] Generating daily summary at {datetime.utcnow()}")
        try:
            stats = await self.service.get_dashboard_stats()
            unread_alerts = await self.db.alerts.count_documents({"is_read": False})

            summary = f"""
            === DAILY INVENTORY SUMMARY ===
            Date: {datetime.utcnow().strftime('%Y-%m-%d')}
            Total Products: {stats.total_products}
            Low Stock: {stats.low_stock_count}
            Critical Stock: {stats.critical_stock_count}
            Out of Stock: {stats.out_of_stock_count}
            Total Inventory Value: ${stats.total_inventory_value:,.2f}
            Active Alerts: {unread_alerts}
            ================================
            """
            print(summary)

            if settings.SMTP_HOST and settings.SMTP_USER and settings.ALERT_EMAIL:
                await self._send_email(AlertInDB(
                    product_id=ObjectId(),
                    product_sku="SYSTEM",
                    product_name="Daily Summary",
                    alert_type="low_stock",
                    message=summary,
                    current_stock=0,
                    threshold=0
                ))

        except Exception as e:
            print(f"[InventoryAgent] Error generating daily summary: {e}")

    async def cleanup_old_alerts(self):
        cutoff = datetime.utcnow() - timedelta(days=30)
        result = await self.db.alerts.delete_many({
            "is_read": True,
            "acknowledged_at": {"$lt": cutoff}
        })
        print(f"[InventoryAgent] Cleaned up {result.deleted_count} old acknowledged alerts")

    async def force_check(self):
        await self.check_inventory()

    async def get_agent_status(self) -> Dict[str, Any]:
        return {
            "running": self.running,
            "check_interval_minutes": settings.AGENT_CHECK_INTERVAL_MINUTES,
            "next_check": self.scheduler.get_job("inventory_check").next_run_time.isoformat() if self.scheduler.get_job("inventory_check") else None,
            "jobs": [job.id for job in self.scheduler.get_jobs()]
        }


inventory_agent = InventoryAgent()