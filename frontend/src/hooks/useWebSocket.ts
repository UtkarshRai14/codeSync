/**
 * WebSocket hook for real-time session synchronization.
 * @module hooks/useWebSocket
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WebSocketMessage, Participant, SelectionRange } from '../types';
import { getWebSocketUrl } from '../lib/api';

/** WebSocket connection states */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

/** Raw selection payload from backend (snake_case keys) */
interface SelectionRawPayload {
    start_line?: number;
    start_column?: number;
    end_line?: number;
    end_column?: number;
}

/** Raw participant payload from backend (snake_case keys) */
interface ParticipantRawPayload {
    id?: string;
    participant_id?: string;
    participant_name?: string;
    participant_color?: string;
    name?: string;
    color?: string;
    cursor_position?: {
        line?: number;
        column?: number;
    } | null;
    selection?: SelectionRawPayload | null;
}

interface SyncResponseRawPayload {
    participant_id: string;
    participant_name: string;
    participant_color: string;
    participants: ParticipantRawPayload[];
    code: string;
    language: string;
}

function normalizeSelection(selection: SelectionRawPayload | null | undefined): SelectionRange | undefined {
    if (
        selection &&
        typeof selection.start_line === 'number' &&
        typeof selection.start_column === 'number' &&
        typeof selection.end_line === 'number' &&
        typeof selection.end_column === 'number'
    ) {
        return {
            startLine: selection.start_line,
            startColumn: selection.start_column,
            endLine: selection.end_line,
            endColumn: selection.end_column,
        };
    }
    return undefined;
}

function normalizeParticipant(participant: ParticipantRawPayload): Participant {
    const cursorPosition = participant.cursor_position;
    const selection = normalizeSelection(participant.selection);

    return {
        id: participant.id ?? participant.participant_id ?? '',
        name: participant.name ?? participant.participant_name ?? 'Anonymous',
        color: participant.color ?? participant.participant_color ?? '#3b82f6',
        ...(cursorPosition && typeof cursorPosition.line === 'number' && typeof cursorPosition.column === 'number'
            ? {
                  cursorPosition: {
                      line: cursorPosition.line,
                      column: cursorPosition.column,
                  },
              }
            : {}),
        ...(selection ? { selection } : {}),
    };
}

/** WebSocket hook return type */
export interface UseWebSocketReturn {
    /** Current connection state */
    connectionState: ConnectionState;
    /** Connected participants */
    participants: Participant[];
    /** Current participant info */
    currentParticipant: Participant | null;
    /** Send a message through the WebSocket */
    sendMessage: (message: Omit<WebSocketMessage, 'timestamp'>) => void;
    /** Reconnect to the WebSocket */
    reconnect: () => void;
}

/** Options for the WebSocket hook */
export interface UseWebSocketOptions {
    /** Whether to enable the connection (default: true) */
    enabled?: boolean;
    /** Callback for code update messages */
    onCodeUpdate?: (code: string, language?: string) => void;
    /** Callback for language change messages */
    onLanguageChange?: (language: string) => void;
    /** Existing participant ID for session resume */
    participantId?: string;
    /** User display name */
    name?: string;
}

/**
 * Custom hook for managing WebSocket connections to a session.
 * Handles connection lifecycle, message queuing, and auto-reconnection.
 *
 * @param sessionId - ID of the session to connect to
 * @param options - Hook options including callbacks
 * @returns WebSocket state and control functions
 */
