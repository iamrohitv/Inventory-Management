from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings


class Database:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None


db = Database()


async def connect_to_mongo():
    db.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db.db = db.client[settings.DATABASE_NAME]
    await create_indexes()


async def close_mongo_connection():
    if db.client:
        db.client.close()


async def get_database() -> AsyncIOMotorDatabase:
    return db.db


async def create_indexes():
    await db.db.products.create_index("sku", unique=True)
    await db.db.products.create_index("name")
    await db.db.inventory_logs.create_index("product_id")
    await db.db.inventory_logs.create_index("timestamp")
    await db.db.alerts.create_index("product_id")
    await db.db.alerts.create_index("created_at")
    await db.db.alerts.create_index("is_read")