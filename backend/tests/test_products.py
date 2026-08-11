async def test_create_product(client):
    res = await client.post(
        "/api/v1/products",
        json={
            "sku": "abc123",
            "name": "Widget",
            "category": "home",
            "price": 19.99,
            "initial_stock": 5,
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["sku"] == "abc123"
    assert data["current_stock"] == 5
    assert data["available_stock"] == 5
    assert data["stock_status"] in {"in_stock", "low_stock"}


async def test_create_duplicate_sku_conflicts(client):
    payload = {"sku": "dup", "name": "A", "price": 1.0}
    assert (await client.post("/api/v1/products", json=payload)).status_code == 201
    res = await client.post("/api/v1/products", json=payload)
    assert res.status_code == 409
    assert "already exists" in res.json()["detail"]


async def test_create_product_missing_fields(client):
    res = await client.post("/api/v1/products", json={"sku": "x"})
    assert res.status_code == 422


async def test_list_products_pagination(seeded_client):
    res = await seeded_client.get("/api/v1/products?page=1&page_size=5")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 10
    assert data["page_size"] == 5
    assert data["pages"] == 2
    assert len(data["items"]) == 5


async def test_list_products_search(seeded_client):
    res = await seeded_client.get("/api/v1/products?q=item005")
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["sku"] == "item005"


async def test_list_products_filter_by_category(seeded_client):
    res = await seeded_client.get("/api/v1/products?category=electronics")
    data = res.json()
    assert data["total"] == 10


async def test_list_products_sort_desc(seeded_client):
    res = await seeded_client.get("/api/v1/products?sort=price&order=desc")
    data = res.json()
    prices = [p["price"] for p in data["items"]]
    assert prices == sorted(prices, reverse=True)


async def test_get_product_by_id(client):
    created = (await client.post(
        "/api/v1/products", json={"sku": "get1", "name": "Get Me", "price": 5}
    )).json()
    res = await client.get(f"/api/v1/products/{created['id']}")
    assert res.status_code == 200
    assert res.json()["sku"] == "get1"


async def test_get_product_not_found(client):
    res = await client.get("/api/v1/products/000000000000000000000000")
    assert res.status_code == 404


async def test_update_product(client):
    created = (await client.post(
        "/api/v1/products", json={"sku": "upd", "name": "Old", "price": 5}
    )).json()
    res = await client.patch(
        f"/api/v1/products/{created['id']}", json={"name": "New", "price": 15}
    )
    assert res.status_code == 200
    assert res.json()["name"] == "New"
    assert res.json()["price"] == 15


async def test_delete_product(client):
    created = (await client.post(
        "/api/v1/products", json={"sku": "del", "name": "Delete Me", "price": 5}
    )).json()
    res = await client.delete(f"/api/v1/products/{created['id']}")
    assert res.status_code == 204
    assert (await client.get(f"/api/v1/products/{created['id']}")).status_code == 404


async def test_categories_endpoint(seeded_client):
    res = await seeded_client.get("/api/v1/products/categories")
    assert res.status_code == 200
    assert "electronics" in res.json()
