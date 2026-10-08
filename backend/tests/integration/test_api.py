"""Integration tests for REST API endpoints."""

from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.dependencies import get_connection_manager, get_repository
from app.main import app, resolve_static_file


class TestSessionAPI:
    """Integration tests for session REST endpoints."""

    @pytest.fixture(autouse=True)
    def reset_dependencies(self) -> None:
        """Reset cached dependencies before each test."""
        get_repository.cache_clear()
        get_connection_manager.cache_clear()

    @pytest.fixture
    async def client(self) -> AsyncClient:
        """Provide an async HTTP client for testing."""
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as ac:
            yield ac

    async def test_create_session(self, client: AsyncClient) -> None:
        """Test creating a new session via POST."""
        response = await client.post(
            "/api/sessions",
            json={"language": "python", "code": "print('hello')"},
        )

        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["language"] == "python"
        assert data["code"] == "print('hello')"
        assert data["participant_count"] == 0
        assert "share_url" in data

    async def test_create_session_default_values(self, client: AsyncClient) -> None:
        """Test creating a session with default values."""
        response = await client.post("/api/sessions", json={})

        assert response.status_code == 201
        data = response.json()
        assert data["language"] == "python"
        assert data["code"] == ""

    async def test_get_session(self, client: AsyncClient) -> None:
        """Test retrieving an existing session."""
        # Create a session first
        create_response = await client.post(
            "/api/sessions",
            json={"language": "javascript", "code": "const x = 1;"},
        )
        session_id = create_response.json()["id"]

        # Get the session
        response = await client.get(f"/api/sessions/{session_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == session_id
        assert data["language"] == "javascript"
        assert data["code"] == "const x = 1;"

    async def test_get_nonexistent_session(self, client: AsyncClient) -> None:
        """Test getting a session that doesn't exist."""
        response = await client.get("/api/sessions/nonexistent")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    async def test_delete_session(self, client: AsyncClient) -> None:
        """Test deleting a session."""
        # Create a session first
        create_response = await client.post("/api/sessions", json={})
        session_id = create_response.json()["id"]

        # Delete the session
        response = await client.delete(f"/api/sessions/{session_id}")

        assert response.status_code == 204

        # Verify it's deleted
        get_response = await client.get(f"/api/sessions/{session_id}")
        assert get_response.status_code == 404

    async def test_delete_nonexistent_session(self, client: AsyncClient) -> None:
        """Test deleting a session that doesn't exist."""
        response = await client.delete("/api/sessions/nonexistent")

        assert response.status_code == 404


class TestHealthEndpoint:
    """Integration tests for the health check endpoint."""

    @pytest.fixture
    async def client(self) -> AsyncClient:
        """Provide an async HTTP client for testing."""
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as ac:
            yield ac

    async def test_health_check(self, client: AsyncClient) -> None:
        """Test the health check endpoint returns healthy status."""
        response = await client.get("/health")

        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}


class TestSecurityHeaders:
    """Tests for security headers in responses."""

    @pytest.fixture
    async def client(self) -> AsyncClient:
        """Provide an async HTTP client for testing."""
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as ac:
            yield ac

    async def test_security_headers_present(self, client: AsyncClient) -> None:
        """Test that security headers are present in responses."""
        response = await client.get("/health")

        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert response.headers.get("X-XSS-Protection") == "1; mode=block"
        assert "strict-origin" in response.headers.get("Referrer-Policy", "")


class TestStaticFileResolution:
    """Tests for safely resolving files of the built frontend."""

    def test_resolves_file_inside_static_dir(self, tmp_path: Path) -> None:
        """Test that existing files inside the static directory are served."""
        static_dir = tmp_path.resolve()
        (static_dir / "favicon.png").write_bytes(b"icon")

        assert resolve_static_file(static_dir, "favicon.png") == (
            static_dir / "favicon.png"
        )

    def test_missing_file_returns_none(self, tmp_path: Path) -> None:
        """Test that unknown paths fall through to the SPA entry point."""
        assert resolve_static_file(tmp_path.resolve(), "session/abc123") is None

    def test_null_byte_returns_none(self, tmp_path: Path) -> None:
        """Test that a null byte in the path is treated as not found."""
        assert resolve_static_file(tmp_path.resolve(), "index\x00.html") is None

    def test_rejects_paths_outside_static_dir(self, tmp_path: Path) -> None:
        """Test that path traversal and absolute paths are rejected."""
        static_dir = tmp_path.resolve() / "static"
        static_dir.mkdir()
        secret = tmp_path.resolve() / "secret.txt"
        secret.write_text("secret")

        assert resolve_static_file(static_dir, "../secret.txt") is None
        assert resolve_static_file(static_dir, str(secret)) is None


class TestAPIValidation:
    """Tests for API input validation."""

    @pytest.fixture(autouse=True)
    def reset_dependencies(self) -> None:
        """Reset cached dependencies before each test."""
        get_repository.cache_clear()
        get_connection_manager.cache_clear()

    @pytest.fixture
    async def client(self) -> AsyncClient:
        """Provide an async HTTP client for testing."""
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as ac:
            yield ac

    async def test_create_session_invalid_json(self, client: AsyncClient) -> None:
        """Test that invalid JSON is rejected."""
        response = await client.post(
            "/api/sessions",
            content="not valid json",
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 422

    async def test_create_session_extra_fields_ignored(
        self, client: AsyncClient
    ) -> None:
        """Test that extra fields in request are ignored."""
        response = await client.post(
            "/api/sessions",
            json={
                "language": "python",
                "code": "",
                "extra_field": "should be ignored",
            },
        )

        assert response.status_code == 201
