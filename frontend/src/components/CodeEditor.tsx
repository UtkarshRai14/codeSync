/**
 * Monaco Code Editor wrapper component.
 * @module components/CodeEditor
 */

import { useCallback, useRef } from 'react';
import type { ReactElement } from 'react';
import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { cn } from '../lib/utils';

/** Monaco editor instance type */
type EditorInstance = editor.IStandaloneCodeEditor;

export interface CodeEditorProps {
    /** Current code content */
    value: string;
    /** Programming language for syntax highlighting */
    language: string;
    /** Callback when code changes */
    onChange?: (value: string) => void;
    /** Callback when cursor position changes */
    onCursorChange?: (line: number, column: number) => void;
    /** Whether the editor is read-only */
    readOnly?: boolean;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Monaco Editor wrapper with real-time collaboration support.
 * Provides syntax highlighting for 50+ languages.
 *
 * @param props - Component props
 * @returns Monaco Editor component
 */
export function CodeEditor({
    value,
    language,
    onChange,
    onCursorChange,
    readOnly = false,
    className,
}: CodeEditorProps): ReactElement {
    const editorRef = useRef<EditorInstance | null>(null);

    /**
     * Handles editor mount event.
     * @param editor - Monaco editor instance
     */
    const handleEditorDidMount = useCallback(
        (editor: EditorInstance) => {
            editorRef.current = editor;

            // Set up cursor position tracking
            editor.onDidChangeCursorPosition((e) => {
                onCursorChange?.(e.position.lineNumber, e.position.column);
            });

            // Focus the editor
            editor.focus();
        },
        [onCursorChange]
    );

    /**
     * Handles code changes.
     * @param value - New code value
     */
    const handleChange = useCallback(
        (value: string | undefined) => {
            onChange?.(value ?? '');
        },
        [onChange]
    );

    return (
        <div className={cn('h-full w-full overflow-hidden rounded-lg border border-zinc-700', className)}>
            <Editor
                height="100%"
                language={language}
                value={value}
                theme="vs-dark"
                onChange={handleChange}
                onMount={handleEditorDidMount}
                options={{
                    readOnly,
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'Fira Code', 'Consolas', monospace",
                    lineNumbers: 'on',
                    renderLineHighlight: 'all',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: 'on',
                    padding: { top: 16, bottom: 16 },
                    cursorBlinking: 'smooth',
                    smoothScrolling: true,
                    bracketPairColorization: { enabled: true },
                }}
            />
        </div>
    );
}

