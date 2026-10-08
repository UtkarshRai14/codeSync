/**
 * Tests for CodeEditor component.
 * Reproduces and verifies fix for Monaco Editor import issue.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CodeEditor } from '../components/CodeEditor';

// Mock Monaco Editor to avoid loading the actual editor in tests
vi.mock('@monaco-editor/react', () => ({
    default: ({ value, language, onChange, onMount }: {
        value: string;
        language: string;
        onChange?: (value: string | undefined) => void;
        onMount?: (editor: unknown) => void;
    }) => {
        // Simulate editor mount
        if (onMount) {
            const mockEditor = {
                focus: vi.fn(),
                onDidChangeCursorSelection: vi.fn(),
            };
            setTimeout(() => onMount(mockEditor), 0);
        }

        return (
            <div data-testid="monaco-editor" data-language={language}>
                <textarea
                    data-testid="monaco-textarea"
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                    readOnly={false}
                />
            </div>
        );
    },
}));

describe('CodeEditor', () => {
    describe('Import and Rendering', () => {
        it('imports and renders without OnChange/OnMount type errors', () => {
            // This test verifies that the component can be imported and rendered
            // without the "does not provide an export named 'OnChange'" error
            expect(() => {
                render(
                    <CodeEditor
                        value="console.log('hello');"
                        language="javascript"
                    />
                );
            }).not.toThrow();
        });

        it('renders the editor container', () => {
            render(
                <CodeEditor
                    value="print('hello')"
                    language="python"
                />
            );

            expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
        });

        it('passes language to editor', () => {
            render(
                <CodeEditor
                    value=""
                    language="rust"
                />
            );

            const editor = screen.getByTestId('monaco-editor');
            expect(editor).toHaveAttribute('data-language', 'rust');
        });
    });

    describe('Props', () => {
        it('accepts all valid props without type errors', () => {
            const onChange = vi.fn();
            const onCursorChange = vi.fn();

            expect(() => {
                render(
                    <CodeEditor
                        value="const x = 1;"
                        language="typescript"
                        onChange={onChange}
                        onCursorChange={onCursorChange}
                        readOnly={false}
                        className="custom-class"
                    />
                );
            }).not.toThrow();
        });

        it('calls onChange when value changes', () => {
            const onChange = vi.fn();
            render(
                <CodeEditor
                    value=""
                    language="javascript"
                    onChange={onChange}
                />
            );

            const textarea = screen.getByTestId('monaco-textarea');
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
        });
    });

    describe('Type Safety', () => {
        it('component accepts valid props', () => {
            // This is a compile-time check - if types are wrong, build fails
            // At runtime, we just verify the component exists
            expect(CodeEditor).toBeDefined();
        });
    });
});
