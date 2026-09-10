"""Unit tests for Pydantic models."""

from datetime import datetime

from app.models.session import (
    MessageType,
    Participant,
    Session,
    SessionCreate,
    SessionUpdate,
    WebSocketMessage,
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


class TestSessionUpdate:
    """Tests for the SessionUpdate model."""

    def test_update_code_only(self) -> None:
        """Test updating only the code."""
        update = SessionUpdate(code="print('updated')")

        assert update.code == "print('updated')"
        assert update.language is None

    def test_update_language_only(self) -> None:
        """Test updating only the language."""
        update = SessionUpdate(language="rust")

        assert update.code is None
        assert update.language == "rust"

    def test_update_both(self) -> None:
        """Test updating both code and language."""
        update = SessionUpdate(code="fn main() {}", language="rust")

        assert update.code == "fn main() {}"
        assert update.language == "rust"


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


class TestWebSocketMessage:
    """Tests for the WebSocketMessage model."""

    def test_create_code_update_message(self) -> None:
        """Test creating a code update message."""
        message = WebSocketMessage(
            type=MessageType.CODE_UPDATE,
            payload={"code": "print('hello')"},
            sender_id="user123",
        )

        assert message.type == MessageType.CODE_UPDATE
        assert message.payload == {"code": "print('hello')"}
        assert message.sender_id == "user123"
        assert isinstance(message.timestamp, datetime)

    def test_create_user_joined_message(self) -> None:
        """Test creating a user joined message."""
        message = WebSocketMessage(
            type=MessageType.USER_JOINED,
            payload={"participant_name": "Alice"},
        )

        assert message.type == MessageType.USER_JOINED
        assert message.payload["participant_name"] == "Alice"
        assert message.sender_id is None

    def test_message_type_values(self) -> None:
        """Test that message types have correct string values."""
        assert MessageType.CODE_UPDATE.value == "code_update"
        assert MessageType.CURSOR_POSITION.value == "cursor_position"
        assert MessageType.USER_JOINED.value == "user_joined"
        assert MessageType.USER_LEFT.value == "user_left"
        assert MessageType.LANGUAGE_CHANGE.value == "language_change"
        assert MessageType.SYNC_REQUEST.value == "sync_request"
        assert MessageType.SYNC_RESPONSE.value == "sync_response"
