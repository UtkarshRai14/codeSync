/**
 * Unit tests for the API client library.
 * Verifies helper functions for API interaction, including WebSocket URL generation logic.
 * @module tests/api
 */
import { describe, it, expect } from 'vitest';
import { getWebSocketUrl } from '../lib/api';

describe('API Client', () => {
    describe('getWebSocketUrl', () => {
        it('generates basic URL with session ID', () => {
            const url = getWebSocketUrl('test-session');
            expect(url).toMatch(/ws:\/\/.*\/ws\/test-session$/);
        });

        it('includes participantId in query params', () => {
            const url = getWebSocketUrl('test-session', { participantId: 'p123' });
            expect(url).toContain('participant_id=p123');
        });

        it('includes name in query params', () => {
            const url = getWebSocketUrl('test-session', { name: 'Alice' });
            expect(url).toContain('name=Alice');
        });

        it('handles spaces and special characters in name', () => {
            const url = getWebSocketUrl('test-session', { name: 'Alice Bob' });
            // content could be encoded as + or %20 depending on environment
            expect(url).toMatch(/name=Alice(%20|\+)Bob/);
        });

        it('includes both participantId and name', () => {
            const url = getWebSocketUrl('test-session', { participantId: 'p123', name: 'Alice' });
            expect(url).toContain('participant_id=p123');
            expect(url).toContain('name=Alice');
        });

        it('ignores undefined values', () => {
            const url = getWebSocketUrl('test-session', { participantId: undefined, name: undefined });
            expect(url).not.toContain('participant_id');
            expect(url).not.toContain('name');
            expect(url).toMatch(/ws:\/\/.*\/ws\/test-session$/);
        });
    });
});
