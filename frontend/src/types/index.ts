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
 * Interview session data model, as returned by the backend REST API.
 */
export interface Session {
    /** Unique session identifier */
    id: string;
    /** Current code content */
    code: string;
    /** Programming language for syntax highlighting */
    language: string;
    /** Number of connected participants */
    participant_count: number;
    /** Shareable (relative) URL for the session */
    share_url: string;
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
    /** ID of the participant who sent the message (set by the backend) */
    sender_id?: string;
    /** When the message was created */
    timestamp: string;
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
