import re
from typing import Optional
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.product import ProductInDB, ProductCreate, ProductUpdate
from app.schemas.product import ProductResponse, StockStatus
from app.schemas.common import Page
from app.core.config import settings
from app.core.exceptions import ConflictError, NotFoundError
from app.services.alert_service import AlertService

SORTABLE_FIELDS = {"sku", "name", "category", "price", "current_stock", "available_stock", "created_at"}
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


class ProductService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.products = db.products
        self.inventory_logs = db.inventory_logs
        self.alerts_service = AlertService(db)

    async def create_product(self, data: ProductCreate) -> ProductResponse:
        existing = await self.products.find_one({"sku": data.sku})
        if existing:
            raise ConflictError(f"Product with SKU {data.sku} already exists")

        doc = ProductInDB(
            **data.model_dump(exclude={"initial_stock"}),
            current_stock=data.initial_stock,
            reserved_stock=0,
        )
        await self.products.insert_one(doc.model_dump(by_alias=True))

        if data.initial_stock > 0:
            await self._log_change(
                product=doc, change_type="in", quantity=data.initial_stock,
                reason="initial_stock", reference=None,
            )

        await self.alerts_service.refresh_alerts_for_product(doc)
        return self.to_response(doc)

    async def get_product(self, product_id: str) -> ProductResponse:
        doc = await self._get_doc(product_id)
        if not doc:
            raise NotFoundError("Product not found")
        return self.to_response(doc)

    async def get_product_by_sku(self, sku: str) -> ProductResponse:
        doc = await self.products.find_one({"sku": sku})
        if not doc:
            raise NotFoundError("Product not found")
        return self.to_response(ProductInDB(**doc))

    async def list_products(
        self,
        page: int = 1,
        page_size: int = DEFAULT_PAGE_SIZE,
        q: Optional[str] = None,
        category: Optional[str] = None,
        stock_status: Optional[str] = None,
        supplier: Optional[str] = None,
        location: Optional[str] = None,
        sort: str = "name",
        order: str = "asc",
    ) -> Page[ProductResponse]:
        page_size = max(1, min(page_size, MAX_PAGE_SIZE))
        page = max(1, page)

        query = self._build_query(
            category=category, supplier=supplier, location=location, stock_status=stock_status
        )
        if q:
            pattern = re.compile(re.escape(q), re.IGNORECASE)
            query["$or"] = [{"sku": pattern}, {"name": pattern}]

        sort_field = sort if sort in SORTABLE_FIELDS else "name"
        sort_dir = -1 if order == "desc" else 1

        cursor = (
            self.products.find(query)
            .sort(sort_field, sort_dir)
            .skip((page - 1) * page_size)
            .limit(page_size)
        )

        docs = [ProductInDB(**d) async for d in cursor]
        items = [self.to_response(d) for d in docs]
        total = await self.products.count_documents(query)
        pages = max(1, -(-total // page_size))

        return Page[ProductResponse](
            items=items, total=total, page=page, page_size=page_size, pages=pages
        )

    async def update_product(self, product_id: str, data: ProductUpdate) -> ProductResponse:
        doc = await self._get_doc(product_id)
        if not doc:
            raise NotFoundError("Product not found")

        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        if "sku" in update_data and update_data["sku"] != doc.sku:
            conflict = await self.products.find_one({"sku": update_data["sku"]})
            if conflict:
                raise ConflictError(f"Product with SKU {update_data['sku']} already exists")

        update_data["updated_at"] = datetime.utcnow()
        result = await self.products.find_one_and_update(
            {"_id": ObjectId(product_id)},
            {"$set": update_data},
            return_document=True,
        )
        updated = ProductInDB(**result)

        await self.alerts_service.refresh_alerts_for_product(updated)
        return self.to_response(updated)

    async def delete_product(self, product_id: str) -> None:
        doc = await self._get_doc(product_id)
        if not doc:
            raise NotFoundError("Product not found")

        await self.alerts_service.delete_product_alerts(ObjectId(product_id))
        await self.inventory_logs.delete_many({"product_id": ObjectId(product_id)})
        await self.products.delete_one({"_id": ObjectId(product_id)})

    async def adjust_stock(self, product_id: str, quantity: int, reason: str, reference: Optional[str]) -> ProductResponse:
        doc = await self._get_doc(product_id)
        if not doc:
            raise NotFoundError("Product not found")

        new_stock = doc.current_stock + quantity
        if new_stock < 0:
            from app.core.exceptions import InsufficientStockError
            raise InsufficientStockError(f"Insufficient stock: only {doc.current_stock} available, cannot apply {quantity}")

        await self.products.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": {"current_stock": new_stock, "updated_at": datetime.utcnow()}},
        )

        change_type = "in" if quantity > 0 else "out"
        await self._log_change(
            product=doc, change_type=change_type, quantity=abs(quantity),
            reason=reason, reference=reference,
            previous_stock=doc.current_stock, new_stock=new_stock,
        )

        updated = ProductInDB(**await self.products.find_one({"_id": ObjectId(product_id)}))
        await self.alerts_service.refresh_alerts_for_product(updated)
        return self.to_response(updated)

    async def reserve_stock(self, product_id: str, quantity: int, reference: str) -> ProductResponse:
        doc = await self._get_doc(product_id)
        if not doc:
            raise NotFoundError("Product not found")

        available = doc.current_stock - doc.reserved_stock
        if available < quantity:
            from app.core.exceptions import InsufficientStockError
            raise InsufficientStockError(f"Insufficient available stock: {available} available, {quantity} requested")

        await self.products.update_one(
            {"_id": ObjectId(product_id)},
            {"$inc": {"reserved_stock": quantity}, "$set": {"updated_at": datetime.utcnow()}},
        )
        await self._log_change(
            product=doc, change_type="reserve", quantity=quantity,
            reason="reserved", reference=reference,
        )
        return await self.get_product(product_id)

    async def release_stock(self, product_id: str, quantity: int, reference: str) -> ProductResponse:
        doc = await self._get_doc(product_id)
        if not doc:
            raise NotFoundError("Product not found")

        if doc.reserved_stock < quantity:
            from app.core.exceptions import InsufficientStockError
            raise InsufficientStockError(f"Cannot release {quantity} units: only {doc.reserved_stock} reserved")

        await self.products.update_one(
            {"_id": ObjectId(product_id)},
            {"$inc": {"reserved_stock": -quantity}, "$set": {"updated_at": datetime.utcnow()}},
        )
        await self._log_change(
            product=doc, change_type="release", quantity=quantity,
            reason="released", reference=reference,
        )
        return await self.get_product(product_id)

    async def get_logs(
        self,
        product_id: Optional[str] = None,
        change_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list:
        query = self._logs_query(product_id, change_type)
        cursor = (
            self.inventory_logs.find(query)
            .sort("timestamp", -1)
            .skip(skip)
            .limit(limit)
        )
        from app.models.inventory_log import InventoryLogInDB

        return [InventoryLogInDB(**doc) async for doc in cursor]

    async def count_logs(self, product_id: Optional[str] = None, change_type: Optional[str] = None) -> int:
        query = self._logs_query(product_id, change_type)
        return await self.inventory_logs.count_documents(query)

    def _logs_query(self, product_id: Optional[str], change_type: Optional[str]) -> dict:
        query: dict = {}
        if product_id and ObjectId.is_valid(product_id):
            query["product_id"] = ObjectId(product_id)
        if change_type:
            query["change_type"] = change_type
        return query

    async def categories(self) -> list[str]:
        return await self.products.distinct("category")

    async def seed_products(self, count: int = 100) -> int:
        existing = await self.products.count_documents({})
        if existing > 0:
            return existing

        docs = []
        for i in range(1, count + 1):
            sku = f"itemxxx{i:03d}"
            docs.append(
                ProductInDB(
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
                    reserved_stock=0,
                ).model_dump(by_alias=True)
            )

        await self.products.insert_many(docs)
        return count

    # ---- internal helpers ----

    async def _get_doc(self, product_id: str) -> Optional[ProductInDB]:
        if not ObjectId.is_valid(product_id):
            return None
        doc = await self.products.find_one({"_id": ObjectId(product_id)})
        return ProductInDB(**doc) if doc else None

    def _build_query(
        self,
        category: Optional[str],
        supplier: Optional[str],
        location: Optional[str],
        stock_status: Optional[str] = None,
    ) -> dict:
        query: dict = {}
        if category:
            query["category"] = category
        if supplier:
            query["supplier"] = supplier
        if location:
            query["location"] = location

        status_expr = self._stock_status_expr(stock_status)
        if status_expr:
            query["$expr"] = status_expr
        return query

    def _stock_status_expr(self, status: Optional[str]) -> Optional[dict]:
        available = {"$subtract": ["$current_stock", "$reserved_stock"]}
        if status == "out_of_stock":
            return {"$lte": [available, 0]}
        if status == "critical":
            return {
                "$and": [
                    {"$gt": [available, 0]},
                    {"$lte": [available, settings.CRITICAL_STOCK_THRESHOLD]},
                ]
            }
        if status == "low_stock":
            return {
                "$and": [
                    {"$gt": [available, settings.CRITICAL_STOCK_THRESHOLD]},
                    {"$lte": [available, "$reorder_point"]},
                ]
            }
        if status == "in_stock":
            return {"$gt": [available, "$reorder_point"]}
        return None

    def to_response(self, product: ProductInDB) -> ProductResponse:
        available = product.current_stock - product.reserved_stock
        status: StockStatus = self._stock_status(product, available)
        return ProductResponse(
            **product.model_dump(),
            available_stock=max(0, available),
            stock_status=status,
        )

    def _stock_status(self, product: ProductInDB, available: int) -> StockStatus:
        if available <= 0:
            return "out_of_stock"
        if available <= settings.CRITICAL_STOCK_THRESHOLD:
            return "critical"
        if available <= product.reorder_point:
            return "low_stock"
        return "in_stock"

    async def _log_change(
        self,
        product: ProductInDB,
        change_type: str,
        quantity: int,
        reason: str,
        reference: Optional[str],
        previous_stock: Optional[int] = None,
        new_stock: Optional[int] = None,
    ) -> None:
        from app.models.inventory_log import InventoryLogInDB

        if previous_stock is None:
            previous_stock = product.current_stock
        if new_stock is None:
            new_stock = product.current_stock + (quantity if change_type == "in" else -quantity)

        log = InventoryLogInDB(
            product_id=product.id,
            product_sku=product.sku,
            change_type=change_type,
            quantity=quantity,
            reason=reason,
            reference=reference,
            previous_stock=previous_stock,
            new_stock=new_stock,
        )
        await self.inventory_logs.insert_one(log.model_dump(by_alias=True))
