from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from bson import ObjectId
from app.models.inventory import (
    ProductCreate, ProductUpdate, ProductResponse,
    InventoryLogInDB, StockAdjustment,
    AlertInDB, DashboardStats
)
from app.services.inventory_service import InventoryService
from app.core.database import get_database
from app.agents.inventory_agent import inventory_agent


router = APIRouter()


async def get_inventory_service() -> InventoryService:
    db = await get_database()
    return InventoryService(db)


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product: ProductCreate,
    service: InventoryService = Depends(get_inventory_service)
):
    try:
        return await service.create_product(product)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/products", response_model=List[ProductResponse])
async def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    category: Optional[str] = None,
    stock_status: Optional[str] = None,
    service: InventoryService = Depends(get_inventory_service)
):
    return await service.list_products(skip, limit, category, stock_status)


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    service: InventoryService = Depends(get_inventory_service)
):
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
    product = await service.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return service._to_response(product)


@router.get("/products/sku/{sku}", response_model=ProductResponse)
async def get_product_by_sku(
    sku: str,
    service: InventoryService = Depends(get_inventory_service)
):
    product = await service.get_product_by_sku(sku)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return service._to_response(product)


@router.patch("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    update: ProductUpdate,
    service: InventoryService = Depends(get_inventory_service)
):
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
    product = await service.update_product(product_id, update)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return service._to_response(product)


@router.post("/products/seed")
async def seed_products(
    count: int = Query(100, ge=1, le=1000),
    service: InventoryService = Depends(get_inventory_service)
):
    created = await service.seed_products(count)
    return {"message": f"Seeded {created} products", "count": created}


@router.post("/inventory/adjust", response_model=ProductResponse)
async def adjust_stock(
    adjustment: StockAdjustment,
    service: InventoryService = Depends(get_inventory_service)
):
    try:
        product = await service.adjust_stock(adjustment)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return service._to_response(product)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/inventory/reserve")
async def reserve_stock(
    product_id: str,
    quantity: int = Query(..., gt=0),
    reference: str = "order",
    service: InventoryService = Depends(get_inventory_service)
):
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
    success = await service.reserve_stock(product_id, quantity, reference)
    if not success:
        raise HTTPException(status_code=400, detail="Insufficient available stock or product not found")
    return {"message": f"Reserved {quantity} units", "success": True}


@router.post("/inventory/release")
async def release_stock(
    product_id: str,
    quantity: int = Query(..., gt=0),
    reference: str = "cancel",
    service: InventoryService = Depends(get_inventory_service)
):
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
    success = await service.release_stock(product_id, quantity, reference)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot release more than reserved or product not found")
    return {"message": f"Released {quantity} units", "success": True}


@router.get("/inventory/logs", response_model=List[InventoryLogInDB])
async def get_inventory_logs(
    product_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    service: InventoryService = Depends(get_inventory_service)
):
    return await service.get_inventory_logs(product_id, skip, limit)


@router.get("/alerts", response_model=List[AlertInDB])
async def get_alerts(
    unread_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    service: InventoryService = Depends(get_inventory_service)
):
    return await service.get_alerts(unread_only, skip, limit)


@router.patch("/alerts/{alert_id}/acknowledge", response_model=AlertInDB)
async def acknowledge_alert(
    alert_id: str,
    user: str = "user",
    service: InventoryService = Depends(get_inventory_service)
):
    if not ObjectId.is_valid(alert_id):
        raise HTTPException(status_code=400, detail="Invalid alert ID")
    alert = await service.acknowledge_alert(alert_id, user)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    service: InventoryService = Depends(get_inventory_service)
):
    return await service.get_dashboard_stats()


@router.get("/agent/status")
async def get_agent_status():
    return await inventory_agent.get_agent_status()


@router.post("/agent/check")
async def force_agent_check():
    await inventory_agent.force_check()
    return {"message": "Inventory check triggered", "success": True}