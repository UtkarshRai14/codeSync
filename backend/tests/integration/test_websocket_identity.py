"""Integration tests for WebSocket identity persistence."""

import pytest
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient

from app.api.dependencies import get_connection_manager, get_repository
from app.main import app


class TestWebSocketIdentity:
    """Tests for WebSocket identity persistence."""

    @pytest.fixture(autouse=True)
    def reset_dependencies(self) -> None:
        """Reset cached dependencies before each test."""
        get_repository.cache_clear()
        get_connection_manager.cache_clear()

    @pytest.fixture
    def sync_client(self) -> TestClient:
        """Provide a synchronous test client for WebSocket testing."""
        return TestClient(app)

    @pytest.fixture
    async def async_client(self) -> AsyncClient:
        """Provide an async HTTP client for session creation."""
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as ac:
            yield ac

    async def test_connect_with_name(
        self, sync_client: TestClient, async_client: AsyncClient
    ) -> None:
        """Test connecting with a custom name."""
        response = await async_client.post("/api/sessions", json={})
        session_id = response.json()["id"]

        custom_name = "Alice"
        url = f"/ws/{session_id}?name={custom_name}"

        with sync_client.websocket_connect(url) as websocket:
            data = websocket.receive_json()
            payload = data["payload"]

            assert payload["participant_name"] == custom_name
            assert "participant_id" in payload

    async def test_connect_with_participant_id(
        self, sync_client: TestClient, async_client: AsyncClient
    ) -> None:
        """Test connecting with an existing participant ID."""
        response = await async_client.post("/api/sessions", json={})
        session_id = response.json()["id"]

        custom_id = "user-123"
        url = f"/ws/{session_id}?participant_id={custom_id}"

        with sync_client.websocket_connect(url) as websocket:
            data = websocket.receive_json()
            payload = data["payload"]

            assert payload["participant_id"] == custom_id

    async def test_resume_session_identity(
        self, sync_client: TestClient, async_client: AsyncClient
    ) -> None:
        """Test resuming a session with the same identity."""
        response = await async_client.post("/api/sessions", json={})
        session_id = response.json()["id"]

        # 1. First connection to get an ID
        participant_id = ""
        name = "Bob"

        with sync_client.websocket_connect(f"/ws/{session_id}?name={name}") as ws1:
            data = ws1.receive_json()
            participant_id = data["payload"]["participant_id"]
            assert data["payload"]["participant_name"] == name

        # 2. Reconnect with the same ID
        url = f"/ws/{session_id}?participant_id={participant_id}&name={name}"
        with sync_client.websocket_connect(url) as ws2:
            data = ws2.receive_json()
            payload = data["payload"]

            assert payload["participant_id"] == participant_id
            assert payload["participant_name"] == name

    async def test_connect_without_params_defaults(
        self, sync_client: TestClient, async_client: AsyncClient
    ) -> None:
        """Test default behavior (User X) when no params provided."""
        response = await async_client.post("/api/sessions", json={})
        session_id = response.json()["id"]

        with sync_client.websocket_connect(f"/ws/{session_id}") as websocket:
            data = websocket.receive_json()
            payload = data["payload"]

            assert payload["participant_name"].startswith("User")
            assert "participant_id" in payload
