"""FastAPI dependency injection providers.

Provides singleton instances of services and managers for dependency injection,
following the Dependency Inversion Principle.
"""

from functools import lru_cache

from app.repositories.mock_session import MockSessionRepository
from app.services.session_service import SessionService
from app.websocket.manager import ConnectionManager


@lru_cache
def get_repository() -> MockSessionRepository:
    """Get singleton instance of session repository.

    Returns:
        MockSessionRepository instance.

    Note:
        Replace MockSessionRepository with a real database repository
        for production deployments.
    """
    return MockSessionRepository()


@lru_cache
def get_connection_manager() -> ConnectionManager:
    """Get singleton instance of WebSocket connection manager.

    Returns:
        ConnectionManager instance for handling WebSocket connections.
    """
    return ConnectionManager()


def get_session_service() -> SessionService:
    """Get session service with injected repository.

    Returns:
        SessionService configured with the repository.
    """
    return SessionService(get_repository())
