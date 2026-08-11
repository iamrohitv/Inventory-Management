from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models.alert import AlertType
from app.models.common import PyObjectId


class AlertResponse(BaseModel):
    id: PyObjectId
    product_id: PyObjectId
    product_sku: str
    product_name: str
    alert_type: AlertType
    message: str
    current_stock: int
    threshold: int
    is_read: bool = False
    created_at: datetime
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None

    model_config = ConfigDict(arbitrary_types_allowed=True)


class AlertAcknowledgeRequest(BaseModel):
    user: Optional[str] = Field(default="user", max_length=100)
