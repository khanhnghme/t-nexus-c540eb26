import React, { useEffect, useRef, useState, useId } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { cn } from '@/lib/utils';
import { Check, Copy, ExternalLink } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

/* ------------------------------------------------------------------ */
/*  Mermaid renderer (dynamic import, dark-mode aware)                */
/* ------------------------------------------------------------------ */
const MermaidBlock: React.FC<{ code: string }> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const uniqueId = useId().replace(/:/g, '_');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        const isDark = document.documentElement.classList.contains('dark');
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
        });
        const { svg } = await mermaid.render(`mermaid_${uniqueId}`, code.trim());
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Diagram parse error');
      }
    })();
    return () => { cancelled = true; };
  }, [code, uniqueId]);

  if (error) {
    return (
      <pre className="bg-muted/50 border border-destructive/30 rounded-xl p-4 overflow-x-auto my-3 text-xs font-mono text-destructive whitespace-pre-wrap">
        {code}
      </pre>
    );
  }

  return (
    <div ref={containerRef} className="my-3 flex justify-center overflow-x-auto [&_svg]:max-w-full" />
  );
};

/* ------------------------------------------------------------------ */
/*  Code block with language label + copy button                      */
/* ------------------------------------------------------------------ */
const CodeBlock: React.FC<{ language?: string; children: string }> = ({ language, children }) => {
  const [copied, setCopied] = useState(false);
  const label = language?.replace(/^language-/, '') || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative my-3 rounded-xl border border-border/40 overflow-hidden bg-muted/50">
      {(label || true) && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-muted/70 border-b border-border/30 text-[11px] text-muted-foreground">
          <span className="uppercase tracking-wider font-medium">{label || 'code'}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            aria-label="Copy code"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed">
        <code className="font-mono">{children}</code>
      </pre>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main renderer                                                     */
/* ------------------------------------------------------------------ */
interface AIMessageRendererProps {
  content: string;
  compact?: boolean;
}

const AIMessageRenderer: React.FC<AIMessageRendererProps> = ({ content, compact = false }) => {
  return (
    <div
      className={cn(
        'prose max-w-none dark:prose-invert prose-strong:text-foreground prose-headings:text-foreground',
        compact
          ? 'prose-sm prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:text-sm'
          : 'prose-sm prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:text-sm prose-code:text-[13px]'
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          /* ---------- paragraphs / lists ---------- */
          p: ({ children }) => <p className={cn('last:mb-0', compact ? 'mb-2' : 'mb-2.5')}>{children}</p>,
          ul: ({ children }) => <ul className={cn('list-disc list-inside space-y-1', compact ? 'mb-2' : 'mb-2.5')}>{children}</ul>,
          ol: ({ children }) => <ol className={cn('list-decimal list-inside space-y-1', compact ? 'mb-2' : 'mb-2.5')}>{children}</ol>,
          li: ({ children }) => <li className={compact ? 'text-sm' : 'text-[14px]'}>{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,

          /* ---------- links ---------- */
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-primary hover:underline"
            >
              {children}
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          ),

          /* ---------- code / pre ---------- */
          code: ({ className, children, ...props }) => {
            const raw = String(children).replace(/\n$/, '');
            const isInline = !className && !raw.includes('\n');

            if (isInline) {
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                  {children}
                </code>
              );
            }

            const lang = className?.replace('language-', '') || '';

            if (lang === 'mermaid') {
              return <MermaidBlock code={raw} />;
            }

            return <CodeBlock language={lang} children={raw} />;
          },
          pre: ({ children }) => <>{children}</>,

          /* ---------- GFM tables → shadcn Table ---------- */
          table: ({ children }) => (
            <div className="my-3 rounded-xl border border-border/40 overflow-hidden">
              <Table>{children}</Table>
            </div>
          ),
          thead: ({ children }) => <TableHeader>{children}</TableHeader>,
          tbody: ({ children }) => <TableBody>{children}</TableBody>,
          tr: ({ children }) => <TableRow>{children}</TableRow>,
          th: ({ children }) => <TableHead className="text-xs font-medium">{children}</TableHead>,
          td: ({ children }) => <TableCell className="text-sm">{children}</TableCell>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default AIMessageRenderer;
