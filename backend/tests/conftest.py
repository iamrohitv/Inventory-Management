import pytest_asyncio
from mongomock_motor import AsyncMongoMockClient
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.api import deps
from app.services.product_service import ProductService
from app.services.alert_service import AlertService
from app.services.dashboard_service import DashboardService

TEST_DB = "inventory_test"


@pytest_asyncio.fixture
async def db():
    client = AsyncMongoMockClient()
    test_db = client[TEST_DB]
    names = await test_db.list_collection_names()
    for name in names:
        await test_db.drop_collection(name)
    yield test_db
    names = await test_db.list_collection_names()
    for name in names:
        await test_db.drop_collection(name)


@pytest_asyncio.fixture
async def client(db):
    async def override_products():
        return ProductService(db)

    async def override_alerts():
        return AlertService(db)

    async def override_dashboard():
        return DashboardService(db)

    app.dependency_overrides[deps.get_product_service] = override_products
    app.dependency_overrides[deps.get_alert_service] = override_alerts
    app.dependency_overrides[deps.get_dashboard_service] = override_dashboard

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def seeded_client(client):
    """Client with 10 seeded products."""
    payload = {
        "sku": "item001",
        "name": "Test Product 1",
        "category": "electronics",
        "price": 99.99,
        "cost": 50.0,
        "initial_stock": 25,
        "reorder_point": 10,
        "supplier": "Supplier 1",
        "location": "Warehouse 1",
    }
    for i in range(1, 11):
        p = dict(payload, sku=f"item{i:03d}", name=f"Test Product {i}", price=99.99 + i)
        await client.post("/api/v1/products", json=p)
    return client
