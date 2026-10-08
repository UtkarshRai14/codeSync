/**
 * Tests for utility functions.
 */
import { describe, it, expect, vi } from 'vitest';
import { cn, copyToClipboard, debounce } from '../lib/utils';

describe('cn', () => {
    it('merges class names correctly', () => {
        const result = cn('text-red-500', 'text-blue-500');
        expect(result).toBe('text-blue-500');
    });

    it('handles conditional classes', () => {
        const showHidden = false;
        const showVisible = true;
        const result = cn('base', showHidden && 'hidden', showVisible && 'visible');
        expect(result).toBe('base visible');
    });

    it('handles undefined values', () => {
        const result = cn('base', undefined, null, 'active');
        expect(result).toBe('base active');
    });
});

describe('copyToClipboard', () => {
    it('returns true on successful copy', async () => {
        const result = await copyToClipboard('test');
        expect(result).toBe(true);
    });

    it('returns false when clipboard fails', async () => {
        vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('fail'));
        const result = await copyToClipboard('test');
        expect(result).toBe(false);
    });
});

describe('debounce', () => {
    it('debounces function calls', async () => {
        vi.useFakeTimers();
        const fn = vi.fn();
        const debounced = debounce(fn, 100);

        debounced('a');
        debounced('b');
        debounced('c');

        expect(fn).not.toHaveBeenCalled();

        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn).toHaveBeenCalledWith('c');

        vi.useRealTimers();
    });
});
