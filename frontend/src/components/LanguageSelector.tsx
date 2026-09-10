/**
 * Language selector dropdown component.
 * @module components/LanguageSelector
 */

import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import { SUPPORTED_LANGUAGES } from '../types';

export interface LanguageSelectorProps {
    /** Currently selected language */
    value: string;
    /** Callback when language changes */
    onChange: (language: string) => void;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Dropdown selector for programming languages.
 * Supports all languages defined in SUPPORTED_LANGUAGES.
 *
 * @param props - Component props
 * @returns Language selector dropdown
 */
export function LanguageSelector({
    value,
    onChange,
    className,
}: LanguageSelectorProps): React.ReactElement {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedLanguage = SUPPORTED_LANGUAGES.find((lang) => lang.id === value);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} className={cn('relative', className)}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700 transition-colors"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span>{selectedLanguage?.name || 'Select Language'}</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 z-50 mt-1 w-48 rounded-md border border-zinc-700 bg-zinc-800 py-1 shadow-lg">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                        <button
                            key={lang.id}
                            onClick={() => {
                                onChange(lang.id);
                                setIsOpen(false);
                            }}
                            className={cn(
                                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                                value === lang.id
                                    ? 'bg-blue-600 text-white'
                                    : 'text-zinc-300 hover:bg-zinc-700'
                            )}
                            role="option"
                            aria-selected={value === lang.id}
                        >
                            <span className="font-mono text-xs text-zinc-500">{lang.extension}</span>
                            <span>{lang.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
