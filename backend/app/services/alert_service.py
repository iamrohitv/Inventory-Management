from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.alert import AlertInDB, AlertType
from app.models.product import ProductInDB
from app.core.config import settings
from app.core.exceptions import NotFoundError


class AlertService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.alerts = db.alerts

    async def list_alerts(
        self,
        unread_only: bool = False,
        alert_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[AlertInDB]:
        query: dict = {}
        if unread_only:
            query["is_read"] = False
        if alert_type:
            query["alert_type"] = alert_type

        cursor = self.alerts.find(query).sort("created_at", -1).skip(skip).limit(limit)
        return [AlertInDB(**doc) async for doc in cursor]

    async def count_alerts(self, unread_only: bool = False, alert_type: Optional[str] = None) -> int:
        query: dict = {}
        if unread_only:
            query["is_read"] = False
        if alert_type:
            query["alert_type"] = alert_type
        return await self.alerts.count_documents(query)

    async def acknowledge_alert(self, alert_id: str, user: str = "user") -> Optional[AlertInDB]:
        if not ObjectId.is_valid(alert_id):
            return None
        result = await self.alerts.find_one_and_update(
            {"_id": ObjectId(alert_id)},
            {
                "$set": {
                    "is_read": True,
                    "acknowledged_at": datetime.utcnow(),
                    "acknowledged_by": user,
                }
            },
            return_document=True,
        )
        return AlertInDB(**result) if result else None

    async def delete_product_alerts(self, product_id: ObjectId) -> int:
        result = await self.alerts.delete_many({"product_id": product_id})
        return result.deleted_count

    async def clean_expired(self, days: int = 30) -> int:
        cutoff = datetime.utcnow() - timedelta(days=days)
        result = await self.alerts.delete_many(
            {"is_read": True, "acknowledged_at": {"$lt": cutoff}}
        )
        return result.deleted_count

    async def refresh_alerts_for_product(self, product: ProductInDB) -> None:
        """Synchronize open alerts with the product's current availability."""
        available = product.current_stock - product.reserved_stock
        spec = self._alert_spec(product, available)

        await self.alerts.update_many(
            {"product_id": product.id, "is_read": False},
            {"$set": {"is_read": True, "acknowledged_at": datetime.utcnow(), "acknowledged_by": "system_auto"}},
        )

        if spec:
            await self._upsert_alert(product, spec, available)

    def _alert_spec(self, product: ProductInDB, available: int) -> Optional[tuple[AlertType, str, int]]:
        if available <= 0:
            return (
                "out_of_stock",
                f"OUT OF STOCK: {product.name} ({product.sku}) - 0 units available",
                0,
            )
        if available <= settings.CRITICAL_STOCK_THRESHOLD:
            return (
                "critical_stock",
                f"CRITICAL: {product.name} ({product.sku}) - only {available} units left",
                settings.CRITICAL_STOCK_THRESHOLD,
            )
        if available <= product.reorder_point:
            return (
                "low_stock",
                f"LOW STOCK: {product.name} ({product.sku}) - {available} units (reorder point: {product.reorder_point})",
                product.reorder_point,
            )
        if available <= product.reorder_point + settings.REORDER_NEARBY_MARGIN:
            return (
                "reorder_needed",
                f"REORDER SOON: {product.name} ({product.sku}) approaching reorder point ({available}/{product.reorder_point})",
                product.reorder_point,
            )
        return None

    async def _upsert_alert(self, product: ProductInDB, spec: tuple[AlertType, str, int], available: int) -> None:
        alert_type, message, threshold = spec
        existing = await self.alerts.find_one(
            {"product_id": product.id, "alert_type": alert_type, "is_read": False}
        )
        if existing:
            await self.alerts.update_one(
                {"_id": existing["_id"]},
                {"$set": {"current_stock": available, "created_at": datetime.utcnow()}},
            )
            return

        alert = AlertInDB(
            product_id=product.id,
            product_sku=product.sku,
            product_name=product.name,
            alert_type=alert_type,
            message=message,
            current_stock=available,
            threshold=threshold,
        )
        await self.alerts.insert_one(alert.model_dump(by_alias=True))
