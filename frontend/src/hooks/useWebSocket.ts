/**
 * WebSocket hook for real-time session synchronization.
 * @module hooks/useWebSocket
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WebSocketMessage, Participant } from '../types';
import { getWebSocketUrl } from '../lib/api';

/** WebSocket connection states */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

/** Raw sync_response payload from backend (snake_case keys) */
interface SyncResponseRawPayload {
    participant_id: string;
    participant_name: string;
    participant_color: string;
    participants: Participant[];
    code: string;
    language: string;
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
    /** Latest received message */
    lastMessage: WebSocketMessage | null;
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
    const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const messageQueueRef = useRef<WebSocketMessage[]>([]);
    const reconnectAttemptsRef = useRef(0);
    const shouldReconnectRef = useRef(true);

    // Store callbacks in refs to avoid recreating connect function
    const onCodeUpdateRef = useRef(onCodeUpdate);
    const onLanguageChangeRef = useRef(onLanguageChange);

    // Update refs when callbacks change
    useEffect(() => {
        onCodeUpdateRef.current = onCodeUpdate;
        onLanguageChangeRef.current = onLanguageChange;
    }, [onCodeUpdate, onLanguageChange]);

    /**
     * Sends a message through the WebSocket.
     * Queues messages if not connected.
     */
    const sendMessage = useCallback(
        (message: Omit<WebSocketMessage, 'timestamp'>) => {
            const fullMessage: WebSocketMessage = {
                ...message,
                timestamp: new Date().toISOString(),
            };

            if (wsRef.current?.readyState === WebSocket.OPEN) {
                // console.log(`[useWebSocket] Sending:`, message.type);
                wsRef.current.send(JSON.stringify(fullMessage));
            } else {
                console.warn('[useWebSocket] Queueing message (not connected). ReadyState:', wsRef.current?.readyState);
                // Queue message for when connection is restored
                messageQueueRef.current.push(fullMessage);
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

        const url = getWebSocketUrl(sessionId, {
            participantId: options.participantId,
            name: options.name,
        });

        try {
            const ws = new WebSocket(url);
            // @ts-expect-error - adding debug ID for development
            ws._debugId = Math.random().toString(36).substring(7);

            // console.log(`[useWebSocket] Created socket for ${url}`);

            ws.onopen = () => {
                // Guard against stale socket events
                if (ws !== wsRef.current) return;

                // console.log(`[useWebSocket] WebSocket OPEN (ID: ${socketId})`);
                setConnectionState('connected');
                reconnectAttemptsRef.current = 0; // Reset reconnect attempts on success
                flushMessageQueue();
            };

            ws.onclose = (event) => {
                // Guard: Only react if this is the active socket
                if (ws !== wsRef.current) {
                    // console.log(`[useWebSocket] Ignoring close event from stale socket (ID: ${socketId})`);
                    return;
                }

                // console.log(`[useWebSocket] WebSocket CLOSED (ID: ${socketId}) code=${event.code} reason=${event.reason}`);
                setConnectionState('disconnected');
                wsRef.current = null;

                // Don't reconnect if:
                // - Explicitly disconnected (code 1000)
                // - Session not found (403 becomes close with specific code)
                // - shouldReconnect is false
                // - Max reconnect attempts reached
                const shouldReconnect =
                    shouldReconnectRef.current &&
                    event.code !== 1000 && // Normal closure
                    event.code !== 4003 && // Custom: session not found
                    reconnectAttemptsRef.current < 5;

                if (shouldReconnect) {
                    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 16000);
                    reconnectAttemptsRef.current++;

                    reconnectTimeoutRef.current = setTimeout(() => {
                        if (sessionId && shouldReconnectRef.current) {
                            connect();
                        }
                    }, delay);
                }
            };

            ws.onerror = () => {
                // Guard against stale socket events
                if (ws !== wsRef.current) return;

                // console.error(`[useWebSocket] WebSocket ERROR (ID: ${socketId}):`, error);
                // Error will be followed by close event
                setConnectionState('error');
            };

            ws.onmessage = (event) => {
                // Guard against stale socket events
                if (ws !== wsRef.current) return;

                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    setLastMessage(message);

                    switch (message.type) {
                        case 'sync_response': {
                            // Backend sends snake_case keys
                            const payload = message.payload as unknown as SyncResponseRawPayload;
                            setCurrentParticipant({
                                id: payload.participant_id,
                                name: payload.participant_name,
                                color: payload.participant_color,
                            });
                            setParticipants(payload.participants || []);
                            onCodeUpdateRef.current?.(payload.code, payload.language);
                            break;
                        }

                        case 'code_update': {
                            const { code, language } = message.payload as { code: string; language?: string };
                            // console.log('[useWebSocket] Received code_update:', { codeLength: code.length, language });
                            onCodeUpdateRef.current?.(code, language);
                            break;
                        }

                        case 'language_change': {
                            const { language } = message.payload as { language: string };
                            onLanguageChangeRef.current?.(language);
                            break;
                        }

                        case 'user_joined': {
                            const newParticipant: Participant = {
                                id: message.payload.participant_id as string,
                                name: message.payload.participant_name as string,
                                color: message.payload.participant_color as string,
                            };
                            setParticipants((prev) => [...prev, newParticipant]);
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
                            if (currentParticipant?.id === participant_id) {
                                setCurrentParticipant((prev) => (prev ? { ...prev, name } : null));
                            }
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, enabled, flushMessageQueue, options.participantId, options.name]);

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
        lastMessage,
        reconnect,
    };
}
