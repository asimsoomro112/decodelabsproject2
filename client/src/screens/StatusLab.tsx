import { useState } from 'react';
import { motion } from 'motion/react';
import { FlaskConical, RotateCcw } from 'lucide-react';
import { apiFetch, formatLatency } from '../api/client';
import { GlassCard, HighlightedJson, SectionHeader, StatusBadge, useToast } from '../components/ui';

const CLASSES = [
  { key: '1xx', hint: 'Informational', color: 'var(--pulse)' },
  { key: '2xx', hint: 'Success', color: 'var(--mint)' },
  { key: '3xx', hint: 'Redirection', color: 'var(--gold)' },
  { key: '4xx', hint: 'Client error', color: 'color-mix(in oklch, var(--gold) 55%, var(--coral))' },
  { key: '5xx', hint: 'Server error', color: 'var(--coral)' },
];

const CODES = [200, 201, 204, 400, 401, 403, 404, 429, 500];

const EXPLANATIONS: Record<number, string> = {
  200: 'OK — the request succeeded and the server answered.',
  201: 'Created — a new resource exists; the Location header says where.',
  204: 'No Content — success with deliberately nothing to say. No body at all.',
  400: 'Bad Request — the server could not understand the request.',
  401: 'Unauthorized — who are you? No valid credentials were presented.',
  403: 'Forbidden — authentication would succeed; authorization does not. You may not.',
  404: 'Not Found — nothing lives at that address.',
  429: 'Too Many Requests — slow down; Retry-After says exactly how long.',
  500: 'Internal Server Error — something broke on our side, via the real error handler. The detail stays generic; the requestId is in the logs.',
};

function classOf(status: number): string {
  return `${Math.floor(status / 100)}xx`;
}

interface LabResult {
  code: number;
  status: number;
  body: unknown;
  latencyMs: number;
}

export default function StatusLab() {
  const toast = useToast();
  const [fills, setFills] = useState<Record<string, number>>({ '1xx': 4, '2xx': 4, '3xx': 4, '4xx': 4, '5xx': 4 });
  const [result, setResult] = useState<LabResult | null>(null);
  const [testing, setTesting] = useState<number | null>(null);

  const test = async (code: number) => {
    setTesting(code);
    try {
      const r = await apiFetch(`/api/v1/demo/status/${code}`);
      setFills((f) => ({ ...f, [classOf(r.status)]: 100 }));
      setResult({ code, status: r.status, body: r.data, latencyMs: r.latencyMs });
    } catch {
      toast({ title: 'Network error', description: 'The server did not answer.', tone: 'error' });
    } finally {
      setTesting(null);
    }
  };

  const reset = () => {
    setFills({ '1xx': 4, '2xx': 4, '3xx': 4, '4xx': 4, '5xx': 4 });
    setResult(null);
  };

  return (
    <div>
      <SectionHeader
        kicker="Status Lab"
        title="Every status code, on tap."
        description="Each button calls /demo/status/:code and the server returns that real status — 204 with no body, 500 through the genuine error handler. The matching tube fills with light."
      />

      {/* Tubes */}
      <GlassCard elevation={2} className="p-6 md:p-8">
        <div className="flex items-end justify-between">
          <h2 className="display text-lg font-semibold">The rack</h2>
          <button type="button" className="btn-ghost !py-1.5 text-xs" onClick={reset}>
            <RotateCcw size={13} aria-hidden="true" /> Drain tubes
          </button>
        </div>
        <div className="mt-6 flex justify-around gap-2" role="img" aria-label="Test tubes for status classes 1xx through 5xx">
          {CLASSES.map((c) => (
            <div key={c.key} className="flex flex-col items-center gap-2.5">
              <div className="relative h-40 w-14 overflow-hidden rounded-full border border-white/15 bg-black/30 md:h-48 md:w-16">
                <motion.div
                  className="absolute inset-x-0 bottom-0"
                  style={{ background: c.color, boxShadow: `0 0 26px ${c.color}` }}
                  initial={false}
                  animate={{ height: `${fills[c.key]}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                />
                <div
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{ background: 'linear-gradient(105deg, rgba(255,255,255,0.16), transparent 42%)' }}
                />
              </div>
              <div className="text-center">
                <p className="font-mono text-sm font-semibold" style={{ color: c.color }}>{c.key}</p>
                <p className="text-[11px] text-[var(--faint)]">{c.hint}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Buttons */}
      <div className="mt-6 grid grid-cols-3 gap-3 md:grid-cols-9">
        {CODES.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => test(code)}
            disabled={testing !== null}
            className="glass glass-1 glass-pill specular flex min-h-[52px] items-center justify-center font-mono text-sm font-semibold transition-transform active:scale-95 disabled:opacity-60"
            style={{ color: `var(--${classOf(code) === '2xx' ? 'mint' : classOf(code) === '4xx' ? 'gold' : classOf(code) === '5xx' ? 'coral' : 'neon'})` }}
            aria-label={`Test status code ${code}`}
          >
            {testing === code ? '…' : code}
          </button>
        ))}
      </div>

      {/* Result */}
      {result && (
        <GlassCard elevation={2} className="mt-6 p-6" aria-live="polite">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={result.status} />
            <span className="font-mono text-xs text-[var(--muted)]">{formatLatency(result.latencyMs)}</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <FlaskConical size={13} aria-hidden="true" /> GET /api/v1/demo/status/{result.code}
            </span>
          </div>
          <p className="mt-4 max-w-2xl text-[var(--muted)]">{EXPLANATIONS[result.code]}</p>
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-[var(--muted)]">
              {result.status === 204 ? 'Body (deliberately empty)' : 'Body'}
            </p>
            {result.status === 204 ? (
              <p className="font-mono text-xs text-[var(--faint)]">(no content — that is the point of 204)</p>
            ) : (
              <HighlightedJson data={result.body} className="max-h-72" />
            )}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
