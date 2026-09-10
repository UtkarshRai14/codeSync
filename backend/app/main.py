"""FastAPI application entry point.

Configures the FastAPI application with CORS, security headers,
and mounts API routes and WebSocket endpoints.
"""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import settings
from app.websocket.handler import websocket_endpoint

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler for startup and shutdown events.

    Args:
        app: The FastAPI application instance.

    Yields:
        None during application runtime.
    """
    logger.info("Starting %s", settings.app_name)
    yield
    logger.info("Shutting down %s", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    description="Real-time collaborative coding platform API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS (OWASP A05: Security Misconfiguration)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


# Security headers middleware (OWASP best practices)
@app.middleware("http")
async def add_security_headers(request, call_next):
    """Add security headers to all HTTP responses.

    Args:
        request: Incoming HTTP request.
        call_next: Next middleware/handler in chain.

    Returns:
        Response with security headers added.
    """
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# Mount REST API routes
app.include_router(router)


# WebSocket endpoint
@app.websocket("/ws/{session_id}")
async def websocket_route(websocket: WebSocket, session_id: str) -> None:
    """WebSocket endpoint for real-time session collaboration.

    Args:
        websocket: The WebSocket connection.
        session_id: ID of the session to join.
    """
    await websocket_endpoint(websocket, session_id)


# Health check endpoint
@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    """Health check endpoint for monitoring.

    Returns:
        Status indicating the service is healthy.
    """
    return {"status": "healthy"}


# Mount static files (SPA)
import os

from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Only mount if static directory exists (production/docker)
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(static_dir):
    # Mount assets (JS/CSS/Images)
    assets_dir = os.path.join(static_dir, "assets")
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    # Serve index.html for all other routes (SPA fallback)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve SPA frontend for all non-API routes."""
        # Allow API and WebSocket to pass through (handled above)
        # Note: If a file exists in root of static (e.g. favicon.ico), serve it
        file_path = os.path.join(static_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)

        # Fallback to index.html
        return FileResponse(os.path.join(static_dir, "index.html"))
