from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict
from app.models.common import PyObjectId


class InventoryLogInDB(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    product_id: PyObjectId
    product_sku: str
    change_type: Literal["in", "out", "adjustment", "reserve", "release"]
    quantity: int
    reason: Optional[str] = None
    reference: Optional[str] = None
    previous_stock: int
    new_stock: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = "system"

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
