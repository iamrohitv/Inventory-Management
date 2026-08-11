from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.api.deps import get_product_service
from app.schemas.product import ProductResponse, StockAdjustment, ReserveRequest, ReleaseRequest
from app.schemas.common import Page
from app.schemas.inventory_log import InventoryLogResponse
from app.models.inventory_log import InventoryLogInDB
from app.services.product_service import ProductService

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.post("/adjust", response_model=ProductResponse)
async def adjust_stock(
    payload: StockAdjustment,
    service: ProductService = Depends(get_product_service),
):
    return await service.adjust_stock(
        payload.product_id, payload.quantity, payload.reason, payload.reference
    )


@router.post("/reserve", response_model=ProductResponse)
async def reserve_stock(
    payload: ReserveRequest,
    service: ProductService = Depends(get_product_service),
):
    return await service.reserve_stock(payload.product_id, payload.quantity, payload.reference)


@router.post("/release", response_model=ProductResponse)
async def release_stock(
    payload: ReleaseRequest,
    service: ProductService = Depends(get_product_service),
):
    return await service.release_stock(payload.product_id, payload.quantity, payload.reference)


@router.get("/logs", response_model=Page[InventoryLogResponse])
async def get_inventory_logs(
    product_id: Optional[str] = Query(None),
    change_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: ProductService = Depends(get_product_service),
):
    skip = (page - 1) * page_size
    raw = await service.get_logs(
        product_id=product_id, change_type=change_type, skip=skip, limit=page_size
    )
    items = [InventoryLogResponse(**log.model_dump()) for log in raw]
    total = await service.count_logs(product_id=product_id, change_type=change_type)
    return Page(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, -(-total // page_size)),
    )
