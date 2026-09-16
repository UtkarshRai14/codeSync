/**
 * Shared TypeScript interfaces for CodeSync.
 * @module types
 */

/**
 * Represents a participant in an interview session.
 */
export interface Participant {
    /** Unique identifier for the participant */
    id: string;
    /** Display name of the participant */
    name: string;
    /** Hex color for cursor/selection highlighting */
    color: string;
    /** Current cursor position in the editor */
    cursorPosition?: CursorPosition;
    /** Current active selection, if present */
    selection?: SelectionRange;
}

/**
 * Cursor position in the code editor.
 */
export interface CursorPosition {
    /** Line number (1-indexed) */
    line: number;
    /** Column number (1-indexed) */
    column: number;
}

/**
 * Active editor selection range.
 */
export interface SelectionRange {
    /** 1-indexed start line */
    startLine: number;
    /** 1-indexed start column */
    startColumn: number;
    /** 1-indexed end line */
    endLine: number;
    /** 1-indexed end column */
    endColumn: number;
}

/**
 * Interview session data model.
 */
export interface Session {
    /** Unique session identifier */
    id: string;
    /** Current code content */
    code: string;
    /** Programming language for syntax highlighting */
    language: string;
    /** Number of connected participants */
    participantCount: number;
    /** Shareable URL for the session */
    shareUrl: string;
}

/**
 * Request payload for creating a new session.
 */
export interface CreateSessionRequest {
    /** Programming language (default: 'python') */
    language?: string;
    /** Initial code content (default: '') */
    code?: string;
}

/**
 * WebSocket message types for real-time communication.
 */
export type MessageType =
    | 'code_update'
    | 'cursor_position'
    | 'user_joined'
    | 'user_left'
    | 'language_change'
    | 'name_change'
    | 'sync_request'
    | 'sync_response';

/**
 * WebSocket message structure.
 */
export interface WebSocketMessage {
    /** Message type indicating the action */
    type: MessageType;
    /** Message data specific to the type */
    payload: Record<string, unknown>;
    /** ID of the participant who sent the message */
    senderId?: string;
    /** When the message was created */
    timestamp: string;
}

/**
 * Payload for code update messages.
 */
export interface CodeUpdatePayload {
    /** Updated code content */
    code: string;
    /** Optional language change */
    language?: string;
}

/**
 * Payload for sync response messages.
 */
export interface SyncResponsePayload {
    /** Session ID */
    sessionId: string;
    /** Current code content */
    code: string;
    /** Current language */
    language: string;
    /** This participant's ID */
    participantId: string;
    /** This participant's name */
    participantName: string;
    /** This participant's color */
    participantColor: string;
    /** List of other participants */
    participants: Participant[];
}

/**
 * Code execution result from WASM runtime.
 */
export interface ExecutionResult {
    /** Standard output from execution */
    stdout: string;
    /** Standard error from execution */
    stderr: string;
    /** Whether execution completed successfully */
    success: boolean;
    /** Execution time in milliseconds */
    executionTime?: number;
    /** Error message if execution failed */
    error?: string;
}

/**
 * Supported programming languages.
 */
export const SUPPORTED_LANGUAGES = [
    { id: 'python', name: 'Python', extension: '.py' },
    { id: 'javascript', name: 'JavaScript', extension: '.js' },
    { id: 'typescript', name: 'TypeScript', extension: '.ts' },
    { id: 'java', name: 'Java', extension: '.java' },
    { id: 'cpp', name: 'C++', extension: '.cpp' },
    { id: 'go', name: 'Go', extension: '.go' },
    { id: 'rust', name: 'Rust', extension: '.rs' },
] as const;

/**
 * Languages that support browser execution via WASM.
 */
export const EXECUTABLE_LANGUAGES = ['python', 'javascript'] as const;
