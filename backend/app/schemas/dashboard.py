from typing import List
from pydantic import BaseModel


class CategoryCount(BaseModel):
    category: str
    count: int


class DashboardStats(BaseModel):
    total_products: int
    low_stock_count: int
    critical_stock_count: int
    out_of_stock_count: int
    total_inventory_value: float
    total_alerts: int
    unread_alerts: int
    categories: List[CategoryCount] = []
