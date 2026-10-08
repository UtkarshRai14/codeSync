/**
 * Tests for WebSocket connection stability.
 * Verifies that the connection remains stable and doesn't reconnect unnecessarily.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../hooks/useWebSocket';

// Mock WebSocket
class MockWebSocket {
    static instances: MockWebSocket[] = [];
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    url: string;
    readyState: number = WebSocket.CONNECTING;
    onopen: (() => void) | null = null;
    onclose: ((event: { code: number }) => void) | null = null;
    onerror: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;

    constructor(url: string) {
        this.url = url;
        MockWebSocket.instances.push(this);
    }

    send = vi.fn();
    close = vi.fn((code?: number) => {
        this.readyState = WebSocket.CLOSED;
        this.onclose?.({ code: code || 1000 });
    });

    // Helpers for testing
    simulateOpen() {
        this.readyState = WebSocket.OPEN;
        this.onopen?.();
    }

    simulateClose(code: number = 1000) {
        this.readyState = WebSocket.CLOSED;
        this.onclose?.({ code });
    }

    simulateError() {
        this.onerror?.();
    }

    simulateMessage(data: object) {
        this.onmessage?.({ data: JSON.stringify(data) });
    }
}

function syncResponse(overrides: Record<string, unknown> = {}) {
    return {
        type: 'sync_response',
        payload: {
            session_id: 'session123',
            code: '',
            language: 'python',
            participant_id: 'me',
            participant_name: 'Alice',
            participant_color: '#3b82f6',
            participants: [{ id: 'me', name: 'Alice', color: '#3b82f6' }],
            ...overrides,
        },
    };
}

describe('useWebSocket Connection Stability', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllTimers();
        MockWebSocket.instances = [];
        vi.stubGlobal('WebSocket', MockWebSocket);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    describe('Connection Lifecycle', () => {
        it('does not connect when sessionId is null', () => {
            renderHook(() => useWebSocket(null));

            expect(MockWebSocket.instances).toHaveLength(0);
        });

        it('does not connect when enabled is false', () => {
            renderHook(() => useWebSocket('session123', { enabled: false }));

            expect(MockWebSocket.instances).toHaveLength(0);
        });

        it('connects when sessionId is provided and enabled', () => {
            renderHook(() => useWebSocket('session123', { enabled: true }));

            expect(MockWebSocket.instances).toHaveLength(1);
            expect(MockWebSocket.instances[0].url).toContain('session123');
        });

        it('sets connectionState to connected on successful open', async () => {
            const { result } = renderHook(() => useWebSocket('session123'));

            expect(result.current.connectionState).toBe('connecting');

            act(() => {
                MockWebSocket.instances[0].simulateOpen();
            });

            expect(result.current.connectionState).toBe('connected');
        });

        it('cleans up connection on unmount', () => {
            const { unmount } = renderHook(() => useWebSocket('session123'));

            const ws = MockWebSocket.instances[0];
            act(() => ws.simulateOpen());

            unmount();

            expect(ws.close).toHaveBeenCalledWith(1000, 'Component unmounting');
        });
    });

    describe('Reconnection', () => {
        it('keeps edits made while disconnected instead of the stale server snapshot', () => {
            const onCodeUpdate = vi.fn();
            const { result } = renderHook(() => useWebSocket('session123', { onCodeUpdate }));

            const first = MockWebSocket.instances[0];
            act(() => {
                first.simulateOpen();
                first.simulateMessage(syncResponse({ code: 'v1' }));
            });
            onCodeUpdate.mockClear();

            act(() => first.simulateClose(1006));
            act(() => {
                result.current.sendMessage({ type: 'code_update', payload: { code: 'v2' } });
                result.current.sendMessage({ type: 'code_update', payload: { code: 'v3' } });
            });
            act(() => {
                vi.advanceTimersByTime(1000);
            });

            const second = MockWebSocket.instances[1];
            act(() => second.simulateOpen());
            // Queued messages wait for the server's sync_response
            expect(second.send).not.toHaveBeenCalled();

            act(() => second.simulateMessage(syncResponse({ code: 'v1' })));

            expect(onCodeUpdate).not.toHaveBeenCalled();
            // Only the latest queued code snapshot is replayed
            expect(second.send).toHaveBeenCalledTimes(1);
            expect(JSON.parse(second.send.mock.calls[0][0])).toMatchObject({
                type: 'code_update',
                payload: { code: 'v3' },
            });
        });
    });

    describe('Message Handling', () => {
        it('updates the current participant when they rename themselves', () => {
            const { result } = renderHook(() => useWebSocket('session123'));

            const ws = MockWebSocket.instances[0];
            act(() => {
                ws.simulateOpen();
                ws.simulateMessage(syncResponse());
            });
            act(() => {
                ws.simulateMessage({
                    type: 'name_change',
                    payload: { participant_id: 'me', name: 'Alicia' },
                    sender_id: 'me',
                });
            });

            expect(result.current.currentParticipant?.name).toBe('Alicia');
            expect(result.current.participants.find((p) => p.id === 'me')?.name).toBe('Alicia');
        });

        it('does not duplicate a participant who rejoins', () => {
            const { result } = renderHook(() => useWebSocket('session123'));

            const ws = MockWebSocket.instances[0];
            act(() => {
                ws.simulateOpen();
                ws.simulateMessage(syncResponse({
                    participants: [
                        { id: 'me', name: 'Alice', color: '#3b82f6' },
                        { id: 'bob', name: 'Bob', color: '#ef4444' },
                    ],
                }));
                ws.simulateMessage({
                    type: 'user_joined',
                    payload: { participant_id: 'bob', participant_name: 'Bob', participant_color: '#ef4444' },
                    sender_id: 'bob',
                });
            });

            expect(result.current.participants.filter((p) => p.id === 'bob')).toHaveLength(1);
        });
    });
});
