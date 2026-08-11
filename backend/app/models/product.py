from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models.common import PyObjectId


class ProductBase(BaseModel):
    sku: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    category: str = Field(default="general", max_length=50)
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
    category: Optional[str] = Field(None, max_length=50)
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

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
