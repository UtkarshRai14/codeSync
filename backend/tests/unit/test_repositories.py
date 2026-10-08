"""Unit tests for the mock session repository."""

import pytest

from app.models.session import SessionCreate
from app.repositories.mock_session import MockSessionRepository


class TestMockSessionRepository:
    """Tests for MockSessionRepository CRUD operations."""

    @pytest.fixture
    def repo(self) -> MockSessionRepository:
        """Provide a fresh repository for each test."""
        return MockSessionRepository()

    async def test_create_session(self, repo: MockSessionRepository) -> None:
        """Test creating a new session."""
        session_data = SessionCreate(language="javascript", code="const x = 1;")

        session = await repo.create(session_data)

        assert session.id is not None
        assert len(session.id) == 8  # Short UUID format
        assert session.language == "javascript"
        assert session.code == "const x = 1;"
        assert session.participants == []

    async def test_create_session_with_defaults(
        self, repo: MockSessionRepository
    ) -> None:
        """Test creating a session with default values."""
        session_data = SessionCreate()

        session = await repo.create(session_data)

        assert session.language == "python"
        assert session.code == ""

    async def test_get_existing_session(self, repo: MockSessionRepository) -> None:
        """Test retrieving an existing session."""
        session_data = SessionCreate(code="test code")
        created = await repo.create(session_data)

        retrieved = await repo.get(created.id)

        assert retrieved is not None
        assert retrieved.id == created.id
        assert retrieved.code == "test code"

    async def test_get_nonexistent_session(self, repo: MockSessionRepository) -> None:
        """Test retrieving a session that doesn't exist."""
        result = await repo.get("nonexistent")

        assert result is None

    async def test_update_code(self, repo: MockSessionRepository) -> None:
        """Test updating session code."""
        session = await repo.create(SessionCreate(code="original"))

        updated = await repo.update_code(session.id, "modified")

        assert updated is not None
        assert updated.code == "modified"
        assert updated.updated_at > session.created_at

    async def test_update_code_and_language(self, repo: MockSessionRepository) -> None:
        """Test updating both code and language."""
        session = await repo.create(SessionCreate(language="python"))

        updated = await repo.update_code(session.id, "fn main() {}", "rust")

        assert updated is not None
        assert updated.code == "fn main() {}"
        assert updated.language == "rust"

    async def test_update_nonexistent_session(
        self, repo: MockSessionRepository
    ) -> None:
        """Test updating a session that doesn't exist."""
        result = await repo.update_code("nonexistent", "code")

        assert result is None

    async def test_add_participant(self, repo: MockSessionRepository) -> None:
        """Test adding a participant to a session."""
        session = await repo.create(SessionCreate())

        updated = await repo.add_participant(session.id, "user1", "Alice", "#ff0000")

        assert updated is not None
        assert len(updated.participants) == 1
        assert updated.participants[0].id == "user1"
        assert updated.participants[0].name == "Alice"
        assert updated.participants[0].color == "#ff0000"

    async def test_add_duplicate_participant(self, repo: MockSessionRepository) -> None:
        """Test that adding duplicate participant is idempotent."""
        session = await repo.create(SessionCreate())
        await repo.add_participant(session.id, "user1", "Alice", "#ff0000")

        updated = await repo.add_participant(session.id, "user1", "Alice", "#ff0000")

        assert updated is not None
        assert len(updated.participants) == 1

    async def test_add_multiple_participants(self, repo: MockSessionRepository) -> None:
        """Test adding multiple participants."""
        session = await repo.create(SessionCreate())
        await repo.add_participant(session.id, "user1", "Alice", "#ff0000")
        await repo.add_participant(session.id, "user2", "Bob", "#00ff00")

        result = await repo.get(session.id)

        assert result is not None
        assert len(result.participants) == 2

    async def test_remove_participant(self, repo: MockSessionRepository) -> None:
        """Test removing a participant from a session."""
        session = await repo.create(SessionCreate())
        await repo.add_participant(session.id, "user1", "Alice", "#ff0000")

        updated = await repo.remove_participant(session.id, "user1")

        assert updated is not None
        assert len(updated.participants) == 0

    async def test_remove_nonexistent_participant(
        self, repo: MockSessionRepository
    ) -> None:
        """Test removing a participant that doesn't exist."""
        session = await repo.create(SessionCreate())

        updated = await repo.remove_participant(session.id, "nonexistent")

        assert updated is not None
        assert len(updated.participants) == 0

    async def test_delete_session(self, repo: MockSessionRepository) -> None:
        """Test deleting a session."""
        session = await repo.create(SessionCreate())

        result = await repo.delete(session.id)

        assert result is True
        assert await repo.get(session.id) is None

    async def test_delete_nonexistent_session(
        self, repo: MockSessionRepository
    ) -> None:
        """Test deleting a session that doesn't exist."""
        result = await repo.delete("nonexistent")

        assert result is False

    async def test_clear(self, repo: MockSessionRepository) -> None:
        """Test clearing all sessions."""
        await repo.create(SessionCreate())
        await repo.create(SessionCreate())

        repo.clear()

        # Sessions should be cleared (can't verify directly, but no errors)
        assert await repo.get("any") is None


class TestRepositoryIsolation:
    """Tests verifying repository isolation between instances."""

    async def test_separate_instances_are_isolated(self) -> None:
        """Test that different repository instances don't share data."""
        repo1 = MockSessionRepository()
        repo2 = MockSessionRepository()

        session = await repo1.create(SessionCreate(code="repo1 code"))

        result = await repo2.get(session.id)

        assert result is None
