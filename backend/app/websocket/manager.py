"""WebSocket connection manager implementing Observer Pattern.

Manages WebSocket connections for real-time collaboration,
broadcasting updates to all participants in a session.
"""

import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections using the Observer Pattern.

    Maintains a registry of active connections grouped by session ID,
    enabling targeted broadcasts to session participants.

    Attributes:
        active_connections: Mapping of session IDs to connected WebSockets.
    """

    def __init__(self) -> None:
        """Initialize the connection manager with empty connections."""
        self.active_connections: dict[str, dict[str, WebSocket]] = {}

    async def connect(
        self, websocket: WebSocket, session_id: str, participant_id: str
    ) -> None:
        """Accept and register a new WebSocket connection.

        Args:
            websocket: The WebSocket connection to register.
            session_id: Session to join.
            participant_id: Unique identifier for the participant.
        """
        await websocket.accept()

        if session_id not in self.active_connections:
            self.active_connections[session_id] = {}

        self.active_connections[session_id][participant_id] = websocket
        logger.info(
            "Participant %s connected to session %s", participant_id, session_id
        )

    def disconnect(
        self, session_id: str, participant_id: str, websocket: WebSocket
    ) -> bool:
        """Remove a WebSocket connection from the registry.

        Args:
            session_id: Session the participant was in.
            participant_id: Participant to remove.
            websocket: The connection requesting removal.

        Returns:
            True if this connection was active and removed, otherwise False.
        """
        connections = self.active_connections.get(session_id)
        if connections is None or connections.get(participant_id) is not websocket:
            return False

        del connections[participant_id]
        if not connections:
            del self.active_connections[session_id]
        logger.info(
            "Participant %s disconnected from session %s",
            participant_id,
            session_id,
        )
        return True

    async def broadcast(
        self,
        session_id: str,
        message: dict[str, Any],
        exclude_participant: str | None = None,
    ) -> None:
        """Broadcast a message to all participants in a session.

        Args:
            session_id: Target session for the broadcast.
            message: Message data to send.
            exclude_participant: Optional participant ID to exclude from broadcast.
        """
        if session_id not in self.active_connections:
            return

        message_json = json.dumps(message, default=str)
        disconnected: list[tuple[str, WebSocket]] = []

        # Iterate over a snapshot: participants may join or leave while awaiting sends
        connections = list(self.active_connections[session_id].items())
        for participant_id, websocket in connections:
            if participant_id == exclude_participant:
                continue

            try:
                await websocket.send_text(message_json)
            except Exception as e:
                logger.warning(
                    "Failed to send to participant %s: %s", participant_id, e
                )
                disconnected.append((participant_id, websocket))

        # Clean up disconnected clients
        for participant_id, websocket in disconnected:
            self.disconnect(session_id, participant_id, websocket)

    async def send_to_participant(
        self, session_id: str, participant_id: str, message: dict[str, Any]
    ) -> bool:
        """Send a message to a specific participant.

        Args:
            session_id: Session containing the participant.
            participant_id: Target participant.
            message: Message data to send.

        Returns:
            True if sent successfully, False otherwise.
        """
        if session_id not in self.active_connections:
            return False

        websocket = self.active_connections[session_id].get(participant_id)
        if websocket is None:
            return False

        try:
            await websocket.send_text(json.dumps(message, default=str))
            return True
        except Exception as e:
            logger.warning("Failed to send to participant %s: %s", participant_id, e)
            self.disconnect(session_id, participant_id, websocket)
            return False

    def get_participant_count(self, session_id: str) -> int:
        """Get the number of connected participants in a session.

        Args:
            session_id: Session to check.

        Returns:
            Number of connected participants.
        """
        if session_id not in self.active_connections:
            return 0
        return len(self.active_connections[session_id])

    def get_session_participants(self, session_id: str) -> list[str]:
        """Get list of participant IDs in a session.

        Args:
            session_id: Session to check.

        Returns:
            List of participant IDs.
        """
        if session_id not in self.active_connections:
            return []
        return list(self.active_connections[session_id].keys())
