import { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { openExternal } from '../../logic/adapter';
import { MermaidBlock } from './MermaidBlock';

interface MarkdownViewProps {
    source: string;
}

const components: Components = {
    code({ className, children, ...rest }) {
        const lang = /language-(\w+)/.exec(className ?? '')?.[1];
        if (lang === 'mermaid') {
            const src = Array.isArray(children) ? children.join('') : ((children as string) ?? '');
            return <MermaidBlock src={src.trim()} />;
        }
        return (
            <code className={className} {...rest}>
                {children}
            </code>
        );
    },
    a({ href, children, ...rest }) {
        const safe = href && /^(https?:|mailto:)/i.test(href) ? href : undefined;
        return (
            <a
                {...rest}
                href={safe}
                rel="noopener noreferrer"
                onClick={(e) => {
                    e.preventDefault();
                    if (safe) openExternal(safe);
                }}
            >
                {children}
            </a>
        );
    },
};

export const MarkdownView = memo(function MarkdownView({ source }: MarkdownViewProps) {
    return (
        <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]} components={components}>
                {source}
            </ReactMarkdown>
        </div>
    );
});

MarkdownView.displayName = 'MarkdownView';
export default MarkdownView;
