/**
 * Share button with copy-to-clipboard functionality.
 * @module components/ShareButton
 */

import { useState } from 'react';
import { Link, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { copyToClipboard } from '../lib/utils';

export interface ShareButtonProps {
    /** URL to share */
    shareUrl: string;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Button that copies the session URL to clipboard.
 * Shows confirmation animation on successful copy.
 *
 * @param props - Component props
 * @returns Share button component
 */
export function ShareButton({ shareUrl, className }: ShareButtonProps): React.ReactElement {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const fullUrl = `${window.location.origin}${shareUrl}`;
        const success = await copyToClipboard(fullUrl);

        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Button
            variant="outline"
            onClick={handleCopy}
            className={className}
            aria-label={copied ? 'Link copied' : 'Copy session link'}
        >
            <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                    <motion.span
                        key="copied"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2"
                    >
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Copied!</span>
                    </motion.span>
                ) : (
                    <motion.span
                        key="copy"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2"
                    >
                        <Link className="h-4 w-4" />
                        <span>Share</span>
                    </motion.span>
                )}
            </AnimatePresence>
        </Button>
    );
}
