/**
 * Executor factory implementing the Factory Pattern.
 * Creates appropriate code executors based on language.
 * @module lib/executors
 */

import type { ExecutionResult } from '../../types';
import type { CodeExecutor } from './base';
import { JavaScriptExecutor } from './javascript';
import { PythonExecutor } from './python';

/** Singleton instances of executors */
const executors: Map<string, CodeExecutor> = new Map();

/**
 * Gets or creates an executor for the specified language.
 * Implements Factory Pattern with singleton caching.
 * @param language - Programming language
 * @returns CodeExecutor instance or null if unsupported
 */
export function getExecutor(language: string): CodeExecutor | null {
    // Return cached instance if available
    if (executors.has(language)) {
        return executors.get(language)!;
    }

    // Create new executor based on language
    let executor: CodeExecutor | null = null;

    switch (language) {
        case 'python':
            executor = new PythonExecutor();
            break;
        case 'javascript':
            executor = new JavaScriptExecutor();
            break;
        default:
            return null;
    }

    // Cache and return
    executors.set(language, executor);
    return executor;
}

/**
 * Checks if a language supports browser-based execution.
 * @param language - Programming language
 * @returns True if execution is supported
 */
export function isExecutable(language: string): boolean {
    return language === 'python' || language === 'javascript';
}

/**
 * Executes code in the specified language.
 * @param language - Programming language
 * @param code - Source code to execute
 * @param timeout - Maximum execution time
 * @returns Execution result
 */
export async function executeCode(
    language: string,
    code: string,
    timeout?: number
): Promise<ExecutionResult> {
    const executor = getExecutor(language);

    if (!executor) {
        return {
            stdout: '',
            stderr: `Execution not supported for ${language}. Only Python and JavaScript are supported.`,
            success: false,
            error: 'Unsupported language',
        };
    }

    // Initialize if needed
    if (!(await executor.isReady())) {
        await executor.initialize();
    }

    return executor.execute(code, timeout);
}

// Re-export types
export type { CodeExecutor } from './base';
export { JavaScriptExecutor } from './javascript';
export { PythonExecutor } from './python';
