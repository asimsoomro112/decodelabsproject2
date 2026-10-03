import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { motion } from 'motion/react';
import { KeyRound, Plus, Send, Trash2, X } from 'lucide-react';
import { apiFetch, formatBytes, formatLatency, DEMO_READ_KEY, DEMO_WRITE_KEY, type ApiResult } from '../api/client';
import { PATH_SUGGESTIONS } from '../api/endpoints';
import { CopyButton, Field, GlassCard, HighlightedJson, SectionHeader, StatusBadge, useToast } from '../components/ui';

interface HeaderRow {
  id: number;
  k: string;
  v: string;
}
interface HistoryEntry {
  id: number;
  method: string;
  path: string;
  headers: HeaderRow[];
  body: string;
  status: number;
  at: Date;
}

let headerId = 0;
const newHeader = (k = '', v = ''): HeaderRow => ({ id: ++headerId, k, v });

const DEFAULT_BODY = JSON.stringify(
  {
    title: 'GraphQL in Practice',
    description: 'Schemas, resolvers and federation for product APIs.',
    level: 'intermediate',
    seats: 40,
    startDate: '2026-12-01',
  },
  null,
  2,
);

export default function Playground() {
  const toast = useToast();
  const location = useLocation();
  const [method, setMethod] = useState<'GET' | 'POST'>('GET');
  const [path, setPath] = useState('/api/v1/courses');
  const [headers, setHeaders] = useState<HeaderRow[]>([newHeader('X-API-Key', '')]);
  const [bodyText, setBodyText] = useState(DEFAULT_BODY);
  const [lint, setLint] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'out' | 'back'>('idle');
  const [result, setResult] = useState<ApiResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);

  // Preload from Docs "Try it".
  useEffect(() => {
    const s = location.state as { method?: 'GET' | 'POST'; path?: string; body?: unknown } | null;
    if (!s) return;
    if (s.method) setMethod(s.method);
    if (s.path) setPath(s.path.replace('{id}', '').replace('{code}', '200'));
    if (s.body !== undefined) setBodyText(JSON.stringify(s.body, null, 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setHeader = (id: number, field: 'k' | 'v', value: string) =>
    setHeaders((hs) => hs.map((h) => (h.id === id ? { ...h, [field]: value } : h)));

  const quickFill = (key: string) =>
    setHeaders((hs) => {
      const i = hs.findIndex((h) => h.k.toLowerCase() === 'x-api-key');
      const row = newHeader('X-API-Key', key);
      if (i === -1) return [...hs, row];
      return hs.map((h, idx) => (idx === i ? { ...h, v: key } : h));
    });

  const send = async () => {
    if (sending) return;
    let body: string | undefined;
    if (method === 'POST' && bodyText.trim()) {
      try {
        JSON.parse(bodyText);
        body = bodyText;
        setLint(null);
      } catch {
        setLint('Body is not valid JSON — fix it before sending.');
        return;
      }
    }
    setSending(true);
    setPhase('out');
    const h: Record<string, string> = {};
    headers.forEach(({ k, v }) => {
      if (k.trim()) h[k.trim()] = v;
    });
    try {
      const r = await apiFetch(path, { method, headers: h, body });
      setResult(r);
      setPhase('back');
      setHistory((hs) =>
        [{ id: Date.now(), method, path, headers: headers.map((x) => ({ ...x })), body: bodyText, status: r.status, at: new Date() }, ...hs].slice(0, 10),
      );
      window.setTimeout(() => setPhase('idle'), 1000);
      toast({ title: `${method} ${r.status}`, description: `${formatLatency(r.latencyMs)} · ${formatBytes(r.sizeBytes)}`, tone: r.ok ? 'ok' : 'error' });
    } catch {
      setPhase('idle');
      setResult(null);
      toast({ title: 'Network error', description: 'The server did not answer.', tone: 'error' });
    } finally {
      setSending(false);
    }
  };

  const headerObj = Object.fromEntries(headers.filter((h) => h.k.trim()).map((h) => [h.k.trim(), h.v]));
  const curl = [
    `curl -X ${method} '${`${window.location.origin}${path}`}'`,
    ...Object.entries(headerObj).map(([k, v]) => `  -H '${k}: ${v}'`),
    ...(method === 'POST' && bodyText.trim() ? [`  -d '${bodyText.replace(/\n/g, ' ')}'`] : []),
  ].join(' \\\n');
  const fetchSnippet = `const res = await fetch('${path}', {\n  method: '${method}',\n  headers: ${JSON.stringify(headerObj, null, 2)},\n${method === 'POST' ? `  body: JSON.stringify(${bodyText.trim() ? bodyText : '{}'}, null, 2),\n` : ''}});\nconst data = await res.json();`;

  const restore = (e: HistoryEntry) => {
    setMethod(e.method as 'GET' | 'POST');
    setPath(e.path);
    setHeaders(e.headers.map((x) => ({ ...x })));
    setBodyText(e.body);
  };

  return (
    <div>
      <SectionHeader
        kicker="Playground"
        title="Talk to the API like it owes you answers."
        description="Build a request, watch the packet travel client → network → server and back, then inspect every byte of the response."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Builder */}
        <GlassCard elevation={2} className="p-6">
          <div className="flex gap-3">
            <Field label="Method" htmlFor="pg-method">
              <select id="pg-method" className="field-input" value={method} onChange={(e) => setMethod(e.target.value as 'GET' | 'POST')}>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </Field>
            <div className="flex-1">
              <Field label="Path" htmlFor="pg-path">
                <input
                  id="pg-path"
                  className="field-input font-mono text-sm"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  list="pg-paths"
                  spellCheck={false}
                  autoComplete="off"
                />
                <datalist id="pg-paths">
                  {PATH_SUGGESTIONS.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </Field>
            </div>
          </div>

          {/* Headers */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--muted)]">Headers</span>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost !px-3 !py-1 text-xs" onClick={() => quickFill(DEMO_WRITE_KEY)}>
                  <KeyRound size={13} aria-hidden="true" /> Write key
                </button>
                <button type="button" className="btn-ghost !px-3 !py-1 text-xs" onClick={() => quickFill(DEMO_READ_KEY)}>
                  <KeyRound size={13} aria-hidden="true" /> Read key
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {headers.map((h) => (
                <div key={h.id} className="flex gap-2">
                  <input
                    className="field-input font-mono text-sm"
                    placeholder="Header"
                    value={h.k}
                    onChange={(e) => setHeader(h.id, 'k', e.target.value)}
                    aria-label="Header name"
                  />
                  <input
                    className="field-input font-mono text-sm"
                    placeholder="Value"
                    value={h.v}
                    onChange={(e) => setHeader(h.id, 'v', e.target.value)}
                    aria-label="Header value"
                  />
                  <button
                    type="button"
                    className="btn-ghost !px-3"
                    onClick={() => setHeaders((hs) => hs.filter((x) => x.id !== h.id))}
                    aria-label="Remove header"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="btn-ghost mt-2 !py-1.5 text-xs" onClick={() => setHeaders((hs) => [...hs, newHeader()])}>
              <Plus size={14} aria-hidden="true" /> Add header
            </button>
          </div>

          {/* Body */}
          {method === 'POST' && (
            <div className="mt-5">
              <Field label="JSON body" htmlFor="pg-body" error={lint ?? undefined}>
                <textarea
                  id="pg-body"
                  className="field-input json-view min-h-44"
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  spellCheck={false}
                />
              </Field>
            </div>
          )}

          <button type="button" className="btn-primary mt-6 w-full justify-center" onClick={send} disabled={sending}>
            <Send size={16} aria-hidden="true" /> {sending ? 'Sending…' : 'Send request'}
          </button>

          {/* Packet track */}
          <div className="mt-6" aria-hidden="true">
            <div ref={trackRef} className="relative h-10 overflow-hidden rounded-full border border-white/10 bg-black/25">
              <div className="absolute inset-0 flex items-center justify-between px-4 font-mono text-[10px] uppercase tracking-widest text-[var(--faint)]">
                <span>Client</span>
                <span>Network</span>
                <span>Server</span>
              </div>
              <motion.div
                className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full"
                style={{ background: 'var(--neon)', boxShadow: '0 0 18px var(--neon)', left: 8 }}
                animate={{
                  x: phase === 'out' ? (trackRef.current ? trackRef.current.clientWidth - 40 : 200) : 0,
                  opacity: phase === 'idle' ? 0 : 1,
                }}
                transition={{ type: 'spring', stiffness: 90, damping: 18 }}
              />
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--muted)]">History (last 10)</span>
                <button type="button" className="btn-ghost !px-3 !py-1 text-xs" onClick={() => setHistory([])}>
                  <Trash2 size={13} aria-hidden="true" /> Clear
                </button>
              </div>
              <ul className="space-y-1.5">
                {history.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => restore(e)}
                      className="flex w-full items-center gap-3 rounded-xl border border-white/10 px-3 py-2 text-left font-mono text-xs transition-colors hover:border-white/25"
                    >
                      <span style={{ color: e.method === 'GET' ? 'var(--mint)' : 'var(--neon)' }}>{e.method}</span>
                      <span className="flex-1 truncate text-[var(--muted)]">{e.path}</span>
                      <StatusBadge status={e.status} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </GlassCard>

        {/* Response */}
        <div aria-live="polite" aria-label="Response">
          {!result ? (
            <GlassCard elevation={1} className="grid h-full min-h-72 place-items-center p-8 text-center">
              <div>
                <Send size={28} className="mx-auto text-[var(--faint)]" aria-hidden="true" />
                <p className="mt-3 text-[var(--muted)]">No response yet.</p>
                <p className="text-sm text-[var(--faint)]">Build a request and hit Send — the packet will travel above.</p>
              </div>
            </GlassCard>
          ) : (
            <GlassCard elevation={2} className="p-6">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={result.status} />
                <span className="font-mono text-xs text-[var(--muted)]">{formatLatency(result.latencyMs)}</span>
                <span className="font-mono text-xs text-[var(--muted)]">{formatBytes(result.sizeBytes)}</span>
                <span className="ml-auto flex gap-2">
                  <CopyButton text={curl} label="cURL" />
                  <CopyButton text={fetchSnippet} label="fetch" />
                </span>
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-[var(--muted)]">
                  Response headers ({Array.from(result.headers.keys()).length})
                </summary>
                <dl className="mt-2 space-y-1 font-mono text-xs">
                  {Array.from(result.headers.entries()).map(([k, v]) => (
                    <div key={k} className="flex gap-3">
                      <dt className="shrink-0 text-[var(--neon)]">{k}</dt>
                      <dd className="break-all text-[var(--muted)]">{v}</dd>
                    </div>
                  ))}
                </dl>
              </details>

              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-[var(--muted)]">Body</p>
                <HighlightedJson data={result.data} className="max-h-[420px]" />
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
