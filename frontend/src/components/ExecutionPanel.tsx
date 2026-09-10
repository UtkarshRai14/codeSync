/**
 * Code execution output panel component.
 * @module components/ExecutionPanel
 */

import { motion } from 'framer-motion';
import { Play, Loader2, Terminal, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import type { ExecutionResult } from '../types';

export interface ExecutionPanelProps {
    /** Execution result to display */
    result: ExecutionResult | null;
    /** Whether code is currently executing */
    isExecuting: boolean;
    /** Whether execution is supported for current language */
    isSupported: boolean;
    /** Callback to run code */
    onRun: () => void;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Panel displaying code execution output.
 * Shows stdout, stderr, and execution metrics.
 *
 * @param props - Component props
 * @returns Execution panel component
 */
export function ExecutionPanel({
    result,
    isExecuting,
    isSupported,
    onRun,
    className,
}: ExecutionPanelProps): React.ReactElement {
    return (
        <div className={cn('flex flex-col h-full bg-zinc-900 rounded-lg border border-zinc-700', className)}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-700 p-3">
                <div className="flex items-center gap-2 text-zinc-400">
                    <Terminal className="h-4 w-4" />
                    <span className="text-sm font-medium">Output</span>
                </div>

                <Button
                    size="sm"
                    onClick={onRun}
                    disabled={isExecuting || !isSupported}
                    className="bg-green-600 hover:bg-green-700"
                >
                    {isExecuting ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Running...
                        </>
                    ) : (
                        <>
                            <Play className="h-4 w-4 mr-2" />
                            Run
                        </>
                    )}
                </Button>
            </div>

            {/* Output area */}
            <div className="flex-1 overflow-auto p-4 font-mono text-sm">
                {!isSupported && (
                    <div className="flex items-center gap-2 text-amber-500">
                        <AlertCircle className="h-4 w-4" />
                        <span>Execution only supported for Python and JavaScript</span>
                    </div>
                )}

                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        {/* Stdout */}
                        {result.stdout && (
                            <div>
                                <div className="text-xs text-zinc-500 mb-1">stdout:</div>
                                <pre className="text-green-400 whitespace-pre-wrap">{result.stdout}</pre>
                            </div>
                        )}

                        {/* Stderr */}
                        {result.stderr && (
                            <div>
                                <div className="text-xs text-zinc-500 mb-1">stderr:</div>
                                <pre className="text-red-400 whitespace-pre-wrap">{result.stderr}</pre>
                            </div>
                        )}

                        {/* Execution time */}
                        {result.executionTime !== undefined && (
                            <div className="text-xs text-zinc-500">
                                Executed in {result.executionTime.toFixed(2)}ms
                            </div>
                        )}

                        {/* Success indicator */}
                        <div
                            className={cn(
                                'text-xs',
                                result.success ? 'text-green-500' : 'text-red-500'
                            )}
                        >
                            {result.success ? '✓ Execution completed' : '✗ Execution failed'}
                        </div>
                    </motion.div>
                )}

                {!result && isSupported && (
                    <div className="text-zinc-500 italic">
                        Click "Run" to execute your code
                    </div>
                )}
            </div>
        </div>
    );
}
