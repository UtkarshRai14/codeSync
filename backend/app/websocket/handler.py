"""WebSocket endpoint handler for real-time collaboration.

Handles WebSocket connections and message routing for collaborative
code editing sessions.
"""

import json
import logging
import uuid
from datetime import datetime

from fastapi import WebSocket, WebSocketDisconnect

from app.api.dependencies import get_connection_manager, get_session_service
from app.models.session import MessageType

logger = logging.getLogger(__name__)

# Pre-defined colors for participant cursors
PARTICIPANT_COLORS = [
    "#3b82f6",  # Blue
    "#ef4444",  # Red
    "#22c55e",  # Green
    "#f59e0b",  # Amber
    "#8b5cf6",  # Violet
    "#ec4899",  # Pink
    "#06b6d4",  # Cyan
    "#f97316",  # Orange
]


import zlib


def _get_participant_color(participant_id: str) -> str:
    """Get a consistent color for a participant based on their ID.

    Args:
        participant_id: Unique participant identifier.

    Returns:
        Hex color string.
    """
    # Use CRC32 for stable hashing across restarts
    hash_val = zlib.crc32(participant_id.encode())
    return PARTICIPANT_COLORS[hash_val % len(PARTICIPANT_COLORS)]


async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    participant_id: str | None = None,
    name: str | None = None,
) -> None:
    """Handle WebSocket connections for a coding session.

    Args:
        websocket: The WebSocket connection.
        session_id: ID of the session to join.
        participant_id: Optional existing participant ID.
        name: Optional display name.
    """
    manager = get_connection_manager()
    service = get_session_service()

    # Manual retrieval fallback (useful for testing or if injection fails)
    if participant_id is None:
        participant_id = websocket.query_params.get("participant_id")
    if name is None:
        name = websocket.query_params.get("name")

    # Validate session exists
    session = await service.get_session(session_id)
    if session is None:
        await websocket.close(code=4004, reason="Session not found")
        return

    # Generate or reuse participant ID
    if not participant_id:
        participant_id = str(uuid.uuid4())[:8]

    # Check if participant already exists in session
    # (unlikely if they disconnected, but good for active checks)
    existing_participant = None
    if session and session.participants:
        for p in session.participants:
            if p.id == participant_id:
                existing_participant = p
                break

    # Assign deterministic color
    participant_color = _get_participant_color(participant_id)

    if not name:
        if existing_participant:
             participant_name = existing_participant.name
        else:
             participant_name = f"User {str(participant_id)[:4]}"
    else:
        participant_name = name

    await manager.connect(websocket, session_id, participant_id)

    # Add participant to session
    await service.add_participant(
        session_id, participant_id, participant_name, participant_color
    )

    # Refresh session to include new participant in sync response
    session = await service.get_session(session_id)

    try:
        # Send initial sync to the new participant
        await manager.send_to_participant(
            session_id,
            participant_id,
            {
                "type": MessageType.SYNC_RESPONSE.value,
                "payload": {
                    "session_id": session_id,
                    "code": session.code,
                    "language": session.language,
                    "participant_id": participant_id,
                    "participant_name": participant_name,
                    "participant_color": participant_color,
                    "participants": [
                        {"id": p.id, "name": p.name, "color": p.color}
                        for p in session.participants
                    ],
                },
                "timestamp": datetime.now().isoformat(),
            },
        )

        # Notify others about new participant
        await manager.broadcast(
            session_id,
            {
                "type": MessageType.USER_JOINED.value,
                "payload": {
                    "participant_id": participant_id,
                    "participant_name": participant_name,
                    "participant_color": participant_color,
                },
                "sender_id": participant_id,
                "timestamp": datetime.now().isoformat(),
            },
            exclude_participant=participant_id,
        )

        # Handle incoming messages
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            message_type = message.get("type")
            payload = message.get("payload", {})

            if message_type == MessageType.CODE_UPDATE.value:
                # Update session code
                code = payload.get("code", "")
                language = payload.get("language")
                await service.update_session_code(session_id, code, language)

                # Broadcast to other participants
                await manager.broadcast(
                    session_id,
                    {
                        "type": MessageType.CODE_UPDATE.value,
                        "payload": {"code": code, "language": language},
                        "sender_id": participant_id,
                        "timestamp": datetime.now().isoformat(),
                    },
                    exclude_participant=participant_id,
                )

            elif message_type == MessageType.CURSOR_POSITION.value:
                # Broadcast cursor position to others
                await manager.broadcast(
                    session_id,
                    {
                        "type": MessageType.CURSOR_POSITION.value,
                        "payload": payload,
                        "sender_id": participant_id,
                        "timestamp": datetime.now().isoformat(),
                    },
                    exclude_participant=participant_id,
                )

            elif message_type == MessageType.NAME_CHANGE.value:
                # Update name and broadcast
                new_name = payload.get("name")
                if new_name:
                    await service.update_participant_name(
                        session_id, participant_id, new_name
                    )

                    await manager.broadcast(
                        session_id,
                        {
                            "type": MessageType.NAME_CHANGE.value,
                            "payload": {
                                "participant_id": participant_id,
                                "name": new_name,
                            },
                            "sender_id": participant_id,
                            "timestamp": datetime.now().isoformat(),
                        },
                        # Broadcast to everyone (including sender)
                        exclude_participant=None,
                    )

            elif message_type == MessageType.LANGUAGE_CHANGE.value:
                # Update language and broadcast
                language = payload.get("language", "python")
                session = await service.get_session(session_id)
                if session:
                    await service.update_session_code(
                        session_id, session.code, language
                    )

                await manager.broadcast(
                    session_id,
                    {
                        "type": MessageType.LANGUAGE_CHANGE.value,
                        "payload": {"language": language},
                        "sender_id": participant_id,
                        "timestamp": datetime.now().isoformat(),
                    },
                    exclude_participant=participant_id,
                )

            elif message_type == MessageType.SYNC_REQUEST.value:
                # Send current state to requesting participant
                current_session = await service.get_session(session_id)
                if current_session:
                    await manager.send_to_participant(
                        session_id,
                        participant_id,
                        {
                            "type": MessageType.SYNC_RESPONSE.value,
                            "payload": {
                                "code": current_session.code,
                                "language": current_session.language,
                                "participants": [
                                    {"id": p.id, "name": p.name, "color": p.color}
                                    for p in current_session.participants
                                ],
                            },
                            "timestamp": datetime.now().isoformat(),
                        },
                    )

    except WebSocketDisconnect:
        logger.info("Participant %s disconnected from session %s",
                    participant_id, session_id)
    except Exception as e:
        logger.error("WebSocket error for participant %s: %s", participant_id, e)
    finally:
        # Clean up on disconnect
        was_active = manager.disconnect(session_id, participant_id, websocket)
        if was_active:
            await service.remove_participant(session_id, participant_id)

            # Notify others about departure
            await manager.broadcast(
                session_id,
                {
                    "type": MessageType.USER_LEFT.value,
                    "payload": {"participant_id": participant_id},
                    "sender_id": participant_id,
                    "timestamp": datetime.now().isoformat(),
                },
            )
