import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SessionPage } from '../pages/Session';
import { ApiError } from '../lib/api';

// Mock the API module
vi.mock('../lib/api', () => ({
    getSession: vi.fn(),
    getWebSocketUrl: vi.fn(),
    ApiError: class extends Error {
        status: number;
        detail?: string;
        constructor(message: string, status: number, detail?: string) {
            super(message);
            this.status = status;
            this.detail = detail;
        }
    }
}));

// Mock hooks
vi.mock('../hooks/useWebSocket', () => ({
    useWebSocket: () => ({
        connectionState: 'disconnected',
        participants: [],
        currentParticipant: null,
        sendMessage: vi.fn(),
    })
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

import { getSession } from '../lib/api';

describe('SessionPage Error Handling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('displays error message when session is not found (404)', async () => {
        // Mock API error
        vi.mocked(getSession).mockRejectedValue(new ApiError('API Error: 404', 404, 'Session not found'));

        render(
            <MemoryRouter initialEntries={['/session/non-existent-id']}>
                <Routes>
                    <Route path="/session/:sessionId" element={<SessionPage />} />
                </Routes>
            </MemoryRouter>
        );

        // Should verify loading state first? Maybe too fast.

        // Wait for error message
        await waitFor(() => {
            expect(screen.getByText('Session not found')).toBeDefined();
        });

        // Check for back button
        expect(screen.getByText('Back to Home')).toBeDefined();
    });
});
