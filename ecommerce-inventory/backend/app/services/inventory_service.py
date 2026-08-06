from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.inventory import (
    ProductInDB, ProductCreate, ProductUpdate, ProductResponse,
    InventoryLogInDB, InventoryLogCreate, AlertInDB, AlertCreate,
    DashboardStats, StockAdjustment
)
from app.core.config import settings


class InventoryService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.products = db.products
        self.inventory_logs = db.inventory_logs
        self.alerts = db.alerts

    async def create_product(self, product: ProductCreate) -> ProductInDB:
        existing = await self.products.find_one({"sku": product.sku})
        if existing:
            raise ValueError(f"Product with SKU {product.sku} already exists")

        product_doc = ProductInDB(
            **product.model_dump(exclude={"initial_stock"}),
            current_stock=product.initial_stock,
            reserved_stock=0
        )
        await self.products.insert_one(product_doc.model_dump(by_alias=True))

        if product.initial_stock > 0:
            await self._log_inventory_change(
                product_doc.id, product_doc.sku,
                "in", product.initial_stock,
                "initial_stock", "system"
            )

        return product_doc

    async def get_product(self, product_id: str) -> Optional[ProductInDB]:
        if not ObjectId.is_valid(product_id):
            return None
        doc = await self.products.find_one({"_id": ObjectId(product_id)})
        return ProductInDB(**doc) if doc else None

    async def get_product_by_sku(self, sku: str) -> Optional[ProductInDB]:
        doc = await self.products.find_one({"sku": sku})
        return ProductInDB(**doc) if doc else None

    async def list_products(
        self, skip: int = 0, limit: int = 100,
        category: Optional[str] = None,
        stock_status: Optional[str] = None
    ) -> List[ProductResponse]:
        query = {}
        if category:
            query["category"] = category

        cursor = self.products.find(query).skip(skip).limit(limit).sort("name", 1)
        products = []
        async for doc in cursor:
            product = ProductInDB(**doc)
            products.append(self._to_response(product))
        return products

    async def update_product(self, product_id: str, update: ProductUpdate) -> Optional[ProductInDB]:
        if not ObjectId.is_valid(product_id):
            return None

        update_data = {k: v for k, v in update.model_dump().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()

        result = await self.products.find_one_and_update(
            {"_id": ObjectId(product_id)},
            {"$set": update_data},
            return_document=True
        )
        return ProductInDB(**result) if result else None

    async def adjust_stock(self, adjustment: StockAdjustment) -> Optional[ProductInDB]:
        if not ObjectId.is_valid(adjustment.product_id):
            return None

        product = await self.get_product(adjustment.product_id)
        if not product:
            return None

        new_stock = product.current_stock + adjustment.quantity
        if new_stock < 0:
            raise ValueError("Insufficient stock")

        change_type = "in" if adjustment.quantity > 0 else "out"

        await self.products.update_one(
            {"_id": ObjectId(adjustment.product_id)},
            {"$set": {"current_stock": new_stock, "updated_at": datetime.utcnow}}
        )

        await self._log_inventory_change(
            product.id, product.sku,
            change_type, abs(adjustment.quantity),
            adjustment.reason, adjustment.reference
        )

        updated = await self.get_product(adjustment.product_id)
        await self._check_and_create_alerts(updated)
        return updated

    async def reserve_stock(self, product_id: str, quantity: int, reference: str = "order") -> bool:
        if not ObjectId.is_valid(product_id):
            return False

        product = await self.get_product(product_id)
        if not product or product.available_stock < quantity:
            return False

        await self.products.update_one(
            {"_id": ObjectId(product_id)},
            {"$inc": {"reserved_stock": quantity}, "$set": {"updated_at": datetime.utcnow}}
        )

        await self._log_inventory_change(
            product.id, product.sku, "reserve", quantity, "reserved", reference
        )
        return True

    async def release_stock(self, product_id: str, quantity: int, reference: str = "cancel") -> bool:
        if not ObjectId.is_valid(product_id):
            return False

        product = await self.get_product(product_id)
        if not product or product.reserved_stock < quantity:
            return False

        await self.products.update_one(
            {"_id": ObjectId(product_id)},
            {"$inc": {"reserved_stock": -quantity}, "$set": {"updated_at": datetime.utcnow}}
        )

        await self._log_inventory_change(
            product.id, product.sku, "release", quantity, "released", reference
        )
        return True

    async def get_inventory_logs(
        self, product_id: Optional[str] = None,
        skip: int = 0, limit: int = 100
    ) -> List[InventoryLogInDB]:
        query = {}
        if product_id and ObjectId.is_valid(product_id):
            query["product_id"] = ObjectId(product_id)

        cursor = self.inventory_logs.find(query).skip(skip).limit(limit).sort("timestamp", -1)
        return [InventoryLogInDB(**doc) async for doc in cursor]

    async def get_alerts(
        self, unread_only: bool = False,
        skip: int = 0, limit: int = 100
    ) -> List[AlertInDB]:
        query = {"is_read": False} if unread_only else {}
        cursor = self.alerts.find(query).skip(skip).limit(limit).sort("created_at", -1)
        return [AlertInDB(**doc) async for doc in cursor]

    async def acknowledge_alert(self, alert_id: str, user: str = "system") -> Optional[AlertInDB]:
        if not ObjectId.is_valid(alert_id):
            return None

        result = await self.alerts.find_one_and_update(
            {"_id": ObjectId(alert_id)},
            {"$set": {"is_read": True, "acknowledged_at": datetime.utcnow(), "acknowledged_by": user}},
            return_document=True
        )
        return AlertInDB(**result) if result else None

    async def get_dashboard_stats(self) -> DashboardStats:
        total_products = await self.products.count_documents({})

        pipeline = [
            {"$project": {
                "available": {"$subtract": ["$current_stock", "$reserved_stock"]},
                "current_stock": 1,
                "reorder_point": 1,
                "price": 1
            }},
            {"$group": {
                "_id": None,
                "low_stock": {"$sum": {
                    "$cond": [
                        {"$and": [
                            {"$lte": ["$available", "$reorder_point"]},
                            {"$gt": ["$available", 0]}
                        ]},
                        1,
                        0
                    ]
                }},
                "critical_stock": {"$sum": {
                    "$cond": [
                        {"$and": [
                            {"$lte": ["$available", 3]},
                            {"$gt": ["$available", 0]}
                        ]},
                        1,
                        0
                    ]
                }},
                "out_of_stock": {"$sum": {
                    "$cond": [
                        {"$lte": ["$available", 0]},
                        1,
                        0
                    ]
                }},
                "total_value": {"$sum": {"$multiply": ["$current_stock", "$price"]}}
            }}
        ]
        agg = await self.products.aggregate(pipeline).to_list(1)
        stats = agg[0] if agg else {"low_stock": 0, "critical_stock": 0, "out_of_stock": 0, "total_value": 0}

        total_alerts = await self.alerts.count_documents({})
        unread_alerts = await self.alerts.count_documents({"is_read": False})

        return DashboardStats(
            total_products=total_products,
            low_stock_count=stats["low_stock"],
            critical_stock_count=stats["critical_stock"],
            out_of_stock_count=stats["out_of_stock"],
            total_inventory_value=stats["total_value"],
            total_alerts=total_alerts,
            unread_alerts=unread_alerts
        )

    async def seed_products(self, count: int = 100) -> int:
        existing = await self.products.count_documents({})
        if existing > 0:
            return existing

        products = []
        for i in range(1, count + 1):
            sku = f"itemxxx{i:03d}"
            product = ProductInDB(
                sku=sku,
                name=f"Product {sku.upper()}",
                description=f"Description for {sku}",
                category="electronics" if i % 3 == 0 else "clothing" if i % 3 == 1 else "home",
                price=round(10 + (i * 1.5) % 500, 2),
                cost=round(5 + (i * 0.8) % 200, 2),
                reorder_point=10,
                reorder_quantity=50,
                supplier=f"Supplier {(i % 5) + 1}",
                location=f"Warehouse {(i % 3) + 1}",
                current_stock=(i * 7) % 100,
                reserved_stock=0
            )
            products.append(product.model_dump(by_alias=True))

        await self.products.insert_many(products)

        for p in products:
            if p["current_stock"] > 0:
                await self._log_inventory_change(
                    p["_id"], p["sku"], "in", p["current_stock"],
                    "initial_seed", "system"
                )

        return count

    def _to_response(self, product: ProductInDB) -> ProductResponse:
        available = product.current_stock - product.reserved_stock
        if available <= 0:
            status = "out_of_stock"
        elif available <= settings.CRITICAL_STOCK_THRESHOLD:
            status = "critical"
        elif available <= product.reorder_point:
            status = "low_stock"
        else:
            status = "in_stock"

        return ProductResponse(
            **product.model_dump(),
            available_stock=max(0, available),
            stock_status=status
        )

    async def _log_inventory_change(
        self, product_id: ObjectId, product_sku: str,
        change_type: str, quantity: int,
        reason: str, reference: Optional[str]
    ):
        product = await self.get_product(str(product_id))
        if not product:
            return

        new_stock = product.current_stock
        if change_type == "in":
            previous_stock = new_stock - quantity
        elif change_type == "out":
            previous_stock = new_stock + quantity
        else:
            previous_stock = new_stock

        log = InventoryLogInDB(
            product_id=product_id,
            product_sku=product_sku,
            change_type=change_type,
            quantity=quantity,
            reason=reason,
            reference=reference,
            previous_stock=previous_stock,
            new_stock=new_stock
        )
        await self.inventory_logs.insert_one(log.model_dump(by_alias=True))

    async def _check_and_create_alerts(self, product: ProductInDB):
        available = product.current_stock - product.reserved_stock

        existing_alert = await self.alerts.find_one({
            "product_id": product.id,
            "is_read": False,
            "alert_type": {"$in": ["low_stock", "critical_stock", "out_of_stock", "reorder_needed"]}
        })

        alert_type = None
        message = ""
        threshold = 0

        if available <= 0:
            alert_type = "out_of_stock"
            message = f"Product {product.name} ({product.sku}) is OUT OF STOCK"
            threshold = 0
        elif available <= settings.CRITICAL_STOCK_THRESHOLD:
            alert_type = "critical_stock"
            message = f"CRITICAL: {product.name} ({product.sku}) has only {available} units left"
            threshold = settings.CRITICAL_STOCK_THRESHOLD
        elif available <= product.reorder_point:
            alert_type = "low_stock"
            message = f"LOW STOCK: {product.name} ({product.sku}) has {available} units (reorder point: {product.reorder_point})"
            threshold = product.reorder_point
        elif available <= product.reorder_point + 5:
            alert_type = "reorder_needed"
            message = f"REORDER SOON: {product.name} ({product.sku}) approaching reorder point ({available}/{product.reorder_point})"
            threshold = product.reorder_point

        if alert_type and not existing_alert:
            alert = AlertInDB(
                product_id=product.id,
                product_sku=product.sku,
                product_name=product.name,
                alert_type=alert_type,
                message=message,
                current_stock=available,
                threshold=threshold
            )
            await self.alerts.insert_one(alert.model_dump(by_alias=True))
        elif not alert_type and existing_alert:
            await self.alerts.update_one(
                {"_id": existing_alert["_id"]},
                {"$set": {"is_read": True, "acknowledged_at": datetime.utcnow(), "acknowledged_by": "system_auto"}}
            )