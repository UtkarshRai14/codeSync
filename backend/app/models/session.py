"""Session-related Pydantic models.

Defines data models for interview sessions, participants, and WebSocket messages
following the Single Responsibility Principle.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class MessageType(str, Enum):
    """Types of WebSocket messages for real-time communication.

    Attributes:
        CODE_UPDATE: Code content has been modified.
        CURSOR_POSITION: User cursor position changed.
        USER_JOINED: New user connected to session.
        USER_LEFT: User disconnected from session.
        LANGUAGE_CHANGE: Programming language was changed.
        SYNC_REQUEST: Client requesting full state sync.
        SYNC_RESPONSE: Server sending full state.
    """

    CODE_UPDATE = "code_update"
    CURSOR_POSITION = "cursor_position"
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"
    LANGUAGE_CHANGE = "language_change"
    NAME_CHANGE = "name_change"
    SYNC_REQUEST = "sync_request"
    SYNC_RESPONSE = "sync_response"


class Participant(BaseModel):
    """Represents a participant in an interview session.

    Attributes:
        id: Unique identifier for the participant.
        name: Display name of the participant.
        color: Hex color for cursor/selection highlighting.
        cursor_position: Current cursor line and column.
    """

    id: str
    name: str = "Anonymous"
    color: str = "#3b82f6"
    cursor_position: dict[str, int] | None = None


class SessionCreate(BaseModel):
    """Request model for creating a new session.

    Attributes:
        language: Initial programming language for syntax highlighting.
        code: Initial code content.
    """

    language: str = "python"
    code: str = ""


class SessionUpdate(BaseModel):
    """Request model for updating session code.

    Attributes:
        code: Updated code content.
        language: Optional language change.
    """

    code: str | None = None
    language: str | None = None


class Session(BaseModel):
    """Represents an interview coding session.

    Attributes:
        id: Unique session identifier (UUID).
        code: Current code content.
        language: Programming language for syntax highlighting.
        participants: List of connected participants.
        created_at: Session creation timestamp.
        updated_at: Last update timestamp.
    """

    id: str
    code: str = ""
    language: str = "python"
    participants: list[Participant] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class WebSocketMessage(BaseModel):
    """WebSocket message structure for real-time communication.

    Attributes:
        type: Message type indicating the action.
        payload: Message data specific to the type.
        sender_id: ID of the participant who sent the message.
        timestamp: When the message was created.
    """

    type: MessageType
    payload: dict = Field(default_factory=dict)
    sender_id: str | None = None
    timestamp: datetime = Field(default_factory=datetime.now)
