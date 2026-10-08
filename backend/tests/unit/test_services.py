"""Unit tests for the session service layer."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.session import Session
from app.repositories.base import SessionRepository
from app.services.session_service import SessionService


class TestSessionService:
    """Tests for SessionService business logic."""

    @pytest.fixture
    def mock_repository(self) -> MagicMock:
        """Provide a mock repository for testing."""
        mock = MagicMock(spec=SessionRepository)
        return mock

    @pytest.fixture
    def service(self, mock_repository: MagicMock) -> SessionService:
        """Provide a service with mocked repository."""
        return SessionService(mock_repository)

    async def test_create_session_default_values(
        self, service: SessionService, mock_repository: MagicMock
    ) -> None:
        """Test creating a session with default values."""
        expected_session = Session(id="abc123", code="", language="python")
        mock_repository.create = AsyncMock(return_value=expected_session)

        result = await service.create_session()

        mock_repository.create.assert_called_once()
        call_args = mock_repository.create.call_args[0][0]
        assert call_args.language == "python"
        assert call_args.code == ""
        assert result == expected_session

    async def test_create_session_custom_values(
        self, service: SessionService, mock_repository: MagicMock
    ) -> None:
        """Test creating a session with custom values."""
        expected_session = Session(
            id="xyz789", code="let x = 1;", language="javascript"
        )
        mock_repository.create = AsyncMock(return_value=expected_session)

        result = await service.create_session(language="javascript", code="let x = 1;")

        call_args = mock_repository.create.call_args[0][0]
        assert call_args.language == "javascript"
        assert call_args.code == "let x = 1;"
        assert result == expected_session

    async def test_get_session_found(
        self, service: SessionService, mock_repository: MagicMock
    ) -> None:
        """Test getting an existing session."""
        expected_session = Session(id="test123")
        mock_repository.get = AsyncMock(return_value=expected_session)

        result = await service.get_session("test123")

        mock_repository.get.assert_called_once_with("test123")
        assert result == expected_session

    async def test_get_session_not_found(
        self, service: SessionService, mock_repository: MagicMock
    ) -> None:
        """Test getting a session that doesn't exist."""
        mock_repository.get = AsyncMock(return_value=None)

        result = await service.get_session("nonexistent")

        assert result is None

    async def test_update_session_code(
        self, service: SessionService, mock_repository: MagicMock
    ) -> None:
        """Test updating session code."""
        updated_session = Session(id="test", code="updated code")
        mock_repository.update_code = AsyncMock(return_value=updated_session)

        result = await service.update_session_code("test", "updated code")

        mock_repository.update_code.assert_called_once_with(
            "test", "updated code", None
        )
        assert result == updated_session

    async def test_update_session_code_with_language(
        self, service: SessionService, mock_repository: MagicMock
    ) -> None:
        """Test updating session code and language."""
        updated_session = Session(id="test", code="fn main()", language="rust")
        mock_repository.update_code = AsyncMock(return_value=updated_session)

        result = await service.update_session_code("test", "fn main()", "rust")

        mock_repository.update_code.assert_called_once_with("test", "fn main()", "rust")
        assert result == updated_session

    async def test_add_participant(
        self, service: SessionService, mock_repository: MagicMock
    ) -> None:
        """Test adding a participant."""
        mock_repository.add_participant = AsyncMock(return_value=Session(id="test"))

        result = await service.add_participant("test", "user1", "Alice", "#ff0000")

        mock_repository.add_participant.assert_called_once_with(
            "test", "user1", "Alice", "#ff0000"
        )
        assert result is not None

    async def test_add_participant_default_values(
        self, service: SessionService, mock_repository: MagicMock
    ) -> None:
        """Test adding a participant with default values."""
        mock_repository.add_participant = AsyncMock(return_value=Session(id="test"))

        await service.add_participant("test", "user1")

        mock_repository.add_participant.assert_called_once_with(
            "test", "user1", "Anonymous", "#3b82f6"
        )

    async def test_remove_participant(
        self, service: SessionService, mock_repository: MagicMock
    ) -> None:
        """Test removing a participant."""
        mock_repository.remove_participant = AsyncMock(return_value=Session(id="test"))

        result = await service.remove_participant("test", "user1")

        mock_repository.remove_participant.assert_called_once_with("test", "user1")
        assert result is not None

    async def test_delete_session_success(
        self, service: SessionService, mock_repository: MagicMock
    ) -> None:
        """Test deleting a session successfully."""
        mock_repository.delete = AsyncMock(return_value=True)

        result = await service.delete_session("test")

        mock_repository.delete.assert_called_once_with("test")
        assert result is True

    async def test_delete_session_not_found(
        self, service: SessionService, mock_repository: MagicMock
    ) -> None:
        """Test deleting a session that doesn't exist."""
        mock_repository.delete = AsyncMock(return_value=False)

        result = await service.delete_session("nonexistent")

        assert result is False


class TestServiceDependencyInjection:
    """Tests verifying dependency injection works correctly."""

    async def test_service_uses_injected_repository(self) -> None:
        """Test that service uses the injected repository."""
        mock_repo = MagicMock(spec=SessionRepository)
        mock_repo.create = AsyncMock(return_value=Session(id="injected"))

        service = SessionService(mock_repo)
        result = await service.create_session()

        assert result.id == "injected"
        mock_repo.create.assert_called_once()