export function useWebSocket(
    sessionId: string | null,
    options: UseWebSocketOptions = {}
): UseWebSocketReturn {
    const { enabled = true, onCodeUpdate, onLanguageChange } = options;

    const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const messageQueueRef = useRef<WebSocketMessage[]>([]);
    const reconnectAttemptsRef = useRef(0);
    const shouldReconnectRef = useRef(true);
    // True once the server's sync_response for the current socket has been applied
    const isSyncedRef = useRef(false);

    // Store callbacks in refs to avoid recreating connect function
    const onCodeUpdateRef = useRef(onCodeUpdate);
    const onLanguageChangeRef = useRef(onLanguageChange);
    const participantIdRef = useRef(options.participantId);
    const nameRef = useRef(options.name);

    // Update refs when callbacks change
    useEffect(() => {
        onCodeUpdateRef.current = onCodeUpdate;
        onLanguageChangeRef.current = onLanguageChange;
    }, [onCodeUpdate, onLanguageChange]);

    useEffect(() => {
        participantIdRef.current = options.participantId;
        nameRef.current = options.name;
    }, [options.participantId, options.name]);

    /**
     * Sends a message through the WebSocket.
     * Queues messages until the connection is open and synced.
     */
    const sendMessage = useCallback(
        (message: Omit<WebSocketMessage, 'timestamp'>) => {
            const fullMessage: WebSocketMessage = {
                ...message,
                timestamp: new Date().toISOString(),
            };

            if (wsRef.current?.readyState === WebSocket.OPEN && isSyncedRef.current) {
                wsRef.current.send(JSON.stringify(fullMessage));
            } else {
                // Every message type carries complete state (full code, cursor,
                // language, name), so only the latest message of each type is kept.
                messageQueueRef.current = [
                    ...messageQueueRef.current.filter((queued) => queued.type !== fullMessage.type),
                    fullMessage,
                ];
            }
        },
        []
    );

    /**
     * Flushes queued messages after reconnection.
     */
    const flushMessageQueue = useCallback(() => {
        while (messageQueueRef.current.length > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
            const message = messageQueueRef.current.shift()!;
            wsRef.current.send(JSON.stringify(message));
        }
    }, []);

    /**
     * Connects to the WebSocket server.
     */
    const connect = useCallback(() => {
        if (!sessionId || !enabled) {
            return;
        }

        // Clean up existing connection
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        // Clear any pending reconnect
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        setConnectionState('connecting');
        shouldReconnectRef.current = true;
        isSyncedRef.current = false;

        const url = getWebSocketUrl(sessionId, {
            participantId: participantIdRef.current,
            name: nameRef.current,
        });

        try {
            const ws = new WebSocket(url);

            ws.onopen = () => {
                // Guard against stale socket events
                if (ws !== wsRef.current) return;

                setConnectionState('connected');
                reconnectAttemptsRef.current = 0; // Reset reconnect attempts on success
                // Queued messages are flushed once the server's sync_response arrives
            };

            ws.onclose = (event) => {
                // Guard: Only react if this is the active socket
                if (ws !== wsRef.current) return;

                setConnectionState('disconnected');
                wsRef.current = null;

                // Don't reconnect if:
                // - Explicitly disconnected (code 1000)
                // - Session not found (backend close code 4004)
                // - shouldReconnect is false
                // - Max reconnect attempts reached
                const shouldReconnect =
                    shouldReconnectRef.current &&
                    event.code !== 1000 && // Normal closure
                    event.code !== 4004 && // Session not found
                    reconnectAttemptsRef.current < 5;

                if (shouldReconnect) {
                    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 16000);
                    reconnectAttemptsRef.current++;

                    reconnectTimeoutRef.current = setTimeout(() => {
                        if (sessionId && shouldReconnectRef.current) {
                            // Safe self-reference: the timer fires after `connect` is defined
                            // eslint-disable-next-line react-hooks/immutability
                            connect();
                        }
                    }, delay);
                }
            };

            ws.onerror = () => {
                // Guard against stale socket events
                if (ws !== wsRef.current) return;

                // Error will be followed by close event
                setConnectionState('error');
            };

            ws.onmessage = (event) => {
                // Guard against stale socket events
                if (ws !== wsRef.current) return;

                try {
                    const message: WebSocketMessage = JSON.parse(event.data);

                    switch (message.type) {
                        case 'sync_response': {
                            // Backend sends snake_case keys
                            const payload = message.payload as unknown as SyncResponseRawPayload;
                            setCurrentParticipant(normalizeParticipant({
                                id: payload.participant_id,
                                participant_id: payload.participant_id,
                                participant_name: payload.participant_name,
                                participant_color: payload.participant_color,
                            }));
                            setParticipants((payload.participants || []).map((participant) => normalizeParticipant(participant)));

                            // Local changes queued while disconnected are newer than this
                            // snapshot, so keep them instead of overwriting them.
                            const pendingTypes = new Set(messageQueueRef.current.map((queued) => queued.type));
                            if (!pendingTypes.has('code_update')) {
                                onCodeUpdateRef.current?.(payload.code);
                            }
                            if (!pendingTypes.has('language_change')) {
                                onLanguageChangeRef.current?.(payload.language);
                            }

                            isSyncedRef.current = true;
                            flushMessageQueue();
                            break;
                        }

                        case 'code_update': {
                            const { code, language } = message.payload as { code: string; language?: string };
                            onCodeUpdateRef.current?.(code, language);
                            break;
                        }

                        case 'cursor_position': {
                            const senderId = message.sender_id;
                            if (!senderId) {
                                break;
                            }

                            const { line, column } = message.payload;
                            const rawSelection = message.payload.selection as SelectionRawPayload | null | undefined;
                            const selection = normalizeSelection(rawSelection);

                            setParticipants((prev) =>
                                prev.map((participant) => {
                                    if (participant.id !== senderId) {
                                        return participant;
                                    }

                                    return {
                                        ...participant,
                                        ...(typeof line === 'number' && typeof column === 'number'
                                            ? { cursorPosition: { line, column } }
                                            : {}),
                                        ...(selection
                                            ? { selection }
                                            : rawSelection === null
                                              ? { selection: undefined }
                                              : {}),
                                    };
                                })
                            );
                            break;
                        }

                        case 'language_change': {
                            const { language } = message.payload as { language: string };
                            onLanguageChangeRef.current?.(language);
                            break;
                        }

                        case 'user_joined': {
                            const newParticipant: Participant = normalizeParticipant({
                                id: message.payload.participant_id as string,
                                participant_id: message.payload.participant_id as string,
                                participant_name: message.payload.participant_name as string,
                                participant_color: message.payload.participant_color as string,
                            });
                            // A participant reconnecting with the same ID replaces its old entry
                            setParticipants((prev) => [
                                ...prev.filter((p) => p.id !== newParticipant.id),
                                newParticipant,
                            ]);
                            break;
                        }

                        case 'user_left': {
                            const leftId = message.payload.participant_id as string;
                            setParticipants((prev) => prev.filter((p) => p.id !== leftId));
                            break;
                        }

                        case 'name_change': {
                            const { participant_id, name } = message.payload as { participant_id: string; name: string };
                            setParticipants((prev) =>
                                prev.map((p) => (p.id === participant_id ? { ...p, name } : p))
                            );
                            setCurrentParticipant((prev) =>
                                prev?.id === participant_id ? { ...prev, name } : prev
                            );
                            break;
                        }
                    }
                } catch (err) {
                    console.error('Failed to parse WebSocket message:', err);
                }
            };

            wsRef.current = ws;
        } catch (err) {
            console.error('Failed to create WebSocket:', err);
            setConnectionState('error');
        }
    }, [sessionId, enabled, flushMessageQueue]);

    /**
     * Reconnects to the WebSocket.
     */
    const reconnect = useCallback(() => {
        reconnectAttemptsRef.current = 0;
        shouldReconnectRef.current = true;
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        connect();
    }, [connect]);

    // Connect when sessionId changes and enabled
    useEffect(() => {
        if (sessionId && enabled) {
            connect();
        }

        return () => {
            shouldReconnectRef.current = false;
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close(1000, 'Component unmounting');
                wsRef.current = null;
            }
        };
    }, [sessionId, enabled, connect]);

    return {
        connectionState,
        participants,
        currentParticipant,
        sendMessage,
        reconnect,
    };
}
