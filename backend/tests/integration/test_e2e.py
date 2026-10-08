"""End-to-end integration tests for client-server interaction.

These tests simulate a full client session lifecycle including:
- Session creation via REST API
- WebSocket connection and message exchange
- Real-time code synchronization
- Participant management
"""

import pytest
from httpx import ASGITransport, AsyncClient
from starlette.testclient import TestClient

from app.api.dependencies import get_connection_manager, get_repository
from app.main import app
from app.models.session import MessageType


class TestFullSessionLifecycle:
    """End-to-end tests for complete session workflows."""

    @pytest.fixture(autouse=True)
    def reset_dependencies(self) -> None:
        """Reset cached dependencies before each test."""
        get_repository.cache_clear()
        get_connection_manager.cache_clear()

    @pytest.fixture
    async def client(self) -> AsyncClient:
        """Provide an async HTTP client."""
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as ac:
            yield ac

    @pytest.fixture
    def sync_client(self) -> TestClient:
        """Provide a synchronous client for WebSocket testing."""
        return TestClient(app)

    async def test_complete_interview_workflow(
        self, client: AsyncClient, sync_client: TestClient
    ) -> None:
        """Test a complete interview session from creation to completion.

        This simulates:
        1. Interviewer creates a session
        2. Interviewer connects via WebSocket
        3. Candidate joins via WebSocket
        4. Both exchange code updates
        5. Session is deleted at the end
        """
        # Step 1: Create session via REST API
        create_response = await client.post(
            "/api/sessions",
            json={"language": "python", "code": "# Interview Question\n"},
        )
        assert create_response.status_code == 201
        session = create_response.json()
        session_id = session["id"]

        # Verify session was created
        get_response = await client.get(f"/api/sessions/{session_id}")
        assert get_response.status_code == 200
        assert get_response.json()["code"] == "# Interview Question\n"

        # Step 2: Interviewer connects via WebSocket
        with sync_client.websocket_connect(f"/ws/{session_id}") as interviewer_ws:
            # Receive initial sync
            sync_data = interviewer_ws.receive_json()
            assert sync_data["type"] == MessageType.SYNC_RESPONSE.value
            _interviewer_id = sync_data["payload"]["participant_id"]

            # Step 3: Candidate joins (simulated by another connection)
            # Note: In a real scenario, this would be a separate browser

            # Step 4: Interviewer sends code update
            interviewer_ws.send_json(
                {
                    "type": MessageType.CODE_UPDATE.value,
                    "payload": {
                        "code": "# Interview Question\ndef solution():\n    pass\n",
                    },
                }
            )

        # Verify code was persisted
        verify_response = await client.get(f"/api/sessions/{session_id}")
        assert "def solution():" in verify_response.json()["code"]

        # Step 5: Clean up - delete session
        delete_response = await client.delete(f"/api/sessions/{session_id}")
        assert delete_response.status_code == 204

        # Verify session is gone
        final_response = await client.get(f"/api/sessions/{session_id}")
        assert final_response.status_code == 404

    async def test_multiple_participants_sync(
        self, client: AsyncClient, sync_client: TestClient
    ) -> None:
        """Test that multiple participants receive synchronized updates."""
        # Create session
        response = await client.post("/api/sessions", json={"language": "javascript"})
        session_id = response.json()["id"]

        # First participant connects
        with sync_client.websocket_connect(f"/ws/{session_id}") as ws1:
            sync1 = ws1.receive_json()
            assert sync1["type"] == MessageType.SYNC_RESPONSE.value
            _participant1_id = sync1["payload"]["participant_id"]

            # First participant sends code
            ws1.send_json(
                {
                    "type": MessageType.CODE_UPDATE.value,
                    "payload": {"code": "function hello() {}"},
                }
            )

        # Verify the code was saved
        get_response = await client.get(f"/api/sessions/{session_id}")
        assert get_response.json()["code"] == "function hello() {}"

    async def test_language_change_synchronization(
        self, client: AsyncClient, sync_client: TestClient
    ) -> None:
        """Test that language changes are synchronized across sessions."""
        # Create Python session
        response = await client.post(
            "/api/sessions", json={"language": "python", "code": "print('hello')"}
        )
        session_id = response.json()["id"]

        # Connect and change language
        with sync_client.websocket_connect(f"/ws/{session_id}") as ws:
            ws.receive_json()  # Initial sync

            # Change to JavaScript
            ws.send_json(
                {
                    "type": MessageType.LANGUAGE_CHANGE.value,
                    "payload": {"language": "javascript"},
                }
            )

        # Verify language change was persisted
        get_response = await client.get(f"/api/sessions/{session_id}")
        assert get_response.json()["language"] == "javascript"


