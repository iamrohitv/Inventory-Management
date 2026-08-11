from fastapi import APIRouter, Depends, Query, HTTPException
from app.api.deps import get_product_service
from app.models.product import ProductCreate, ProductUpdate
from app.schemas.common import Page
from app.schemas.product import ProductResponse
from app.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["products"])


@router.post("", response_model=ProductResponse, status_code=201)
async def create_product(
    payload: ProductCreate,
    service: ProductService = Depends(get_product_service),
):
    return await service.create_product(payload)


@router.get("", response_model=Page[ProductResponse])
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str = Query(None, description="Search by SKU or name"),
    category: str = Query(None),
    stock_status: str = Query(None),
    supplier: str = Query(None),
    location: str = Query(None),
    sort: str = Query("name"),
    order: str = Query("asc", pattern="^(asc|desc)$"),
    service: ProductService = Depends(get_product_service),
):
    return await service.list_products(
        page=page,
        page_size=page_size,
        q=q,
        category=category,
        stock_status=stock_status,
        supplier=supplier,
        location=location,
        sort=sort,
        order=order,
    )


@router.get("/categories", response_model=list[str])
async def list_categories(service: ProductService = Depends(get_product_service)):
    return await service.categories()


@router.get("/sku/{sku}", response_model=ProductResponse)
async def get_product_by_sku(
    sku: str,
    service: ProductService = Depends(get_product_service),
):
    return await service.get_product_by_sku(sku)


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    service: ProductService = Depends(get_product_service),
):
    return await service.get_product(product_id)


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    payload: ProductUpdate,
    service: ProductService = Depends(get_product_service),
):
    return await service.update_product(product_id, payload)


@router.delete("/{product_id}", status_code=204)
async def delete_product(
    product_id: str,
    service: ProductService = Depends(get_product_service),
):
    await service.delete_product(product_id)


@router.post("/seed")
async def seed_products(
    count: int = Query(100, ge=1, le=1000),
    service: ProductService = Depends(get_product_service),
):
    created = await service.seed_products(count)
    return {"message": f"Seeded {created} products", "count": created}
