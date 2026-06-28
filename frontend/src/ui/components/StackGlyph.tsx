import { icons } from 'lucide-react';
import React from 'react';

interface StackGlyphProps {
    /** Either a kebab-case lucide icon name (e.g. "life-buoy") or a literal emoji (e.g. "📝"). */
    icon: string;
    size?: number;
    className?: string;
}

const toPascalCase = (kebab: string): string =>
    kebab
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');

/**
 * Renders a saved-stack glyph. Seeded stacks store a lucide icon name (kebab-case);
 * user stacks may store a literal emoji. Lucide names render as the icon; anything
 * else (emoji, unknown) renders as plain text so nothing leaks a raw name string.
 */
export const StackGlyph: React.FC<StackGlyphProps> = ({ icon, size = 16, className }) => {
    const trimmed = icon.trim();
    const lucideName = toPascalCase(trimmed);
    const LucideIcon = (icons as Record<string, React.ComponentType<{ size?: number }>>)[lucideName];

    return (
        <span className={className} aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center' }}>
            {LucideIcon ? <LucideIcon size={size} /> : trimmed}
        </span>
    );
};

StackGlyph.displayName = 'StackGlyph';
export default StackGlyph;
