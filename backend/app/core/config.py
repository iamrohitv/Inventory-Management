from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "ecommerce_inventory"
    APP_NAME: str = "E-Commerce Inventory Manager"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    AGENT_CHECK_INTERVAL_MINUTES: int = 5
    LOW_STOCK_THRESHOLD: int = 10
    CRITICAL_STOCK_THRESHOLD: int = 3

    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    ALERT_EMAIL: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
    )


settings = Settings()