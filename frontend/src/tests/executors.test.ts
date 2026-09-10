/**
 * Tests for executor factory and executors.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getExecutor, isExecutable, executeCode } from '../lib/executors';
import { JavaScriptExecutor } from '../lib/executors/javascript';

describe('getExecutor', () => {
    it('returns JavaScriptExecutor for javascript', () => {
        const executor = getExecutor('javascript');
        expect(executor).toBeInstanceOf(JavaScriptExecutor);
    });

    it('returns null for unsupported languages', () => {
        const executor = getExecutor('ruby');
        expect(executor).toBeNull();
    });

    it('caches executor instances', () => {
        const executor1 = getExecutor('javascript');
        const executor2 = getExecutor('javascript');
        expect(executor1).toBe(executor2);
    });
});

describe('isExecutable', () => {
    it('returns true for python', () => {
        expect(isExecutable('python')).toBe(true);
    });

    it('returns true for javascript', () => {
        expect(isExecutable('javascript')).toBe(true);
    });

    it('returns false for unsupported languages', () => {
        expect(isExecutable('java')).toBe(false);
        expect(isExecutable('rust')).toBe(false);
        expect(isExecutable('go')).toBe(false);
    });
});

describe('executeCode', () => {
    it('executes javascript code successfully', async () => {
        const result = await executeCode('javascript', 'console.log("hello");');
        expect(result.success).toBe(true);
        expect(result.stdout).toBe('hello');
    });

    it('captures javascript errors', async () => {
        const result = await executeCode('javascript', 'throw new Error("test error");');
        expect(result.success).toBe(false);
        expect(result.error).toContain('test error');
    });

    it('returns error for unsupported languages', async () => {
        const result = await executeCode('ruby', 'puts "hello"');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Unsupported language');
    });
});

describe('JavaScriptExecutor', () => {
    let executor: JavaScriptExecutor;

    beforeEach(() => {
        executor = new JavaScriptExecutor();
    });

    it('is always ready', async () => {
        expect(await executor.isReady()).toBe(true);
    });

    it('executes simple code', async () => {
        const result = await executor.execute('console.log(1 + 2);');
        expect(result.success).toBe(true);
        expect(result.stdout).toBe('3');
    });

    it('captures multiple console logs', async () => {
        const result = await executor.execute(`
      console.log('line1');
      console.log('line2');
    `);
        expect(result.stdout).toBe('line1\nline2');
    });

    it('captures console.error', async () => {
        const result = await executor.execute('console.error("error msg");');
        expect(result.stderr).toBe('error msg');
    });

    it('reports execution time', async () => {
        const result = await executor.execute('console.log("test");');
        expect(result.executionTime).toBeGreaterThan(0);
    });

    it('handles syntax errors', async () => {
        const result = await executor.execute('function {');
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });
});
