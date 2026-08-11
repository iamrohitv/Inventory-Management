async def test_alerts_created_on_low_stock(client):
    await client.post(
        "/api/v1/products",
        json={"sku": "low1", "name": "Low Stock Item", "price": 5.0, "initial_stock": 2, "reorder_point": 10},
    )
    res = await client.get("/api/v1/alerts?unread_only=true")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert data["items"][0]["alert_type"] in {"low_stock", "critical_stock"}


async def test_acknowledge_alert(client):
    await client.post(
        "/api/v1/products",
        json={"sku": "ack1", "name": "Ack Item", "price": 5.0, "initial_stock": 1, "reorder_point": 10},
    )
    alerts = (await client.get("/api/v1/alerts?unread_only=true")).json()["items"]
    alert_id = alerts[0]["id"]

    res = await client.patch(f"/api/v1/alerts/{alert_id}/acknowledge", json={"user": "tester"})
    assert res.status_code == 200
    assert res.json()["is_read"] is True
    assert res.json()["acknowledged_by"] == "tester"


async def test_acknowledge_missing_alert(client):
    res = await client.patch("/api/v1/alerts/000000000000000000000000/acknowledge", json={"user": "tester"})
    assert res.status_code == 404


async def test_alert_type_filter(client):
    await client.post(
        "/api/v1/products",
        json={"sku": "ftr1", "name": "Filter Item", "price": 5.0, "initial_stock": 1, "reorder_point": 10},
    )
    res = await client.get("/api/v1/alerts?alert_type=critical_stock")
    data = res.json()
    assert data["total"] >= 1
    assert all(a["alert_type"] == "critical_stock" for a in data["items"])
