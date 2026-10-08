/**
 * JavaScript code executor using the Function constructor.
 * @module lib/executors/javascript
 */

import type { ExecutionResult } from '../../types';
import type { CodeExecutor } from './base';
import { DEFAULT_TIMEOUT, createTimeoutPromise } from './base';

/**
 * JavaScript code executor that captures console output.
 * Code runs on the page's main thread via the Function constructor; only
 * `console` is replaced, other browser globals remain accessible.
 */
export class JavaScriptExecutor implements CodeExecutor {
    readonly language = 'javascript';
    private ready = true;

    /**
     * JavaScript executor is always ready.
     * @returns Promise resolving to true
     */
    async isReady(): Promise<boolean> {
        return this.ready;
    }

    /**
     * No initialization needed for JavaScript.
     */
    async initialize(): Promise<void> {
        // JavaScript execution doesn't need initialization
    }

    /**
     * Execute JavaScript code in a sandboxed environment.
     * @param code - JavaScript code to execute
     * @param timeout - Maximum execution time in milliseconds
     * @returns Execution result with captured console output
     */
    async execute(
        code: string,
        timeout: number = DEFAULT_TIMEOUT
    ): Promise<ExecutionResult> {
        const startTime = performance.now();
        const logs: string[] = [];
        const errors: string[] = [];

        // Create sandboxed console
        const sandboxConsole = {
            log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
            error: (...args: unknown[]) => errors.push(args.map(String).join(' ')),
            warn: (...args: unknown[]) => logs.push(`[warn] ${args.map(String).join(' ')}`),
            info: (...args: unknown[]) => logs.push(`[info] ${args.map(String).join(' ')}`),
        };

        try {
            // Create sandboxed execution environment
            const sandboxedCode = `
        'use strict';
        ${code}
      `;

            // Execute with timeout
            const executePromise = new Promise<void>((resolve, reject) => {
                try {
                    // Create function with sandboxed console
                    const fn = new Function('console', sandboxedCode);
                    fn(sandboxConsole);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });

            await Promise.race([executePromise, createTimeoutPromise(timeout)]);

            const executionTime = performance.now() - startTime;

            return {
                stdout: logs.join('\n'),
                stderr: errors.join('\n'),
                success: true,
                executionTime,
            };
        } catch (err) {
            const executionTime = performance.now() - startTime;
            const errorMessage = err instanceof Error ? err.message : String(err);

            return {
                stdout: logs.join('\n'),
                stderr: errors.join('\n') + '\n' + errorMessage,
                success: false,
                executionTime,
                error: errorMessage,
            };
        }
    }
}
