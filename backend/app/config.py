"""Application configuration module.

Provides centralized configuration management using Pydantic Settings
for type-safe environment variable handling.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    Attributes:
        app_name: Name of the application.
        debug: Enable debug mode for development.
        cors_origins: List of allowed CORS origins.
        websocket_heartbeat_interval: Interval in seconds for WebSocket heartbeats.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_name: str = "CodeSync"
    debug: bool = False
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    websocket_heartbeat_interval: int = 30


settings = Settings()
