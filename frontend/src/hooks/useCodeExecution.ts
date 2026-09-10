/**
 * Hook for code execution using WASM runtimes.
 * @module hooks/useCodeExecution
 */

import { useCallback, useState } from 'react';
import type { ExecutionResult } from '../types';
import { executeCode, isExecutable } from '../lib/executors';

/** Execution state */
export interface UseCodeExecutionReturn {
    /** Whether code is currently executing */
    isExecuting: boolean;
    /** Most recent execution result */
    result: ExecutionResult | null;
    /** Whether the current language supports execution */
    isSupported: boolean;
    /** Whether the runtime is loading */
    isLoading: boolean;
    /** Execute code */
    execute: (code: string) => Promise<ExecutionResult>;
    /** Clear the result */
    clearResult: () => void;
}

/**
 * Custom hook for executing code in the browser using WASM.
 * Supports Python (via Pyodide) and JavaScript.
 *
 * @param language - Programming language to execute
 * @returns Execution state and functions
 */
export function useCodeExecution(language: string): UseCodeExecutionReturn {
    const [isExecuting, setIsExecuting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ExecutionResult | null>(null);

    const isSupported = isExecutable(language);

    /**
     * Executes the provided code.
     * @param code - Source code to execute
     * @returns Execution result
     */
    const execute = useCallback(
        async (code: string): Promise<ExecutionResult> => {
            if (!isSupported) {
                const unsupportedResult: ExecutionResult = {
                    stdout: '',
                    stderr: `Execution not supported for ${language}`,
                    success: false,
                    error: 'Unsupported language',
                };
                setResult(unsupportedResult);
                return unsupportedResult;
            }

            setIsExecuting(true);
            setIsLoading(true);

            try {
                const executionResult = await executeCode(language, code);
                setResult(executionResult);
                return executionResult;
            } catch (err) {
                const errorResult: ExecutionResult = {
                    stdout: '',
                    stderr: err instanceof Error ? err.message : 'Execution failed',
                    success: false,
                    error: err instanceof Error ? err.message : 'Unknown error',
                };
                setResult(errorResult);
                return errorResult;
            } finally {
                setIsExecuting(false);
                setIsLoading(false);
            }
        },
        [language, isSupported]
    );

    /**
     * Clears the current execution result.
     */
    const clearResult = useCallback(() => {
        setResult(null);
    }, []);

    return {
        isExecuting,
        result,
        isSupported,
        isLoading,
        execute,
        clearResult,
    };
}
