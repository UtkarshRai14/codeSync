/**
 * Participants list sidebar component.
 * @module components/ParticipantsList
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Users, Circle, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';
import type { Participant } from '../types';

export interface ParticipantsListProps {
    /** List of participants */
    participants: Participant[];
    /** Current participant (you) */
    currentParticipant: Participant | null;
    /** Callback when name is changed */
    onNameChange?: (newName: string) => void;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Sidebar showing connected participants with their status.
 *
 * @param props - Component props
 * @returns Participants list component
 */
export function ParticipantsList({
    participants,
    currentParticipant,
    onNameChange,
    className,
}: ParticipantsListProps): React.ReactElement {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');

    // Combine current user with other participants
    // Deduplicate participants from props first
    const uniqueParticipantsMap = new Map();
    participants.forEach(p => uniqueParticipantsMap.set(p.id, p));

    if (currentParticipant) {
        uniqueParticipantsMap.delete(currentParticipant.id);
    }

    const otherParticipants = Array.from(uniqueParticipantsMap.values());
    const allParticipants = currentParticipant
        ? [currentParticipant, ...otherParticipants]
        : Array.from(uniqueParticipantsMap.values());

    // Filter out any participants with missing IDs just in case
    const validParticipants = allParticipants.filter(p => p && p.id);

    const startEditing = () => {
        if (currentParticipant) {
            setEditName(currentParticipant.name);
            setIsEditing(true);
        }
    };

    const cancelEditing = () => {
        setIsEditing(false);
        setEditName('');
    };

    const submitName = () => {
        if (editName.trim() && editName !== currentParticipant?.name) {
            onNameChange?.(editName.trim());
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            submitName();
        } else if (e.key === 'Escape') {
            cancelEditing();
        }
    };

    return (
        <div className={cn('bg-zinc-900 rounded-lg border border-zinc-700 p-4', className)}>
            <div className="flex items-center gap-2 text-zinc-400 mb-4">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">Participants ({validParticipants.length})</span>
            </div>

            <ul className="space-y-2">
                <AnimatePresence mode="popLayout" initial={false}>
                    {validParticipants.map((participant, index) => {
                        const isMe = currentParticipant?.id === participant.id;
                        const showInput = isMe && isEditing;

                        return (
                            <motion.li
                                key={participant.id}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex items-center gap-3 p-1 rounded hover:bg-zinc-800/50 group"
                            >
                                {/* Color indicator */}
                                <Circle
                                    className="h-3 w-3 shrink-0"
                                    fill={participant.color}
                                    stroke={participant.color}
                                />

                                {/* Name or Input */}
                                <div className="flex-1 min-w-0 flex items-center justify-between">
                                    {showInput ? (
                                        <div className="flex items-center gap-1 w-full">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                // autoFocus
                                                ref={(input) => { if (input) input.focus(); }}
                                                className="bg-zinc-800 text-zinc-200 text-sm px-1 py-0.5 rounded border border-zinc-600 focus:outline-none focus:border-blue-500 w-full"
                                                onBlur={submitName}
                                            />
                                        </div>
                                    ) : (
                                        <span className={cn("text-sm truncate", isMe ? "text-blue-400 font-medium" : "text-zinc-300")}>
                                            {participant.name}
                                            {isMe && <span className="text-xs text-zinc-500 ml-1">(you)</span>}
                                        </span>
                                    )}

                                    {/* Edit Button (only for me and not already editing) */}
                                    {isMe && !isEditing && onNameChange && (
                                        <button
                                            onClick={startEditing}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-blue-400 p-1"
                                            title="Edit Name"
                                        >
                                            <Edit2 className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            </motion.li>
                        );
                    })}
                </AnimatePresence>
            </ul>

            {allParticipants.length === 0 && (
                <p className="text-sm text-zinc-500 italic">No participants yet</p>
            )}
        </div>
    );
}
