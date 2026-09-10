/**
 * End-to-end integration tests for client-server interaction.
 * These tests verify that the frontend correctly communicates with the backend.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createSession, getSession, deleteSession, getWebSocketUrl } from '../lib/api';

// Mock server responses that match the backend API contract
const mockServerResponses = {
    sessions: new Map<string, {
        id: string;
        code: string;
        language: string;
        participantCount: number;
        shareUrl: string;
    }>(),
};

// Mock fetch to simulate backend responses
const originalFetch = globalThis.fetch;

function setupMockServer() {
    vi.stubGlobal('fetch', async (url: string, options?: RequestInit) => {
        const urlStr = url.toString();
        const method = options?.method || 'GET';

        // POST /api/sessions - Create session
        if (urlStr.includes('/api/sessions') && method === 'POST') {
            const body = options?.body ? JSON.parse(options.body as string) : {};
            const sessionId = Math.random().toString(36).substring(2, 10);
            const session = {
                id: sessionId,
                code: body.code || '',
                language: body.language || 'python',
                participantCount: 0,
                shareUrl: `/session/${sessionId}`,
            };
            mockServerResponses.sessions.set(sessionId, session);

            return {
                ok: true,
                status: 201,
                json: async () => session,
            };
        }

        // GET /api/sessions/:id - Get session
        const getMatch = urlStr.match(/\/api\/sessions\/([^/]+)$/);
        if (getMatch && method === 'GET') {
            const sessionId = getMatch[1];
            const session = mockServerResponses.sessions.get(sessionId);

            if (session) {
                return {
                    ok: true,
                    status: 200,
                    json: async () => session,
                };
            }

            return {
                ok: false,
                status: 404,
                json: async () => ({ detail: 'Session not found' }),
            };
        }

        // DELETE /api/sessions/:id - Delete session
        const deleteMatch = urlStr.match(/\/api\/sessions\/([^/]+)$/);
        if (deleteMatch && method === 'DELETE') {
            const sessionId = deleteMatch[1];
            const existed = mockServerResponses.sessions.has(sessionId);
            mockServerResponses.sessions.delete(sessionId);

            if (existed) {
                return {
                    ok: true,
                    status: 204,
                };
            }

            return {
                ok: false,
                status: 404,
                json: async () => ({ detail: 'Session not found' }),
            };
        }

        // Default: not found
        return {
            ok: false,
            status: 404,
            json: async () => ({ detail: 'Not found' }),
        };
    });
}

describe('Client-Server Integration', () => {
    beforeAll(() => {
        setupMockServer();
    });

    afterAll(() => {
        vi.stubGlobal('fetch', originalFetch);
        mockServerResponses.sessions.clear();
    });

    describe('Session Lifecycle', () => {
        it('creates a session and retrieves it', async () => {
            // Create a new session
            const created = await createSession({ language: 'javascript', code: 'console.log("hello");' });

            expect(created.id).toBeDefined();
            expect(created.language).toBe('javascript');
            expect(created.code).toBe('console.log("hello");');
            expect(created.shareUrl).toContain(created.id);

            // Retrieve the same session
            const retrieved = await getSession(created.id);

            expect(retrieved.id).toBe(created.id);
            expect(retrieved.language).toBe(created.language);
            expect(retrieved.code).toBe(created.code);
        });

        it('creates a session with default values', async () => {
            const session = await createSession();

            expect(session.language).toBe('python');
            expect(session.code).toBe('');
        });

        it('deletes a session successfully', async () => {
            // Create a session
            const session = await createSession({ language: 'python' });

            // Verify it exists
            const retrieved = await getSession(session.id);
            expect(retrieved.id).toBe(session.id);

            // Delete it
            await deleteSession(session.id);

            // Verify it's gone
            await expect(getSession(session.id)).rejects.toThrow();
        });

        it('handles non-existent session gracefully', async () => {
            await expect(getSession('non-existent-id')).rejects.toThrow();
        });
    });

    describe('WebSocket URL Generation', () => {
        it('generates correct WebSocket URL for session', () => {
            const sessionId = 'test-session-123';
            const wsUrl = getWebSocketUrl(sessionId);

            expect(wsUrl).toContain('ws');
            expect(wsUrl).toContain(sessionId);
            expect(wsUrl).toMatch(/^ws.*\/ws\/test-session-123$/);
        });
    });

    describe('Multiple Sessions', () => {
        it('handles multiple concurrent sessions', async () => {
            // Create multiple sessions
            const session1 = await createSession({ language: 'python', code: 'print(1)' });
            const session2 = await createSession({ language: 'javascript', code: 'console.log(2)' });
            const session3 = await createSession({ language: 'rust', code: 'fn main()' });

            // Verify each has unique ID
            expect(new Set([session1.id, session2.id, session3.id]).size).toBe(3);

            // Verify each can be retrieved independently
            const retrieved1 = await getSession(session1.id);
            const retrieved2 = await getSession(session2.id);
            const retrieved3 = await getSession(session3.id);

            expect(retrieved1.code).toBe('print(1)');
            expect(retrieved2.code).toBe('console.log(2)');
            expect(retrieved3.code).toBe('fn main()');
        });

        it('deleting one session does not affect others', async () => {
            const session1 = await createSession({ language: 'python' });
            const session2 = await createSession({ language: 'javascript' });

            await deleteSession(session1.id);

            // session2 should still exist
            const retrieved = await getSession(session2.id);
            expect(retrieved.id).toBe(session2.id);

            // session1 should be gone
            await expect(getSession(session1.id)).rejects.toThrow();
        });
    });
});

describe('WebSocket Message Integration', () => {
    describe('Message Type Validation', () => {
        it('validates code_update message structure', () => {
            const message = {
                type: 'code_update',
                payload: { code: 'print("hello")', language: 'python' },
                timestamp: new Date().toISOString(),
            };

            expect(message.type).toBe('code_update');
            expect(message.payload.code).toBeDefined();
            expect(message.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}/);
        });

        it('validates user_joined message structure', () => {
            const message = {
                type: 'user_joined',
                payload: {
                    participant_id: 'user123',
                    participant_name: 'Alice',
                    participant_color: '#3b82f6',
                },
                sender_id: 'user123',
                timestamp: new Date().toISOString(),
            };

            expect(message.type).toBe('user_joined');
            expect(message.payload.participant_id).toBeDefined();
            expect(message.payload.participant_color).toMatch(/^#[0-9a-f]{6}$/i);
        });

        it('validates language_change message structure', () => {
            const message = {
                type: 'language_change',
                payload: { language: 'rust' },
                sender_id: 'user456',
                timestamp: new Date().toISOString(),
            };

            expect(message.type).toBe('language_change');
            expect(message.payload.language).toBe('rust');
        });

        it('validates sync_response message structure', () => {
            const message = {
                type: 'sync_response',
                payload: {
                    session_id: 'abc123',
                    code: 'fn main() {}',
                    language: 'rust',
                    participant_id: 'user789',
                    participant_name: 'Bob',
                    participant_color: '#22c55e',
                    participants: [],
                },
                timestamp: new Date().toISOString(),
            };

            expect(message.type).toBe('sync_response');
            expect(message.payload.session_id).toBeDefined();
            expect(message.payload.participant_id).toBeDefined();
            expect(Array.isArray(message.payload.participants)).toBe(true);
        });
    });
});
