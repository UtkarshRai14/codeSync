"""REST API routes for session management.

Provides endpoints for creating, retrieving, and deleting interview sessions.
All endpoints include input validation via Pydantic models.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.dependencies import get_session_service
from app.models.session import Session
from app.services.session_service import SessionService

router = APIRouter(prefix="/api", tags=["sessions"])


class SessionCreateRequest(BaseModel):
    """Request body for creating a new session.

    Attributes:
        language: Programming language for the session.
        code: Initial code content.
    """

    language: str = "python"
    code: str = ""


class SessionResponse(BaseModel):
    """Response model for session data.

    Attributes:
        id: Unique session identifier.
        code: Current code content.
        language: Programming language.
        participant_count: Number of connected participants.
        share_url: URL for sharing the session.
    """

    id: str
    code: str
    language: str
    participant_count: int
    share_url: str


def _session_to_response(session: Session, base_url: str = "") -> SessionResponse:
    """Convert internal Session model to API response.

    Args:
        session: Internal session model.
        base_url: Base URL for generating share links.

    Returns:
        SessionResponse for API clients.
    """
    return SessionResponse(
        id=session.id,
        code=session.code,
        language=session.language,
        participant_count=len(session.participants),
        share_url=f"{base_url}/session/{session.id}",
    )


@router.post(
    "/sessions",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new interview session",
    description=(
        "Creates a new collaborative coding session and returns "
        "the session details with a shareable URL."
    ),
)
async def create_session(
    request: SessionCreateRequest,
    service: SessionService = Depends(get_session_service),
) -> SessionResponse:
    """Create a new interview session.

    Args:
        request: Session creation parameters.
        service: Injected session service.

    Returns:
        Created session details with share URL.
    """
    session = await service.create_session(
        language=request.language,
        code=request.code,
    )
    return _session_to_response(session)


@router.get(
    "/sessions/{session_id}",
    response_model=SessionResponse,
    summary="Get session details",
    description="Retrieve the current state of an interview session by its ID.",
)
async def get_session(
    session_id: str,
    service: SessionService = Depends(get_session_service),
) -> SessionResponse:
    """Get session details by ID.

    Args:
        session_id: Unique session identifier.
        service: Injected session service.

    Returns:
        Session details.

    Raises:
        HTTPException: 404 if session not found.
    """
    session = await service.get_session(session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found",
        )
    return _session_to_response(session)


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a session",
    description="Permanently delete an interview session.",
)
async def delete_session(
    session_id: str,
    service: SessionService = Depends(get_session_service),
) -> None:
    """Delete a session.

    Args:
        session_id: Unique session identifier.
        service: Injected session service.

    Raises:
        HTTPException: 404 if session not found.
    """
    deleted = await service.delete_session(session_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found",
        )
