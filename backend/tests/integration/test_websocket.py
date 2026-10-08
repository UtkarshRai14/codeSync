"""Integration tests for WebSocket functionality."""

import pytest
from httpx import ASGITransport, AsyncClient
from starlette.testclient import TestClient

from app.api.dependencies import get_connection_manager, get_repository
from app.main import app
from app.models.session import MessageType


class TestWebSocketConnection:
    """Tests for WebSocket connection handling."""

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

    async def test_websocket_connect_to_valid_session(
        self, sync_client: TestClient, async_client: AsyncClient
    ) -> None:
        """Test WebSocket connection to a valid session."""
        # Create a session first
        response = await async_client.post("/api/sessions", json={})
        session_id = response.json()["id"]

        # Connect via WebSocket
        with sync_client.websocket_connect(f"/ws/{session_id}") as websocket:
            # Should receive initial sync message
            data = websocket.receive_json()
            assert data["type"] == MessageType.SYNC_RESPONSE.value
            assert "payload" in data
            assert data["payload"]["session_id"] == session_id

    async def test_websocket_connect_to_invalid_session(
        self, sync_client: TestClient
    ) -> None:
        """Test WebSocket connection to a non-existent session."""
        with pytest.raises(Exception):
            # Connection should be rejected
            with sync_client.websocket_connect("/ws/nonexistent"):
                pass

    async def test_websocket_receives_participant_info(
        self, sync_client: TestClient, async_client: AsyncClient
    ) -> None:
        """Test that connecting client receives their participant info."""
        response = await async_client.post("/api/sessions", json={})
        session_id = response.json()["id"]

        with sync_client.websocket_connect(f"/ws/{session_id}") as websocket:
            data = websocket.receive_json()
            payload = data["payload"]

            assert "participant_id" in payload
            assert "participant_name" in payload
            assert "participant_color" in payload
            assert payload["participant_name"].startswith("User ")


class TestWebSocketMessaging:
    """Tests for WebSocket message handling."""

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
        """Provide an async HTTP client."""
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as ac:
            yield ac

    async def test_code_update_persists(
        self, sync_client: TestClient, async_client: AsyncClient
    ) -> None:
        """Test that code updates are persisted to session."""
        response = await async_client.post("/api/sessions", json={})
        session_id = response.json()["id"]

        with sync_client.websocket_connect(f"/ws/{session_id}") as websocket:
            # Receive initial sync
            websocket.receive_json()

            # Send code update
            websocket.send_json(
                {
                    "type": MessageType.CODE_UPDATE.value,
                    "payload": {"code": "print('updated')"},
                }
            )

        # Verify code was persisted
        get_response = await async_client.get(f"/api/sessions/{session_id}")
        assert get_response.json()["code"] == "print('updated')"

    async def test_language_change_persists(
        self, sync_client: TestClient, async_client: AsyncClient
    ) -> None:
        """Test that language changes are persisted."""
        response = await async_client.post("/api/sessions", json={"language": "python"})
        session_id = response.json()["id"]

        with sync_client.websocket_connect(f"/ws/{session_id}") as websocket:
            websocket.receive_json()

            websocket.send_json(
                {
                    "type": MessageType.LANGUAGE_CHANGE.value,
                    "payload": {"language": "javascript"},
                }
            )

        get_response = await async_client.get(f"/api/sessions/{session_id}")
        assert get_response.json()["language"] == "javascript"

    async def test_name_change_broadcast(
        self, sync_client: TestClient, async_client: AsyncClient
    ) -> None:
        """Test that name changes are processed and broadcast."""
        response = await async_client.post("/api/sessions", json={})
        session_id = response.json()["id"]

        with sync_client.websocket_connect(f"/ws/{session_id}") as websocket:
            initial = websocket.receive_json()  # Initial sync
            my_id = initial["payload"]["participant_id"]

            # Send name change
            new_name = "New Name"
            websocket.send_json(
                {
                    "type": MessageType.NAME_CHANGE.value,
                    "payload": {"name": new_name},
                }
            )

            # Receive broadcast (sender also receives it)
            response = websocket.receive_json()
            assert response["type"] == MessageType.NAME_CHANGE.value
            assert response["payload"]["name"] == new_name

            # Verify persistence via SYNC_REQUEST
            websocket.send_json(
                {
                    "type": MessageType.SYNC_REQUEST.value,
                }
            )

            # Should receive SYNC_RESPONSE
            response = websocket.receive_json()
            assert response["type"] == MessageType.SYNC_RESPONSE.value

            # Find self in participants list
            participants = response["payload"]["participants"]
            me = next(p for p in participants if p["id"] == my_id)
            assert me["name"] == new_name


