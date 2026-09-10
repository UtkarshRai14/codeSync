"""Abstract base repository for session data access.

Implements the Repository Pattern to abstract database operations,
enabling easy swap between mock and real database implementations
following the Dependency Inversion Principle.
"""

from abc import ABC, abstractmethod

from app.models.session import Session, SessionCreate


class SessionRepository(ABC):
    """Abstract base class for session data access operations.

    This interface defines the contract for session persistence,
    allowing different implementations (mock, PostgreSQL, etc.)
    to be swapped without changing business logic.

    Example:
        >>> repo = MockSessionRepository()
        >>> session = await repo.create(SessionCreate(language="python"))
        >>> retrieved = await repo.get(session.id)
    """

    @abstractmethod
    async def create(self, session_data: SessionCreate) -> Session:
        """Create a new interview session.

        Args:
            session_data: Data for creating the session.

        Returns:
            The created session with generated ID and timestamps.
        """

    @abstractmethod
    async def get(self, session_id: str) -> Session | None:
        """Retrieve a session by its ID.

        Args:
            session_id: Unique identifier of the session.

        Returns:
            The session if found, None otherwise.
        """

    @abstractmethod
    async def update_code(
        self, session_id: str, code: str, language: str | None = None
    ) -> Session | None:
        """Update the code content of a session.

        Args:
            session_id: Unique identifier of the session.
            code: New code content.
            language: Optional new language setting.

        Returns:
            The updated session if found, None otherwise.
        """

    @abstractmethod
    async def add_participant(
        self, session_id: str, participant_id: str, name: str, color: str
    ) -> Session | None:
        """Add a participant to a session.

        Args:
            session_id: Unique identifier of the session.
            participant_id: Unique identifier for the participant.
            name: Display name of the participant.
            color: Hex color for the participant's cursor.

        Returns:
            The updated session if found, None otherwise.
        """

    @abstractmethod
    async def remove_participant(
        self, session_id: str, participant_id: str
    ) -> Session | None:
        """Remove a participant from a session.

        Args:
            session_id: Unique identifier of the session.
            participant_id: Unique identifier of the participant.

        Returns:
            The updated session if found, None otherwise.
        """

    @abstractmethod
    async def update_participant_name(
        self, session_id: str, participant_id: str, name: str
    ) -> Session | None:
        """Update a participant's display name.

        Args:
            session_id: Unique identifier of the session.
            participant_id: Unique identifier of the participant.
            name: New display name.

        Returns:
            The updated session if found, None otherwise.
        """

    @abstractmethod
    async def delete(self, session_id: str) -> bool:
        """Delete a session.

        Args:
            session_id: Unique identifier of the session.

        Returns:
            True if the session was deleted, False if not found.
        """
