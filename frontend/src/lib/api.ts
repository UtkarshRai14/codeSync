/**
 * API client for the CodeSync backend.
 * @module lib/api
 */

import type { Session, CreateSessionRequest } from '../types';

/**
 * Base URL for API requests.
 * In production, the frontend is served by FastAPI, so use relative URLs.
 * In development, use VITE_API_URL or localhost:8000.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL ??
    (import.meta.env.DEV ? 'http://localhost:8000' : '');

/**
 * API error class for handling HTTP errors.
 */
export class ApiError extends Error {
    public status: number;
    public detail?: string;

    constructor(
        message: string,
        status: number,
        detail?: string
    ) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.detail = detail;
    }
}

/**
 * Makes a fetch request with error handling.
 * @param url - Request URL
 * @param options - Fetch options
 * @returns Response data
 */
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        ...options,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new ApiError(
            `API Error: ${response.status}`,
            response.status,
            error.detail
        );
    }

    // Handle 204 No Content
    if (response.status === 204) {
        return undefined as T;
    }

    return response.json();
}

/**
 * Creates a new interview session.
 * @param data - Session creation data
 * @returns Created session
 */
export async function createSession(
    data: CreateSessionRequest = {}
): Promise<Session> {
    return apiFetch<Session>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Gets a session by ID.
 * @param sessionId - Session ID
 * @returns Session data
 */
export async function getSession(sessionId: string): Promise<Session> {
    return apiFetch<Session>(`/api/sessions/${sessionId}`);
}

/**
 * Deletes a session by ID.
 * @param sessionId - Session ID
 */
export async function deleteSession(sessionId: string): Promise<void> {
    await apiFetch<void>(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
    });
}

/**
 * Gets the WebSocket URL for a session.
 * @param sessionId - Session ID
 * @param params - Optional participant parameters
 * @returns WebSocket URL
 */
export function getWebSocketUrl(
    sessionId: string,
    params?: { participantId?: string; name?: string }
): string {
    // When API_BASE_URL is empty (production), derive from current location
    let wsBase: string;
    if (API_BASE_URL) {
        wsBase = API_BASE_URL.replace(/^http/, 'ws');
    } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsBase = `${protocol}//${window.location.host}`;
    }

    const url = new URL(`${wsBase}/ws/${sessionId}`);

    if (params?.participantId) {
        url.searchParams.append('participant_id', params.participantId);
    }
    if (params?.name) {
        url.searchParams.append('name', params.name);
    }

    return url.toString();
}
