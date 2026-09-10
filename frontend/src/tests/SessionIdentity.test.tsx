import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SessionPage } from '../pages/Session';

// Mock API
vi.mock('../lib/api', () => ({
    getSession: vi.fn().mockResolvedValue({
        id: 'test-session',
        code: 'print("hello")',
        language: 'python',
        participantCount: 1,
        shareUrl: 'http://test/session/test-session'
    }),
    getWebSocketUrl: vi.fn().mockReturnValue('ws://test/ws/test-session'),
    ApiError: Error
}));

// Mock Hooks
const mockUseWebSocket = vi.fn();
vi.mock('../hooks/useWebSocket', () => ({
    useWebSocket: (...args: unknown[]) => {
        mockUseWebSocket(...args);
        return {
            connectionState: 'disconnected',
            participants: [],
            currentParticipant: null,
            sendMessage: vi.fn(),
        };
    }
}));

vi.mock('../hooks/useCodeExecution', () => ({
    useCodeExecution: () => ({
        result: null,
        isExecuting: false,
        isSupported: true,
        execute: vi.fn(),
        clearResult: vi.fn(),
    })
}));

describe('SessionPage Identity Logic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('loads preferred name from localStorage and enables connection', async () => {
        // Setup preferred name
        localStorage.setItem('code_sync_preferred_name', 'Test User');

        render(
            <MemoryRouter initialEntries={['/session/test-session']}>
                <Routes>
                    <Route path="/session/:sessionId" element={<SessionPage />} />
                </Routes>
            </MemoryRouter>
        );

        // Wait for session to load
        await waitFor(() => {
            // Check if name is displayed in header (means state was set)
            // Header displays "Connecting..." if name is empty, or the name if set.
            expect(screen.getByText('Test User')).toBeDefined();
        });

        // Check verification of useWebSocket arguments
        // The last call should have enabled: true
        const lastCallArgs = mockUseWebSocket.mock.calls[mockUseWebSocket.mock.calls.length - 1];
        const options = lastCallArgs[1];

        expect(options.enabled).toBe(true);
        expect(options.name).toBe('Test User');
    });

    it('shows dialog and keeps connection disabled if no preferred name', async () => {
        render(
            <MemoryRouter initialEntries={['/session/test-session']}>
                <Routes>
                    <Route path="/session/:sessionId" element={<SessionPage />} />
                </Routes>
            </MemoryRouter>
        );

        // Should see dialog title
        await waitFor(() => {
            expect(screen.getByText('Welcome to CodeSync')).toBeDefined();
        });

        // Connection should be disabled
        const lastCallArgs = mockUseWebSocket.mock.calls[mockUseWebSocket.mock.calls.length - 1];
        const options = lastCallArgs[1];

        expect(options.enabled).toBe(false);
    });
});
