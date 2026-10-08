"""Mock session repository using in-memory storage.

Provides a concrete implementation of SessionRepository for development
and testing purposes. Data is stored in memory and lost on restart.
"""

import uuid
from datetime import datetime

from app.models.session import Participant, Session, SessionCreate
from app.repositories.base import SessionRepository


class MockSessionRepository(SessionRepository):
    """In-memory mock implementation of session repository.

    Stores sessions in a dictionary for development and testing.
    Thread-safe for async operations but not for multi-process deployments.

    Attributes:
        _sessions: Dictionary mapping session IDs to Session objects.
    """

    def __init__(self) -> None:
        """Initialize the mock repository with empty storage."""
        self._sessions: dict[str, Session] = {}

    async def create(self, session_data: SessionCreate) -> Session:
        """Create a new session with a generated UUID.

        Args:
            session_data: Initial session configuration.

        Returns:
            Newly created session with unique ID.
        """
        session_id = str(uuid.uuid4())[:8]  # Short ID for easier sharing
        now = datetime.now()
        session = Session(
            id=session_id,
            code=session_data.code,
            language=session_data.language,
            participants=[],
            created_at=now,
            updated_at=now,
        )
        self._sessions[session_id] = session
        return session

    async def get(self, session_id: str) -> Session | None:
        """Retrieve a session by ID.

        Args:
            session_id: The session's unique identifier.

        Returns:
            The session if found, None otherwise.
        """
        return self._sessions.get(session_id)

    async def update_code(
        self, session_id: str, code: str, language: str | None = None
    ) -> Session | None:
        """Update session code and optionally language.

        Args:
            session_id: The session's unique identifier.
            code: New code content.
            language: Optional new language setting.

        Returns:
            Updated session if found, None otherwise.
        """
        session = self._sessions.get(session_id)
        if session is None:
            return None

        # Create updated session (immutable update pattern)
        updated = session.model_copy(
            update={
                "code": code,
                "language": language if language else session.language,
                "updated_at": datetime.now(),
            }
        )
        self._sessions[session_id] = updated
        return updated

    async def add_participant(
        self, session_id: str, participant_id: str, name: str, color: str
    ) -> Session | None:
        """Add a participant to the session.

        Args:
            session_id: The session's unique identifier.
            participant_id: Unique ID for the new participant.
            name: Display name.
            color: Cursor highlight color.

        Returns:
            Updated session if found, None otherwise.
        """
        session = self._sessions.get(session_id)
        if session is None:
            return None

        # Check if participant already exists
        existing_ids = {p.id for p in session.participants}
        if participant_id in existing_ids:
            return session

        participant = Participant(id=participant_id, name=name, color=color)
        updated_participants = [*session.participants, participant]
        updated = session.model_copy(
            update={
                "participants": updated_participants,
                "updated_at": datetime.now(),
            }
        )
        self._sessions[session_id] = updated
        return updated

    async def remove_participant(
        self, session_id: str, participant_id: str
    ) -> Session | None:
        """Remove a participant from the session.

        Args:
            session_id: The session's unique identifier.
            participant_id: ID of participant to remove.

        Returns:
            Updated session if found, None otherwise.
        """
        session = self._sessions.get(session_id)
        if session is None:
            return None

        updated_participants = [
            p for p in session.participants if p.id != participant_id
        ]
        updated = session.model_copy(
            update={
                "participants": updated_participants,
                "updated_at": datetime.now(),
            }
        )
        self._sessions[session_id] = updated
        return updated

    async def update_participant_name(
        self, session_id: str, participant_id: str, name: str
    ) -> Session | None:
        """Update a participant's display name.

        Args:
            session_id: Unique identifier of the session.
            participant_id: ID of participant to update.
            name: New display name.

        Returns:
            Updated session if found, None otherwise.
        """
        session = self._sessions.get(session_id)
        if session is None:
            return None

        # Check if participant exists
        participant_exists = any(p.id == participant_id for p in session.participants)
        if not participant_exists:
            return None

        # Create updated list with modified participant
        updated_participants = [
            p.model_copy(update={"name": name}) if p.id == participant_id else p
            for p in session.participants
        ]

        updated = session.model_copy(
            update={
                "participants": updated_participants,
                "updated_at": datetime.now(),
            }
        )
        self._sessions[session_id] = updated
        return updated

    async def delete(self, session_id: str) -> bool:
        """Delete a session from storage.

        Args:
            session_id: The session's unique identifier.

        Returns:
            True if deleted, False if not found.
        """
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False

    def clear(self) -> None:
        """Clear all sessions. Useful for testing."""
        self._sessions.clear()
