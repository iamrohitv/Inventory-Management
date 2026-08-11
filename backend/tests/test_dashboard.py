async def test_dashboard_stats(seeded_client):
    res = await seeded_client.get("/api/v1/dashboard/stats")
    assert res.status_code == 200
    data = res.json()
    assert data["total_products"] == 10
    assert data["total_inventory_value"] > 0
    assert isinstance(data["categories"], list)
    assert data["categories"][0]["category"] == "electronics"
