from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings


class Database:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None


db = Database()


async def connect_to_mongo() -> None:
    db.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db.db = db.client[settings.DATABASE_NAME]
    await create_indexes()


async def close_mongo_connection() -> None:
    if db.client:
        db.client.close()


async def get_database() -> AsyncIOMotorDatabase:
    return db.db


async def create_indexes() -> None:
    products = db.db.products
    await products.create_index("sku", unique=True)
    await products.create_index("name")
    await products.create_index("category")
    await products.create_index("supplier")
    await products.create_index("location")

    logs = db.db.inventory_logs
    await logs.create_index("product_id")
    await logs.create_index("timestamp", background=True)
    await logs.create_index("change_type")

    alerts = db.db.alerts
    await alerts.create_index("product_id")
    await alerts.create_index("created_at", background=True)
    await alerts.create_index("is_read")
    await alerts.create_index("alert_type")
