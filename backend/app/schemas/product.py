from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.models.common import PyObjectId

StockStatus = Literal["in_stock", "low_stock", "critical", "out_of_stock"]


class ProductResponse(BaseModel):
    id: PyObjectId
    sku: str
    name: str
    description: Optional[str] = None
    category: str = "general"
    price: float
    cost: float = 0
    reorder_point: int = 10
    reorder_quantity: int = 50
    supplier: Optional[str] = None
    location: Optional[str] = None
    current_stock: int = 0
    reserved_stock: int = 0
    available_stock: int = 0
    stock_status: StockStatus = "in_stock"
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(arbitrary_types_allowed=True)


class StockAdjustment(BaseModel):
    product_id: str
    quantity: int
    reason: str = Field(default="manual_adjustment", max_length=100)
    reference: Optional[str] = Field(default=None, max_length=100)

    @field_validator("quantity")
    @classmethod
    def quantity_not_zero(cls, v: int) -> int:
        if v == 0:
            raise ValueError("quantity must not be zero")
        return v


class ReserveRequest(BaseModel):
    product_id: str
    quantity: int = Field(..., gt=0)
    reference: str = Field(default="order", max_length=100)


class ReleaseRequest(BaseModel):
    product_id: str
    quantity: int = Field(..., gt=0)
    reference: str = Field(default="cancel", max_length=100)
