/**
 * Tests for React components.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageSelector } from '../components/LanguageSelector';
import { ShareButton } from '../components/ShareButton';
import { Button } from '../components/ui/button';

describe('Button', () => {
    it('renders children correctly', () => {
        render(<Button>Click me</Button>);
        expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('applies variant classes', () => {
        render(<Button variant="destructive">Delete</Button>);
        const button = screen.getByText('Delete');
        expect(button).toHaveClass('bg-destructive');
    });

    it('handles click events', () => {
        const onClick = vi.fn();
        render(<Button onClick={onClick}>Click</Button>);
        fireEvent.click(screen.getByText('Click'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('can be disabled', () => {
        render(<Button disabled>Disabled</Button>);
        expect(screen.getByText('Disabled')).toBeDisabled();
    });
});

describe('LanguageSelector', () => {
    it('displays selected language', () => {
        render(<LanguageSelector value="python" onChange={() => { }} />);
        expect(screen.getByText('Python')).toBeInTheDocument();
    });

    it('opens dropdown on click', () => {
        render(<LanguageSelector value="python" onChange={() => { }} />);
        fireEvent.click(screen.getByRole('button'));
        expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });

    it('calls onChange when language is selected', () => {
        const onChange = vi.fn();
        render(<LanguageSelector value="python" onChange={onChange} />);

        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(screen.getByText('JavaScript'));

        expect(onChange).toHaveBeenCalledWith('javascript');
    });
});

describe('ShareButton', () => {
    it('renders share button', () => {
        render(<ShareButton shareUrl="/session/test" />);
        expect(screen.getByText('Share')).toBeInTheDocument();
    });

    it('shows copied state after click', async () => {
        render(<ShareButton shareUrl="/session/test" />);
        fireEvent.click(screen.getByRole('button'));

        // Wait for state change
        const copiedText = await screen.findByText('Copied!');
        expect(copiedText).toBeInTheDocument();
    });
});
