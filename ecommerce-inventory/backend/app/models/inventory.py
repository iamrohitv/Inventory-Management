from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any
from datetime import datetime
from bson import ObjectId
from pydantic_core import core_schema


class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type: Any, handler) -> core_schema.CoreSchema:
        return core_schema.with_info_plain_validator_function(
            cls.validate,
            serialization=core_schema.to_string_ser_schema(),
        )

    @classmethod
    def validate(cls, v: Any) -> ObjectId:
        if isinstance(v, ObjectId):
            return v
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)


class ProductBase(BaseModel):
    sku: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    category: str = Field(default="general")
    price: float = Field(..., ge=0)
    cost: float = Field(default=0, ge=0)
    reorder_point: int = Field(default=10, ge=0)
    reorder_quantity: int = Field(default=50, ge=1)
    supplier: Optional[str] = None
    location: Optional[str] = None


class ProductCreate(ProductBase):
    initial_stock: int = Field(default=0, ge=0)


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    cost: Optional[float] = Field(None, ge=0)
    reorder_point: Optional[int] = Field(None, ge=0)
    reorder_quantity: Optional[int] = Field(None, ge=1)
    supplier: Optional[str] = None
    location: Optional[str] = None


class ProductInDB(ProductBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    current_stock: int = Field(default=0, ge=0)
    reserved_stock: int = Field(default=0, ge=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )


class ProductResponse(ProductInDB):
    available_stock: int = 0
    stock_status: str = "in_stock"

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )


class InventoryLogBase(BaseModel):
    product_id: PyObjectId
    product_sku: str
    change_type: str = Field(..., pattern="^(in|out|adjustment|reserve|release)$")
    quantity: int
    reason: Optional[str] = None
    reference: Optional[str] = None


class InventoryLogCreate(InventoryLogBase):
    pass


class InventoryLogInDB(InventoryLogBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    previous_stock: int
    new_stock: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = "system"

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )


class AlertBase(BaseModel):
    product_id: PyObjectId
    product_sku: str
    product_name: str
    alert_type: str = Field(..., pattern="^(low_stock|critical_stock|out_of_stock|reorder_needed)$")
    message: str
    current_stock: int
    threshold: int


class AlertCreate(AlertBase):
    pass


class AlertInDB(AlertBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )


class AlertResponse(AlertInDB):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )


class StockAdjustment(BaseModel):
    product_id: str
    quantity: int
    reason: str = "manual_adjustment"
    reference: Optional[str] = None


class DashboardStats(BaseModel):
    total_products: int
    low_stock_count: int
    critical_stock_count: int
    out_of_stock_count: int
    total_inventory_value: float
    total_alerts: int
    unread_alerts: int