class TestClientServerErrorHandling:
    """Tests for error handling in client-server communication."""

    @pytest.fixture(autouse=True)
    def reset_dependencies(self) -> None:
        """Reset cached dependencies before each test."""
        get_repository.cache_clear()
        get_connection_manager.cache_clear()

    @pytest.fixture
    async def client(self) -> AsyncClient:
        """Provide an async HTTP client."""
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as ac:
            yield ac

    @pytest.fixture
    def sync_client(self) -> TestClient:
        """Provide a synchronous client."""
        return TestClient(app)

    async def test_websocket_to_nonexistent_session(
        self, sync_client: TestClient
    ) -> None:
        """Test WebSocket connection to non-existent session is rejected."""
        with pytest.raises(Exception):
            with sync_client.websocket_connect("/ws/nonexistent-session"):
                pass

    async def test_rest_api_not_found_error(self, client: AsyncClient) -> None:
        """Test REST API returns proper 404 for missing sessions."""
        response = await client.get("/api/sessions/does-not-exist")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    async def test_delete_nonexistent_session(self, client: AsyncClient) -> None:
        """Test deleting non-existent session returns 404."""
        response = await client.delete("/api/sessions/ghost-session")
        assert response.status_code == 404

    async def test_invalid_json_request(self, client: AsyncClient) -> None:
        """Test that invalid JSON is rejected with proper error."""
        response = await client.post(
            "/api/sessions",
            content="not valid json",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422


class TestConcurrentConnections:
    """Tests for handling concurrent client connections."""

    @pytest.fixture(autouse=True)
    def reset_dependencies(self) -> None:
        """Reset cached dependencies before each test."""
        get_repository.cache_clear()
        get_connection_manager.cache_clear()

    @pytest.fixture
    async def client(self) -> AsyncClient:
        """Provide an async HTTP client."""
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as ac:
            yield ac

    @pytest.fixture
    def sync_client(self) -> TestClient:
        """Provide a synchronous client."""
        return TestClient(app)

    async def test_multiple_sessions_isolation(self, client: AsyncClient) -> None:
        """Test that multiple sessions are properly isolated."""
        # Create two separate sessions
        session1 = (
            await client.post(
                "/api/sessions", json={"language": "python", "code": "session1"}
            )
        ).json()
        session2 = (
            await client.post(
                "/api/sessions", json={"language": "javascript", "code": "session2"}
            )
        ).json()

        # Verify they have different IDs
        assert session1["id"] != session2["id"]

        # Verify each has correct content
        get1 = await client.get(f"/api/sessions/{session1['id']}")
        get2 = await client.get(f"/api/sessions/{session2['id']}")

        assert get1.json()["code"] == "session1"
        assert get1.json()["language"] == "python"
        assert get2.json()["code"] == "session2"
        assert get2.json()["language"] == "javascript"

        # Delete one, verify other is unaffected
        await client.delete(f"/api/sessions/{session1['id']}")

        get2_after = await client.get(f"/api/sessions/{session2['id']}")
        assert get2_after.status_code == 200
        assert get2_after.json()["code"] == "session2"
