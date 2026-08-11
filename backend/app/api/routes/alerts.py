from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.api.deps import get_alert_service
from app.schemas.alert import AlertResponse, AlertAcknowledgeRequest
from app.schemas.common import Page
from app.models.alert import AlertInDB
from app.services.alert_service import AlertService
from app.core.exceptions import NotFoundError

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=Page[AlertResponse])
async def list_alerts(
    unread_only: bool = Query(False),
    alert_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: AlertService = Depends(get_alert_service),
):
    skip = (page - 1) * page_size
    raw = await service.list_alerts(
        unread_only=unread_only, alert_type=alert_type, skip=skip, limit=page_size
    )
    items = [AlertResponse(**alert.model_dump()) for alert in raw]
    total = await service.count_alerts(unread_only=unread_only, alert_type=alert_type)
    return Page(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, -(-total // page_size)),
    )


@router.patch("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: str,
    payload: AlertAcknowledgeRequest = None,
    service: AlertService = Depends(get_alert_service),
):
    user = payload.user if payload else "user"
    alert = await service.acknowledge_alert(alert_id, user)
    if not alert:
        raise NotFoundError("Alert not found")
    return AlertResponse(**alert.model_dump())
