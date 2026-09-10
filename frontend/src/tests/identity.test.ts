import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getWebSocketUrl } from '../lib/api';

describe('Identity Persistence', () => {
    describe('getWebSocketUrl', () => {
        it('should append participantId and name to query params', () => {
            const url = getWebSocketUrl('session-123', {
                participantId: 'user-456',
                name: 'Alice',
            });
            expect(url).toContain('ws/session-123');
            expect(url).toContain('participant_id=user-456');
            expect(url).toContain('name=Alice');
        });

        it('should handle missing params', () => {
            const url = getWebSocketUrl('session-123');
            expect(url).toContain('ws/session-123');
            expect(url).not.toContain('participant_id=');
            expect(url).not.toContain('name=');
        });
    });

    describe('LocalStorage Logic', () => {
        beforeEach(() => {
            localStorage.clear();
            vi.clearAllMocks();
        });

        it('should store preferred name', () => {
            localStorage.setItem('code_sync_preferred_name', 'Bob');
            expect(localStorage.getItem('code_sync_preferred_name')).toBe('Bob');
        });

        it('should store identity for session', () => {
            const sessionId = 'abc-123';
            const identity = { name: 'Charlie', participantId: 'p-789' };
            localStorage.setItem(`code_sync_identity_${sessionId}`, JSON.stringify(identity));

            const stored = localStorage.getItem(`code_sync_identity_${sessionId}`);
            expect(JSON.parse(stored!)).toEqual(identity);
        });
    });
});
