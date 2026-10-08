/**
 * Tests for useCodeExecution hook.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCodeExecution } from '../hooks/useCodeExecution';

describe('useCodeExecution', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('initializes with default state', () => {
        const { result } = renderHook(() => useCodeExecution('javascript'));

        expect(result.current.isExecuting).toBe(false);
        expect(result.current.result).toBeNull();
        expect(result.current.isSupported).toBe(true);
    });

    it('marks unsupported languages correctly', () => {
        const { result } = renderHook(() => useCodeExecution('java'));

        expect(result.current.isSupported).toBe(false);
    });

    it('executes JavaScript code', async () => {
        const { result } = renderHook(() => useCodeExecution('javascript'));

        await act(async () => {
            await result.current.execute('console.log("test");');
        });

        await waitFor(() => {
            expect(result.current.result).not.toBeNull();
            expect(result.current.result?.success).toBe(true);
            expect(result.current.result?.stdout).toBe('test');
        });
    });

    it('handles execution errors', async () => {
        const { result } = renderHook(() => useCodeExecution('javascript'));

        await act(async () => {
            await result.current.execute('throw new Error("test error");');
        });

        await waitFor(() => {
            expect(result.current.result?.success).toBe(false);
            expect(result.current.result?.error).toContain('test error');
        });
    });

    it('clears result when clearResult is called', async () => {
        const { result } = renderHook(() => useCodeExecution('javascript'));

        await act(async () => {
            await result.current.execute('console.log("test");');
        });

        await waitFor(() => {
            expect(result.current.result).not.toBeNull();
        });

        act(() => {
            result.current.clearResult();
        });

        expect(result.current.result).toBeNull();
    });

    it('returns unsupported error for unsupported languages', async () => {
        const { result } = renderHook(() => useCodeExecution('ruby'));

        await act(async () => {
            await result.current.execute('puts "hello"');
        });

        await waitFor(() => {
            expect(result.current.result?.success).toBe(false);
            expect(result.current.result?.error).toBe('Unsupported language');
        });
    });
});