class TestWebSocketBroadcast:
    """Tests for WebSocket broadcast functionality."""

    @pytest.fixture(autouse=True)
    def reset_dependencies(self) -> None:
        """Reset cached dependencies before each test."""
        get_repository.cache_clear()
        get_connection_manager.cache_clear()

    @pytest.fixture
    def sync_client(self) -> TestClient:
        """Provide a synchronous test client."""
        return TestClient(app)

    @pytest.fixture
    async def async_client(self) -> AsyncClient:
        """Provide an async HTTP client."""
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as ac:
            yield ac

    async def test_user_joined_broadcast(
        self, sync_client: TestClient, async_client: AsyncClient
    ) -> None:
        """Test that user joined is broadcast to existing participants."""
        response = await async_client.post("/api/sessions", json={})
        session_id = response.json()["id"]

        # First user connects
        with sync_client.websocket_connect(f"/ws/{session_id}") as ws1:
            ws1.receive_json()  # Initial sync

            # Second user connects (in a separate thread would send broadcast)
            # For this sync test, we verify the connection works
            with sync_client.websocket_connect(f"/ws/{session_id}") as ws2:
                data = ws2.receive_json()
                assert data["type"] == MessageType.SYNC_RESPONSE.value


class TestConnectionManager:
    """Tests for ConnectionManager functionality."""

    @pytest.fixture
    def manager(self):
        """Provide a fresh ConnectionManager."""
        from app.websocket.manager import ConnectionManager

        return ConnectionManager()

    def test_get_participant_count_empty(self, manager) -> None:
        """Test participant count for empty session."""
        count = manager.get_participant_count("empty")
        assert count == 0

    def test_get_session_participants_empty(self, manager) -> None:
        """Test getting participants for empty session."""
        participants = manager.get_session_participants("empty")
        assert participants == []

    def test_disconnect_nonexistent(self, manager) -> None:
        """Test disconnecting from non-existent session doesn't error."""
        assert manager.disconnect("nonexistent", "user1", object()) is False

    async def test_stale_disconnect_does_not_remove_replacement(self, manager) -> None:
        """An old connection must not remove a participant's replacement socket."""
        from unittest.mock import AsyncMock

        websocket1 = type("WebSocketStub", (), {"accept": AsyncMock()})()
        websocket2 = type("WebSocketStub", (), {"accept": AsyncMock()})()

        await manager.connect(websocket1, "session", "user1")
        await manager.connect(websocket2, "session", "user1")

        assert manager.active_connections["session"]["user1"] is websocket2
        assert manager.disconnect("session", "user1", websocket1) is False
        assert manager.active_connections["session"]["user1"] is websocket2
        assert manager.disconnect("session", "user1", websocket2) is True
        assert manager.get_participant_count("session") == 0

    async def test_broadcast_survives_participant_joining_mid_send(
        self, manager
    ) -> None:
        """A participant joining while a broadcast is awaiting must not break it."""
        from unittest.mock import AsyncMock

        late_joiner = type("WebSocketStub", (), {"accept": AsyncMock()})()

        async def send_and_trigger_join(_message: str) -> None:
            await manager.connect(late_joiner, "session", "late")

        websocket = type(
            "WebSocketStub",
            (),
            {
                "accept": AsyncMock(),
                "send_text": AsyncMock(side_effect=send_and_trigger_join),
            },
        )()
        await manager.connect(websocket, "session", "user1")

        await manager.broadcast("session", {"type": "code_update"})

        websocket.send_text.assert_awaited_once()
        assert manager.get_session_participants("session") == ["user1", "late"]
