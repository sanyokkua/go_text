import mermaid from 'mermaid';
import { useEffect, useId, useState } from 'react';
import { selectEffectiveTheme, useAppSelector } from '../../logic/store';

interface MermaidBlockProps {
    src: string;
}

export function MermaidBlock({ src }: MermaidBlockProps) {
    const theme = useAppSelector(selectEffectiveTheme);
    const rawId = useId();
    const id = `mermaid-${rawId.replace(/:/g, '')}`;
    const [svg, setSvg] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setSvg(null);
        setError(null);

        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: theme === 'dark' ? 'dark' : 'default' });

        mermaid
            .render(id, src)
            .then(({ svg: rendered }) => {
                if (!cancelled) setSvg(rendered);
            })
            .catch((err: unknown) => {
                if (!cancelled) setError(String(err));
            });

        return () => {
            cancelled = true;
        };
    }, [src, theme, id]);

    if (error) {
        return (
            <div role="alert" style={{ color: 'var(--err)', fontSize: '0.875rem', padding: '0.5rem' }}>
                Diagram error: {error}
            </div>
        );
    }

    if (!svg) {
        return (
            <span aria-live="polite" aria-label="Rendering diagram">
                Rendering diagram…
            </span>
        );
    }

    // mermaid renders with securityLevel:'strict' — its SVG is sanitized
    // eslint-disable-next-line @typescript-eslint/naming-convention
    return <div aria-label="mermaid diagram" dangerouslySetInnerHTML={{ __html: svg }} />;
}

MermaidBlock.displayName = 'MermaidBlock';
export default MermaidBlock;
