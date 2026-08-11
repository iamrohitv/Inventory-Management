from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models.common import PyObjectId

AlertType = Literal["low_stock", "critical_stock", "out_of_stock", "reorder_needed"]


class AlertInDB(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    product_id: PyObjectId
    product_sku: str
    product_name: str
    alert_type: AlertType
    message: str
    current_stock: int
    threshold: int
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
