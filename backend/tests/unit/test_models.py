"""Unit tests for Pydantic models."""

from datetime import datetime

from app.models.session import (
    MessageType,
    Participant,
    Session,
    SessionCreate,
)


class TestParticipant:
    """Tests for the Participant model."""

    def test_create_participant_with_defaults(self) -> None:
        """Test creating a participant with default values."""
        participant = Participant(id="user123")

        assert participant.id == "user123"
        assert participant.name == "Anonymous"
        assert participant.color == "#3b82f6"
        assert participant.cursor_position is None

    def test_create_participant_with_all_fields(self) -> None:
        """Test creating a participant with all fields specified."""
        participant = Participant(
            id="user456",
            name="John Doe",
            color="#ef4444",
            cursor_position={"line": 10, "column": 5},
        )

        assert participant.id == "user456"
        assert participant.name == "John Doe"
        assert participant.color == "#ef4444"
        assert participant.cursor_position == {"line": 10, "column": 5}


class TestSessionCreate:
    """Tests for the SessionCreate model."""

    def test_create_with_defaults(self) -> None:
        """Test creating a session request with defaults."""
        request = SessionCreate()

        assert request.language == "python"
        assert request.code == ""

    def test_create_with_custom_values(self) -> None:
        """Test creating a session request with custom values."""
        request = SessionCreate(language="javascript", code="console.log('hello');")

        assert request.language == "javascript"
        assert request.code == "console.log('hello');"


class TestSession:
    """Tests for the Session model."""

    def test_create_session_with_required_fields(self) -> None:
        """Test creating a session with only required fields."""
        session = Session(id="abc123")

        assert session.id == "abc123"
        assert session.code == ""
        assert session.language == "python"
        assert session.participants == []
        assert isinstance(session.created_at, datetime)
        assert isinstance(session.updated_at, datetime)

    def test_create_session_with_all_fields(self) -> None:
        """Test creating a session with all fields."""
        participant = Participant(id="p1", name="Alice", color="#3b82f6")
        now = datetime.now()

        session = Session(
            id="xyz789",
            code="def hello(): pass",
            language="python",
            participants=[participant],
            created_at=now,
            updated_at=now,
        )

        assert session.id == "xyz789"
        assert session.code == "def hello(): pass"
        assert session.language == "python"
        assert len(session.participants) == 1
        assert session.participants[0].name == "Alice"

    def test_session_model_copy(self) -> None:
        """Test copying a session with updates."""
        session = Session(id="test", code="original")

        updated = session.model_copy(update={"code": "modified"})

        assert session.code == "original"
        assert updated.code == "modified"
        assert session.id == updated.id


class TestMessageType:
    """Tests for the MessageType enum."""

    def test_message_type_values(self) -> None:
        """Test that message types have correct string values."""
        assert MessageType.CODE_UPDATE.value == "code_update"
        assert MessageType.CURSOR_POSITION.value == "cursor_position"
        assert MessageType.USER_JOINED.value == "user_joined"
        assert MessageType.USER_LEFT.value == "user_left"
        assert MessageType.LANGUAGE_CHANGE.value == "language_change"
        assert MessageType.NAME_CHANGE.value == "name_change"
        assert MessageType.SYNC_REQUEST.value == "sync_request"
        assert MessageType.SYNC_RESPONSE.value == "sync_response"
