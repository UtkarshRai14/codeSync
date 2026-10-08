"""FastAPI application entry point.

Configures the FastAPI application with CORS, security headers,
and mounts API routes and WebSocket endpoints.
"""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

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
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
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


def resolve_static_file(static_dir: Path, requested_path: str) -> Path | None:
    """Resolve a requested path to a file inside the static directory.

    Args:
        static_dir: Resolved root directory of the built frontend.
        requested_path: URL path requested by the client.

    Returns:
        The file path if it exists inside ``static_dir``, otherwise None.
        Paths escaping the directory (e.g. ``../`` or absolute) are rejected.
    """
    try:
        file_path = (static_dir / requested_path).resolve()
    except ValueError:  # e.g. an embedded null byte
        return None
    if file_path.is_relative_to(static_dir) and file_path.is_file():
        return file_path
    return None


# Serve the built frontend (SPA) when present (production/Docker image)
STATIC_DIR = (Path(__file__).parent / "static").resolve()
if STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str) -> FileResponse:
        """Serve a static file if it exists, otherwise the SPA entry point."""
        file_path = resolve_static_file(STATIC_DIR, full_path)
        return FileResponse(file_path or STATIC_DIR / "index.html")
