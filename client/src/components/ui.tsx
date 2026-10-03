import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Info,
  OctagonX,
  TriangleAlert,
} from 'lucide-react';
import { useSpecular } from '../hooks/useSpecular';

/* ---------------- toasts ---------------- */

interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: 'ok' | 'error' | 'info';
}

const ToastCtx = createContext<(t: Omit<Toast, 'id'>) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++idRef.current;
    setToasts((ts) => [...ts, { ...t, id }].slice(-4));
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 4200);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="fixed right-4 z-[90] flex flex-col items-end gap-2 bottom-24 md:bottom-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="glass glass-1 glass-pill specular flex max-w-xs items-center gap-3 px-4 py-3"
              role="status"
            >
              {t.tone === 'ok' ? (
                <CheckCircle2 size={18} style={{ color: 'var(--mint)' }} aria-hidden="true" />
              ) : t.tone === 'error' ? (
                <OctagonX size={18} style={{ color: 'var(--coral)' }} aria-hidden="true" />
              ) : (
                <Info size={18} style={{ color: 'var(--neon)' }} aria-hidden="true" />
              )}
              <div>
                <p className="text-sm font-semibold">{t.title}</p>
                {t.description && <p className="text-xs text-[var(--muted)]">{t.description}</p>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------- glass card ---------------- */

export function GlassCard({
  className = '',
  elevation = 2,
  liquid = false,
  specular = true,
  children,
  ...rest
}: {
  className?: string;
  elevation?: 1 | 2 | 3;
  liquid?: boolean;
  specular?: boolean;
  children: ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const ref = useSpecular<HTMLDivElement>();
  return (
    <div
      ref={specular ? ref : undefined}
      className={`glass glass-${elevation} ${specular ? 'specular' : ''} ${liquid ? 'liquid' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ---------------- status badge (color is never the only signal) ---------------- */

const STATUS_LABELS: Record<number, string> = {
  200: 'OK', 201: 'Created', 204: 'No Content',
  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found',
  405: 'Method Not Allowed', 409: 'Conflict', 413: 'Payload Too Large',
  415: 'Unsupported Media Type', 422: 'Unprocessable Entity', 429: 'Too Many Requests',
  500: 'Internal Server Error',
};

function toneFor(status: number): 'ok' | 'info' | 'warn' | 'client' | 'server' {
  if (status === 0) return 'server';
  if (status < 200) return 'info';
  if (status < 300) return 'ok';
  if (status < 400) return 'warn';
  if (status < 500) return 'client';
  return 'server';
}

const TONE_STYLE: Record<string, { color: string; Icon: typeof CheckCircle2 }> = {
  ok: { color: 'var(--mint)', Icon: CheckCircle2 },
  info: { color: 'var(--pulse)', Icon: Info },
  warn: { color: 'var(--gold)', Icon: ArrowRight },
  client: { color: 'color-mix(in oklch, var(--gold) 55%, var(--coral))', Icon: TriangleAlert },
  server: { color: 'var(--coral)', Icon: OctagonX },
};

export function StatusBadge({ status, className = '' }: { status: number; className?: string }) {
  const tone = toneFor(status);
  const { color, Icon } = TONE_STYLE[tone];
  const label = STATUS_LABELS[status] ?? (status === 0 ? 'Network Error' : 'Unknown');
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs font-medium ${className}`}
      style={{ color, borderColor: `color-mix(in oklch, ${color} 40%, transparent)`, background: `color-mix(in oklch, ${color} 12%, transparent)` }}
      role="status"
      aria-label={`HTTP ${status}: ${label}`}
    >
      <Icon size={13} aria-hidden="true" />
      {status === 0 ? 'ERR' : status} · {label}
    </span>
  );
}

/* ---------------- form field ---------------- */

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-[var(--muted)]">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm" style={{ color: 'var(--coral)' }}>
          <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-[var(--faint)]">{hint}</p>
      ) : null}
    </div>
  );
}

/* ---------------- misc ---------------- */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-2xl ${className}`} aria-hidden="true" />;
}

export function SectionHeader({ kicker, title, description }: { kicker: string; title: string; description?: string }) {
  return (
    <div className="reveal mb-8">
      <p
        className="mb-3 inline-block rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em]"
        style={{ color: 'var(--neon)', borderColor: 'color-mix(in oklch, var(--neon) 35%, transparent)' }}
      >
        {kicker}
      </p>
      <h1 className="display h-section font-semibold">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-[var(--muted)]">{description}</p>}
    </div>
  );
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost !px-3 !py-1.5 text-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        }
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      aria-label={`Copy ${label}`}
    >
      {done ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      {done ? 'Copied' : label}
    </button>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightJson(json: string): string {
  const e = escapeHtml(json);
  return e.replace(
    /("(\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?([eE][+-]?\d+)?/g,
    (m, str: string, _esc: string, colon: string, bool: string) => {
      const cls = str ? (colon ? 'tok-key' : 'tok-str') : bool ? 'tok-bool' : 'tok-num';
      return `<span class="${cls}">${m}</span>`;
    },
  );
}

export function HighlightedJson({ data, className = '' }: { data: unknown; className?: string }) {
  const html = useMemo(() => highlightJson(JSON.stringify(data, null, 2) ?? 'null'), [data]);
  return (
    <pre
      className={`json-view overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-[13px] leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
