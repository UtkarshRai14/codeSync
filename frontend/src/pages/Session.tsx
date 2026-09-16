/**
 * Interview session page with collaborative editor.
 * @module pages/Session
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, ArrowLeft } from 'lucide-react';
import type { ReactElement } from 'react';
import { CodeEditor } from '../components/CodeEditor';
import { LanguageSelector } from '../components/LanguageSelector';
import { ShareButton } from '../components/ShareButton';
import { ExecutionPanel } from '../components/ExecutionPanel';
import { ParticipantsList } from '../components/ParticipantsList';
import { Button } from '../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';

import { useWebSocket } from '../hooks/useWebSocket';
import { useCodeExecution } from '../hooks/useCodeExecution';
import { getSession } from '../lib/api';
import { cn } from '../lib/utils';
import { debounce } from '../lib/utils';
import type { SelectionRange, Session } from '../types';

function generateParticipantId(): string {
    const uuid = globalThis.crypto?.randomUUID?.();
    return uuid ? uuid.slice(0, 8) : Math.random().toString(36).slice(2, 10);
}

/**
 * Main interview session page with collaborative code editor.
 * Connects to WebSocket for real-time updates.
 *
 * @returns Session page component
 */
export function SessionPage(): ReactElement {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();

    const [, setSession] = useState<Session | null>(null);
    const [code, setCode] = useState<string>('');
    const [language, setLanguage] = useState<string>('python');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessionVerified, setSessionVerified] = useState(false);

    // Identity state
    const [name, setName] = useState<string>('');
    const [participantId, setParticipantId] = useState<string>('');
    const [showNameDialog, setShowNameDialog] = useState(false);
    const [tempName, setTempName] = useState('');

    // Code execution hook
    const { result, isExecuting, isSupported, execute, clearResult } = useCodeExecution(language);

    // Handle code updates from WebSocket
    const handleCodeUpdate = useCallback((newCode: string, newLanguage?: string) => {
        setCode(newCode);
        if (newLanguage) setLanguage(newLanguage);
    }, []);

    // Handle language change from WebSocket
    const handleLanguageChange = useCallback((newLanguage: string) => {
        setLanguage(newLanguage);
    }, []);

    // Fetch session on mount
    useEffect(() => {
        if (!sessionId) {
            setError('No session ID provided');
            setLoading(false);
            return;
        }

        const fetchSession = async () => {
            try {
                const sessionData = await getSession(sessionId);
                setSession(sessionData);
                setCode(sessionData.code);
                setLanguage(sessionData.language);

                // Identity Check
                const identityKey = `code_sync_identity_${sessionId}`;
                const storedIdentity = localStorage.getItem(identityKey);

                if (storedIdentity) {
                    try {
                        const parsedIdentity = JSON.parse(storedIdentity) as {
                            name?: unknown;
                            participantId?: unknown;
                        };
                        if (
                            typeof parsedIdentity.name === 'string' &&
                            parsedIdentity.name.trim() &&
                            typeof parsedIdentity.participantId === 'string' &&
                            parsedIdentity.participantId.trim()
                        ) {
                            setName(parsedIdentity.name);
                            setParticipantId(parsedIdentity.participantId);
                            setSessionVerified(true);
                            return;
                        }
                    } catch (parseError) {
                        console.warn('Invalid stored session identity:', parseError);
                    }
                    localStorage.removeItem(identityKey);
                }

                {
                    // Check for preferred name from Home page
                    const preferredName = localStorage.getItem('code_sync_preferred_name');

                    if (preferredName?.trim()) {
                        const identity = {
                            name: preferredName.trim(),
                            participantId: generateParticipantId(),
                        };
                        localStorage.setItem(identityKey, JSON.stringify(identity));
                        setName(identity.name);
                        setParticipantId(identity.participantId);
                        setSessionVerified(true);
                    } else {
                        // Prompt for name
                        setShowNameDialog(true);
                    }
                }
            } catch (err) {
                setError('Session not found');
                console.error('Failed to fetch session:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSession();
    }, [sessionId]);

    const handleNameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!tempName.trim()) return;

        const identity = {
            name: tempName.trim(),
            participantId: generateParticipantId(),
        };
        setName(identity.name);
        setParticipantId(identity.participantId);
        localStorage.setItem('code_sync_preferred_name', identity.name);
        if (sessionId) {
            localStorage.setItem(
                `code_sync_identity_${sessionId}`,
                JSON.stringify(identity),
            );
        }
        setShowNameDialog(false);
        setSessionVerified(true);
    };

    // WebSocket connection
    const {
        connectionState,
        participants,
        currentParticipant,
        sendMessage,
    } = useWebSocket(sessionId || null, {
        enabled: sessionVerified && !!name && !!participantId,
        onCodeUpdate: handleCodeUpdate,
        onLanguageChange: handleLanguageChange,
        participantId: participantId || undefined,
        name: name || undefined,
    });

    const remoteCursors = Object.fromEntries(
        participants
            .filter((participant) => participant.id !== currentParticipant?.id && participant.cursorPosition)
            .map((participant) => [participant.id, {
                id: participant.id,
                name: participant.name,
                color: participant.color,
                position: participant.cursorPosition!,
            }])
    );

    const remoteSelections = Object.fromEntries(
        participants
            .filter((participant) => participant.id !== currentParticipant?.id && participant.selection)
            .map((participant) => [participant.id, {
                id: participant.id,
                color: participant.color,
                selection: participant.selection!,
            }])
    );

    // Save identity when connected
    useEffect(() => {
        if (currentParticipant && sessionId) {
            localStorage.setItem(`code_sync_identity_${sessionId}`, JSON.stringify({
                name: currentParticipant.name,
                participantId: currentParticipant.id,
            }));

            // Update local state if we didn't have an ID yet
            if (!participantId) {
                setParticipantId(currentParticipant.id);
            }

            // Update name if different (fixes "Connecting..." stuck state)
            if (!name || name !== currentParticipant.name) {
                setName(currentParticipant.name);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentParticipant, sessionId, participantId]);

    // Debounced code update sender
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSendCodeUpdate = useCallback(
        debounce((newCode: string) => {
            sendMessage({
                type: 'code_update',
                payload: { code: newCode },
            });
        }, 100),
        [sendMessage]
    );

    // Handle local code changes
    const handleCodeChange = (newCode: string) => {
        setCode(newCode);
        debouncedSendCodeUpdate(newCode);
    };

    const handleCursorChange = useCallback((line: number, column: number) => {
        sendMessage({
            type: 'cursor_position',
            payload: { line, column },
        });
    }, [sendMessage]);

    const handleSelectionChange = useCallback((selection: SelectionRange | null, line: number, column: number) => {
        sendMessage({
            type: 'cursor_position',
            payload: {
                line,
                column,
                selection: selection
                    ? {
                          start_line: selection.startLine,
                          start_column: selection.startColumn,
                          end_line: selection.endLine,
                          end_column: selection.endColumn,
                      }
                    : null,
            },
        });
    }, [sendMessage]);

    // Handle language change
    const handleLanguageSelect = (newLanguage: string) => {
        setLanguage(newLanguage);
        clearResult();
        sendMessage({
            type: 'language_change',
            payload: { language: newLanguage },
        });
    };

    // Handle code execution
    const handleRunCode = async () => {
        await execute(code);
    };

    // Handle name change from UI
    const handleNameChange = (newName: string) => {
        if (!sessionId) return;
        setName(newName);

        // Persist globally
        localStorage.setItem('code_sync_preferred_name', newName);

        // Persist for this session
        const identity = {
            name: newName,
            participantId: participantId || generateParticipantId(),
        };
        setParticipantId(identity.participantId);
        localStorage.setItem(`code_sync_identity_${sessionId}`, JSON.stringify(identity));

        sendMessage({
            type: 'name_change',
            payload: { name: newName },
        });
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
                />
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center gap-4 text-white">
                <p className="text-xl text-red-400">{error}</p>
                <Button onClick={() => navigate('/')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-900 text-white flex flex-col">
            {/* Name Dialog */}
            <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
                <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-zinc-100" onPointerDownOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>Welcome to CodeSync</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Please enter your name to join the session.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleNameSubmit} className="space-y-4 py-4">
                        <Input
                            placeholder="Your Name"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            className="bg-zinc-950 border-zinc-800 focus-visible:ring-blue-500 text-zinc-100"
                            autoFocus
                        />
                        <DialogFooter>
                            <Button
                                type="submit"
                                disabled={!tempName.trim()}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Join Session
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between border-b border-zinc-700 px-6 py-4"
            >
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Home
                    </Button>

                    <LanguageSelector value={language} onChange={handleLanguageSelect} />

                    {/* Connection status */}
                    <div className={cn(
                        'flex items-center gap-2 text-sm',
                        connectionState === 'connected' ? 'text-green-400' : 'text-zinc-400'
                    )}>
                        {connectionState === 'connected' ? (
                            <Wifi className="w-4 h-4" />
                        ) : (
                            <WifiOff className="w-4 h-4" />
                        )}
                        <span className="capitalize">
                            {connectionState === 'disconnected' && !name ? 'Waiting for Name' : connectionState}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: currentParticipant?.color || '#3b82f6' }}
                        />
                        <span className="text-sm text-zinc-300 font-medium">
                            {name || 'Connecting...'}
                        </span>
                    </div>
                    <ShareButton shareUrl={`/session/${sessionId}`} />
                </div>
            </motion.header>

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Editor section */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex-1 flex flex-col min-w-0"
                >
                    <div className="flex-1 p-4">
                        <CodeEditor
                            value={code}
                            language={language}
                            onChange={handleCodeChange}
                            onCursorChange={handleCursorChange}
                            onSelectionChange={handleSelectionChange}
                            remoteCursors={remoteCursors}
                            remoteSelections={remoteSelections}
                            className="h-full"
                        />
                    </div>

                    {/* Execution panel */}
                    <div className="h-64 p-4 border-t border-zinc-700">
                        <ExecutionPanel
                            result={result}
                            isExecuting={isExecuting}
                            isSupported={isSupported}
                            onRun={handleRunCode}
                            className="h-full"
                        />
                    </div>
                </motion.div>

                {/* Sidebar */}
                <motion.aside
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-64 border-l border-zinc-700 p-4"
                >
                    <ParticipantsList
                        participants={participants}
                        currentParticipant={currentParticipant}
                        onNameChange={handleNameChange}
                    />
                </motion.aside>
            </div>
        </div>
    );
}
