from motor.motor_asyncio import AsyncIOMotorDatabase
from app.schemas.dashboard import DashboardStats, CategoryCount
from app.core.config import settings


class DashboardService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.products = db.products
        self.alerts = db.alerts

    async def get_stats(self) -> DashboardStats:
        total_products = await self.products.count_documents({})

        counts_pipeline = [
            {
                "$group": {
                    "_id": None,
                    "low_stock": {
                        "$sum": {
                            "$cond": [
                                {
                                    "$and": [
                                        {"$lte": [{"$subtract": ["$current_stock", "$reserved_stock"]}, "$reorder_point"]},
                                        {"$gt": [{"$subtract": ["$current_stock", "$reserved_stock"]}, 0]},
                                    ]
                                },
                                1,
                                0,
                            ]
                        }
                    },
                    "critical_stock": {
                        "$sum": {
                            "$cond": [
                                {
                                    "$and": [
                                        {"$lte": [{"$subtract": ["$current_stock", "$reserved_stock"]}, settings.CRITICAL_STOCK_THRESHOLD]},
                                        {"$gt": [{"$subtract": ["$current_stock", "$reserved_stock"]}, 0]},
                                    ]
                                },
                                1,
                                0,
                            ]
                        }
                    },
                    "out_of_stock": {
                        "$sum": {"$cond": [{"$lte": [{"$subtract": ["$current_stock", "$reserved_stock"]}, 0]}, 1, 0]}
                    },
                    "total_value": {"$sum": {"$multiply": ["$current_stock", "$price"]}},
                }
            },
        ]
        counts = await self.products.aggregate(counts_pipeline).to_list(1)
        c = counts[0] if counts else {}

        categories_pipeline = [
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10},
        ]
        category_docs = await self.products.aggregate(categories_pipeline).to_list(10)
        categories = [
            CategoryCount(category=doc["_id"] or "general", count=doc["count"])
            for doc in category_docs
        ]

        total_alerts = await self.alerts.count_documents({})
        unread_alerts = await self.alerts.count_documents({"is_read": False})

        return DashboardStats(
            total_products=total_products,
            low_stock_count=c.get("low_stock", 0),
            critical_stock_count=c.get("critical_stock", 0),
            out_of_stock_count=c.get("out_of_stock", 0),
            total_inventory_value=c.get("total_value", 0),
            total_alerts=total_alerts,
            unread_alerts=unread_alerts,
            categories=categories,
        )
