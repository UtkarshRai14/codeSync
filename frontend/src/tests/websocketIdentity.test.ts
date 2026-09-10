import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWebSocket } from '../hooks/useWebSocket';

// Mock WebSocket
class MockWebSocket {
    static instances: MockWebSocket[] = [];

    url: string;
    readyState: number = WebSocket.CONNECTING;
    onopen: (() => void) | null = null;
    onclose: ((event: { code: number }) => void) | null = null;
    onerror: (() => void) | null = null;

    constructor(url: string) {
        this.url = url;
        MockWebSocket.instances.push(this);
    }

    close = vi.fn();
}

describe('useWebSocket Identity', () => {
    beforeEach(() => {
        MockWebSocket.instances = [];
        vi.stubGlobal('WebSocket', MockWebSocket);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('includes name in query params', () => {
        renderHook(() => useWebSocket('session-1', {
            name: 'Alice',
            enabled: true
        }));

        const ws = MockWebSocket.instances[0];
        expect(ws.url).toContain('name=Alice');
    });

    it('includes participantId in query params', () => {
        renderHook(() => useWebSocket('session-1', {
            participantId: 'user-123',
            enabled: true
        }));

        const ws = MockWebSocket.instances[0];
        expect(ws.url).toContain('participant_id=user-123');
    });

    it('includes both params', () => {
        renderHook(() => useWebSocket('session-1', {
            name: 'Bob',
            participantId: 'user-456',
            enabled: true
        }));

        const ws = MockWebSocket.instances[0];
        expect(ws.url).toContain('name=Bob');
        expect(ws.url).toContain('participant_id=user-456');
    });
});
