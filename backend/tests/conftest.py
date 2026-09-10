"""Test fixtures and configuration for pytest."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.dependencies import get_connection_manager, get_repository
from app.main import app
from app.repositories.mock_session import MockSessionRepository
from app.websocket.manager import ConnectionManager


@pytest.fixture
def repository() -> MockSessionRepository:
    """Provide a fresh mock repository for each test.

    Returns:
        Clean MockSessionRepository instance.
    """
    repo = MockSessionRepository()
    return repo


@pytest.fixture
def connection_manager() -> ConnectionManager:
    """Provide a fresh connection manager for each test.

    Returns:
        Clean ConnectionManager instance.
    """
    return ConnectionManager()


@pytest.fixture
async def client(repository: MockSessionRepository) -> AsyncClient:
    """Provide an async HTTP client for API testing.

    Args:
        repository: Injected mock repository.

    Yields:
        AsyncClient configured for the test app.
    """
    # Override the repository dependency
    get_repository.cache_clear()
    get_connection_manager.cache_clear()

    # Create a test-specific app with the test repository
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    # Clear caches after test
    get_repository.cache_clear()
    get_connection_manager.cache_clear()
