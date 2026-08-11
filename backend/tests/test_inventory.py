async def make_product(client, sku="inv1", stock=20):
    res = await client.post(
        "/api/v1/products",
        json={"sku": sku, "name": "Inventory Product", "price": 10.0, "initial_stock": stock},
    )
    return res.json()


async def test_adjust_stock_positive(client):
    p = await make_product(client)
    res = await client.post(
        "/api/v1/inventory/adjust",
        json={"product_id": p["id"], "quantity": 5, "reason": "restock"},
    )
    assert res.status_code == 200
    assert res.json()["current_stock"] == 25


async def test_adjust_stock_negative(client):
    p = await make_product(client)
    res = await client.post(
        "/api/v1/inventory/adjust",
        json={"product_id": p["id"], "quantity": -3, "reason": "sale"},
    )
    assert res.status_code == 200
    assert res.json()["current_stock"] == 17


async def test_adjust_stock_insufficient(client):
    p = await make_product(client, stock=2)
    res = await client.post(
        "/api/v1/inventory/adjust",
        json={"product_id": p["id"], "quantity": -5, "reason": "sale"},
    )
    assert res.status_code == 400
    assert "Insufficient" in res.json()["detail"]


async def test_adjust_stock_zero_quantity_rejected(client):
    p = await make_product(client)
    res = await client.post(
        "/api/v1/inventory/adjust",
        json={"product_id": p["id"], "quantity": 0, "reason": "sale"},
    )
    assert res.status_code == 422


async def test_reserve_and_release(client):
    p = await make_product(client, stock=10)
    res = await client.post(
        "/api/v1/inventory/reserve",
        json={"product_id": p["id"], "quantity": 4, "reference": "order-1"},
    )
    assert res.status_code == 200
    assert res.json()["reserved_stock"] == 4
    assert res.json()["available_stock"] == 6

    res = await client.post(
        "/api/v1/inventory/release",
        json={"product_id": p["id"], "quantity": 2, "reference": "cancel-1"},
    )
    assert res.status_code == 200
    assert res.json()["reserved_stock"] == 2


async def test_reserve_insufficient_stock(client):
    p = await make_product(client, stock=3)
    res = await client.post(
        "/api/v1/inventory/reserve",
        json={"product_id": p["id"], "quantity": 10},
    )
    assert res.status_code == 400


async def test_release_more_than_reserved(client):
    p = await make_product(client, stock=10)
    res = await client.post(
        "/api/v1/inventory/release",
        json={"product_id": p["id"], "quantity": 5},
    )
    assert res.status_code == 400


async def test_inventory_logs(client):
    p = await make_product(client, stock=10)
    await client.post("/api/v1/inventory/adjust", json={"product_id": p["id"], "quantity": 5, "reason": "restock"})
    res = await client.get(f"/api/v1/inventory/logs?product_id={p['id']}")
    assert res.status_code == 200
    assert res.json()["total"] == 2
    types = {l["change_type"] for l in res.json()["items"]}
    assert {"in", "in"} <= types
