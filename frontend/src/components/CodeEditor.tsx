/**
 * Monaco Code Editor wrapper component.
 * @module components/CodeEditor
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import Editor from '@monaco-editor/react';
import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { cn } from '../lib/utils';
import type { CursorPosition, SelectionRange } from '../types';

/** Monaco editor instance type */
type EditorInstance = editor.IStandaloneCodeEditor;

export interface RemoteCursorData {
    id: string;
    name: string;
    color: string;
    position: CursorPosition;
}

export interface RemoteSelectionData {
    id: string;
    color: string;
    selection: SelectionRange;
}

export interface CodeEditorProps {
    /** Current code content */
    value: string;
    /** Programming language for syntax highlighting */
    language: string;
    /** Callback when code changes */
    onChange?: (value: string) => void;
    /** Callback when cursor position changes */
    onCursorChange?: (line: number, column: number) => void;
    /** Callback when active selection changes */
    onSelectionChange?: (
        selection: SelectionRange | null,
        line: number,
        column: number,
    ) => void;
    /** Remote participant cursors to display */
    remoteCursors?: Record<string, RemoteCursorData>;
    /** Remote participant selections to display */
    remoteSelections?: Record<string, RemoteSelectionData>;
    /** Whether the editor is read-only */
    readOnly?: boolean;
    /** Additional CSS classes */
    className?: string;
}

function hexToRgba(hex: string, alpha: number): string {
    const cleaned = hex.replace('#', '');
    const value = cleaned.length === 3
        ? cleaned.split('').map((char) => char + char).join('')
        : cleaned;

    const numeric = Number.parseInt(value, 16);
    const red = (numeric >> 16) & 255;
    const green = (numeric >> 8) & 255;
    const blue = numeric & 255;

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
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
    onSelectionChange,
    remoteCursors = {},
    remoteSelections = {},
    readOnly = false,
    className,
}: CodeEditorProps): ReactElement {
    const editorRef = useRef<EditorInstance | null>(null);
    // Monaco instance loaded by @monaco-editor/react (avoids bundling a second copy)
    const monacoRef = useRef<Monaco | null>(null);
    const [isEditorReady, setIsEditorReady] = useState(false);
    const cursorDecorationIdsRef = useRef<string[]>([]);
    const selectionDecorationIdsRef = useRef<string[]>([]);

    const remotePresenceStyles = useMemo(() => {
        const styles: string[] = [
            '.monaco-editor .remote-cursor-label { padding: 0 4px; border-radius: 4px; font-size: 10px; font-weight: 600; line-height: 1.4; letter-spacing: 0.02em; white-space: pre; }',
            '.monaco-editor .remote-cursor-marker { border-left: 2px solid currentColor; margin-left: -1px; }',
        ];

        Object.values(remoteCursors).forEach((cursor) => {
            styles.push(`
                .monaco-editor .remote-cursor-marker-${cursor.id} {
                    color: ${cursor.color};
                }
                .monaco-editor .remote-cursor-label-${cursor.id} {
                    background-color: ${cursor.color};
                    color: #fff;
                    border: 1px solid ${cursor.color};
                    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2);
                }
            `);
        });

        Object.values(remoteSelections).forEach((selection) => {
            styles.push(`
                .monaco-editor .remote-selection-${selection.id} {
                    background-color: ${hexToRgba(selection.color, 0.25)};
                    border: 1px solid ${selection.color};
                    box-sizing: border-box;
                }
            `);
        });

        return styles.join('\n');
    }, [remoteCursors, remoteSelections]);

    useEffect(() => {
        const styleTag = document.getElementById('codesync-remote-presence-styles');
        if (styleTag) {
            styleTag.textContent = remotePresenceStyles;
            return;
        }

        const newStyleTag = document.createElement('style');
        newStyleTag.id = 'codesync-remote-presence-styles';
        newStyleTag.textContent = remotePresenceStyles;
        document.head.appendChild(newStyleTag);
    }, [remotePresenceStyles]);

    useEffect(() => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        if (!isEditorReady || !editor || !monaco) {
            return;
        }

        const cursorDecorations = Object.values(remoteCursors).map((cursor) => ({
            range: new monaco.Range(
                cursor.position.line,
                cursor.position.column,
                cursor.position.line,
                cursor.position.column,
            ),
            options: {
                className: `remote-cursor-marker remote-cursor-marker-${cursor.id}`,
                after: {
                    content: ` ${cursor.name}`,
                    inlineClassName: `remote-cursor-label remote-cursor-label-${cursor.id}`,
                },
                stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            },
        }));

        const selectionDecorations = Object.values(remoteSelections).map((selection) => ({
            range: new monaco.Range(
                selection.selection.startLine,
                selection.selection.startColumn,
                selection.selection.endLine,
                selection.selection.endColumn,
            ),
            options: {
                className: `remote-selection-${selection.id}`,
                stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            },
        }));

        cursorDecorationIdsRef.current = editor.deltaDecorations(
            cursorDecorationIdsRef.current,
            cursorDecorations,
        );
        selectionDecorationIdsRef.current = editor.deltaDecorations(
            selectionDecorationIdsRef.current,
            selectionDecorations,
        );
    }, [isEditorReady, remoteCursors, remoteSelections]);

    /**
     * Handles editor mount event.
     * @param editor - Monaco editor instance
     * @param monaco - Monaco API instance
     */
    const handleEditorDidMount = useCallback(
        (editor: EditorInstance, monaco: Monaco) => {
            editorRef.current = editor;
            monacoRef.current = monaco;

            editor.onDidChangeCursorSelection((event) => {
                const position = event.selection.getPosition();
                const selection = event.selection.isEmpty()
                    ? null
                    : {
                          startLine: event.selection.startLineNumber,
                          startColumn: event.selection.startColumn,
                          endLine: event.selection.endLineNumber,
                          endColumn: event.selection.endColumn,
                      };

                onCursorChange?.(position.lineNumber, position.column);
                onSelectionChange?.(selection, position.lineNumber, position.column);
            });

            editor.focus();
            // Apply remote presence that arrived before the editor finished loading
            setIsEditorReady(true);
        },
        [onCursorChange, onSelectionChange]
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
