/**
 * Tests for executor imports and type resolution.
 * Reproduces and verifies fix for CodeExecutor export issue.
 */
import { describe, it, expect } from 'vitest';

describe('Executor Module Imports', () => {
    describe('Import Resolution', () => {
        it('imports getExecutor without runtime errors', async () => {
            // This test verifies that the module can be imported without
            // "does not provide an export named 'CodeExecutor'" error
            const module = await import('../lib/executors');
            expect(module.getExecutor).toBeDefined();
            expect(typeof module.getExecutor).toBe('function');
        });

        it('imports isExecutable without runtime errors', async () => {
            const module = await import('../lib/executors');
            expect(module.isExecutable).toBeDefined();
            expect(typeof module.isExecutable).toBe('function');
        });

        it('imports executeCode without runtime errors', async () => {
            const module = await import('../lib/executors');
            expect(module.executeCode).toBeDefined();
            expect(typeof module.executeCode).toBe('function');
        });

        it('imports JavaScriptExecutor class', async () => {
            const module = await import('../lib/executors');
            expect(module.JavaScriptExecutor).toBeDefined();
        });

        it('imports PythonExecutor class', async () => {
            const module = await import('../lib/executors');
            expect(module.PythonExecutor).toBeDefined();
        });
    });

    describe('Base Module Exports', () => {
        it('exports DEFAULT_TIMEOUT constant', async () => {
            const base = await import('../lib/executors/base');
            expect(base.DEFAULT_TIMEOUT).toBe(5000);
        });

        it('exports createTimeoutPromise function', async () => {
            const base = await import('../lib/executors/base');
            expect(typeof base.createTimeoutPromise).toBe('function');
        });
    });

    describe('Factory Pattern', () => {
        it('creates JavaScriptExecutor for javascript', async () => {
            const { getExecutor, JavaScriptExecutor } = await import('../lib/executors');
            const executor = getExecutor('javascript');
            expect(executor).toBeInstanceOf(JavaScriptExecutor);
        });

        it('creates PythonExecutor for python', async () => {
            const { getExecutor, PythonExecutor } = await import('../lib/executors');
            const executor = getExecutor('python');
            expect(executor).toBeInstanceOf(PythonExecutor);
        });

        it('returns null for unsupported language', async () => {
            const { getExecutor } = await import('../lib/executors');
            const executor = getExecutor('cobol');
            expect(executor).toBeNull();
        });
    });
});
