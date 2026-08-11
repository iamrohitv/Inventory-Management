from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List


class Settings(BaseSettings):
    APP_NAME: str = "StockPilot Inventory API"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = True

    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "ecommerce_inventory"

    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    AGENT_CHECK_INTERVAL_MINUTES: int = 5
    LOW_STOCK_THRESHOLD: int = 10
    CRITICAL_STOCK_THRESHOLD: int = 3
    REORDER_NEARBY_MARGIN: int = 5

    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    ALERT_EMAIL: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
