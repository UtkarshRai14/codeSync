import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ParticipantsList } from '../components/ParticipantsList';
import type { Participant } from '../types';

describe('ParticipantsList', () => {
    const mockParticipants: Participant[] = [
        { id: '1', name: 'Alice', color: '#ff0000' },
        { id: '2', name: 'Bob', color: '#00ff00' },
    ];
    const currentUser = mockParticipants[0];

    it('renders participants list', () => {
        render(
            <ParticipantsList
                participants={mockParticipants}
                currentParticipant={currentUser}
            />
        );
        expect(screen.getByText('Alice')).toBeDefined();
        expect(screen.getByText('Bob')).toBeDefined();
        expect(screen.getByText('(you)')).toBeDefined();
    });

    it('shows edit button for current user', () => {
        const onNameChange = vi.fn();
        render(
            <ParticipantsList
                participants={mockParticipants}
                currentParticipant={currentUser}
                onNameChange={onNameChange}
            />
        );
        // Edit button is visible on hover, but in test we can find it by role or title
        const editBtn = screen.getByTitle('Edit Name');
        expect(editBtn).toBeDefined();
    });

    it('enters edit mode and submits name change', () => {
        const onNameChange = vi.fn();
        render(
            <ParticipantsList
                participants={mockParticipants}
                currentParticipant={currentUser}
                onNameChange={onNameChange}
            />
        );

        const editBtn = screen.getByTitle('Edit Name');
        fireEvent.click(editBtn);

        const input = screen.getByDisplayValue('Alice');
        fireEvent.change(input, { target: { value: 'Alice Updated' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(onNameChange).toHaveBeenCalledWith('Alice Updated');
    });

    it('cancels edit mode on Escape', () => {
        const onNameChange = vi.fn();
        render(
            <ParticipantsList
                participants={mockParticipants}
                currentParticipant={currentUser}
                onNameChange={onNameChange}
            />
        );

        fireEvent.click(screen.getByTitle('Edit Name'));
        const input = screen.getByDisplayValue('Alice');
        fireEvent.change(input, { target: { value: 'Should Not Save' } });
        fireEvent.keyDown(input, { key: 'Escape' });

        expect(onNameChange).not.toHaveBeenCalled();
        expect(screen.getByText('Alice')).toBeDefined();
    });
});
