from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.common import PyObjectId


class InventoryLogResponse(BaseModel):
    id: PyObjectId
    product_id: PyObjectId
    product_sku: str
    change_type: str
    quantity: int
    reason: Optional[str] = None
    reference: Optional[str] = None
    previous_stock: int
    new_stock: int
    timestamp: datetime
    created_by: Optional[str] = "system"

    model_config = ConfigDict(arbitrary_types_allowed=True)
