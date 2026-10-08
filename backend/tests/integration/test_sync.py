"""Integration tests for real-time code synchronization."""

import pytest
from starlette.testclient import TestClient

from app.main import app
from app.models.session import MessageType


class TestCodeSync:
    """Tests for real-time code synchronization via WebSocket."""

    @pytest.fixture
    def client(self) -> TestClient:
        """Provide a test client for WebSocket testing."""
        return TestClient(app)

    def test_code_sync_broadcast(self, client: TestClient) -> None:
        """Test that code updates are broadcast to other participants."""
        # 1. Create session (TestClient can make requests too)
        create_res = client.post("/api/sessions", json={"language": "python"})
        session_id = create_res.json()["id"]

        # 2. Connect User A
        with client.websocket_connect(f"/ws/{session_id}?name=UserA") as ws_a:
            # 3. Connect User B
            with client.websocket_connect(f"/ws/{session_id}?name=UserB") as ws_b:
                # Consume initial messages
                ws_a.receive_json()  # sync_response
                ws_a.receive_json()  # user_joined (User B)

                ws_b.receive_json()  # sync_response (User B)

                # 4. User A sends code update
                update_msg = {
                    "type": MessageType.CODE_UPDATE.value,
                    "payload": {"code": "print('hello from A')", "language": "python"},
                }
                ws_a.send_json(update_msg)

                # 5. User B should receive it
                received = ws_b.receive_json()
                assert received["type"] == MessageType.CODE_UPDATE.value
                assert received["payload"]["code"] == "print('hello from A')"
                assert received["payload"]["language"] == "python"
                # Sender ID should match User A
                assert "sender_id" in received
