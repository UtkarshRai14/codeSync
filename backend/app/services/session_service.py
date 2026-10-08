"""Session service for business logic operations.

Implements the Service Layer pattern to encapsulate business logic
and coordinate between the API layer and repository layer.
"""

from app.models.session import Session, SessionCreate
from app.repositories.base import SessionRepository


class SessionService:
    """Service layer for session-related business logic.

    Encapsulates all session operations following Single Responsibility Principle.
    Uses dependency injection for the repository to enable testing and flexibility.

    Attributes:
        _repository: The session repository for data persistence.
    """

    def __init__(self, repository: SessionRepository) -> None:
        """Initialize the service with a repository.

        Args:
            repository: Session repository implementation.
        """
        self._repository = repository

    async def create_session(self, language: str = "python", code: str = "") -> Session:
        """Create a new interview session.

        Args:
            language: Programming language for syntax highlighting.
            code: Initial code content.

        Returns:
            The newly created session.
        """
        session_data = SessionCreate(language=language, code=code)
        return await self._repository.create(session_data)

    async def get_session(self, session_id: str) -> Session | None:
        """Retrieve a session by its ID.

        Args:
            session_id: Unique session identifier.

        Returns:
            The session if found, None otherwise.
        """
        return await self._repository.get(session_id)

    async def update_session_code(
        self, session_id: str, code: str, language: str | None = None
    ) -> Session | None:
        """Update the code content of a session.

        Args:
            session_id: Unique session identifier.
            code: New code content.
            language: Optional new language setting.

        Returns:
            Updated session if found, None otherwise.
        """
        return await self._repository.update_code(session_id, code, language)

    async def add_participant(
        self,
        session_id: str,
        participant_id: str,
        name: str = "Anonymous",
        color: str = "#3b82f6",
    ) -> Session | None:
        """Add a participant to a session.

        Args:
            session_id: Unique session identifier.
            participant_id: Unique participant identifier.
            name: Display name for the participant.
            color: Hex color for cursor highlighting.

        Returns:
            Updated session if found, None otherwise.
        """
        return await self._repository.add_participant(
            session_id, participant_id, name, color
        )

    async def remove_participant(
        self, session_id: str, participant_id: str
    ) -> Session | None:
        """Remove a participant from a session.

        Args:
            session_id: Unique session identifier.
            participant_id: Participant to remove.

        Returns:
            Updated session if found, None otherwise.
        """
        return await self._repository.remove_participant(session_id, participant_id)

    async def update_participant_name(
        self, session_id: str, participant_id: str, name: str
    ) -> Session | None:
        """Update a participant's display name.

        Args:
            session_id: Unique session identifier.
            participant_id: Participant identifier.
            name: New display name.

        Returns:
            Updated session if found, None otherwise.
        """
        return await self._repository.update_participant_name(
            session_id, participant_id, name
        )

    async def delete_session(self, session_id: str) -> bool:
        """Delete a session.

        Args:
            session_id: Unique session identifier.

        Returns:
            True if deleted, False if not found.
        """
        return await self._repository.delete(session_id)
