/**
 * Abstract base interface for code execution strategies.
 * Implements the Strategy Pattern for language-specific execution.
 * @module lib/executors/base
 */

import type { ExecutionResult } from '../../types';

/**
 * Abstract interface for code executors.
 * Each language implementation provides its own execution strategy.
 */
export interface CodeExecutor {
    /** Language identifier (e.g., 'python', 'javascript') */
    readonly language: string;

    /**
     * Check if the executor is ready to run code.
     * @returns Promise resolving to readiness status
     */
    isReady(): Promise<boolean>;

    /**
     * Initialize the executor runtime.
     * @returns Promise resolving when ready
     */
    initialize(): Promise<void>;

    /**
     * Execute code and return the result.
     * @param code - Source code to execute
     * @param timeout - Maximum execution time in milliseconds
     * @returns Promise resolving to execution result
     */
    execute(code: string, timeout?: number): Promise<ExecutionResult>;
}

/**
 * Default execution timeout in milliseconds.
 */
export const DEFAULT_TIMEOUT = 5000;

/**
 * Creates a timeout promise that rejects after the specified duration.
 * @param ms - Timeout duration in milliseconds
 * @returns Promise that rejects with timeout error
 */
export function createTimeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Execution timed out')), ms);
    });
}
