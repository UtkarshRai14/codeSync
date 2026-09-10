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
});
