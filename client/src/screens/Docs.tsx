import { useNavigate } from 'react-router';
import { ArrowUpRight, FlaskConical } from 'lucide-react';
import { ENDPOINTS, type EndpointDoc } from '../api/endpoints';
import { GlassCard, HighlightedJson, SectionHeader } from '../components/ui';

const CONCEPTS = [
  { title: 'RESTful naming', text: 'Resources are plural nouns (/courses, /learners); methods are verbs (GET, POST). No verbs or file extensions in paths.', see: 'Every card below.' },
  { title: 'Correct status codes', text: '201 created, 204 empty, 400 / 422 / 409 for distinct failures — never a bare 200 smuggling an error.', see: 'Status Lab.' },
  { title: 'JSON', text: 'One language everywhere: requests, responses, errors.', see: 'Playground response panel.' },
  { title: 'Gatekeeper rule', text: 'Never trust the client. Layer 1 — Zod strict schemas → 400. Layer 2 — business rules → 422, duplicates → 409. Every field error at once.', see: 'Resources create forms.' },
  { title: 'Statelessness', text: 'No sessions, no per-client server state. Each request carries what it needs.', see: 'X-API-Key on every write.' },
  { title: '401 vs 403', text: '401 = who are you? 403 = you may not. A read-only key proves the difference live.', see: 'Playground quick-fill.' },
  { title: 'Rate limiting · 429', text: '20 writes/min and 120 requests/min per IP, with Retry-After and RateLimit headers.', see: 'Status Lab → 429.' },
  { title: 'Documentation', text: "If it isn't documented, it doesn't exist. OpenAPI 3.1 generated from the Zod schemas — docs can't drift from validation.", see: '/reference.' },
  { title: 'Input → Process → Output', text: 'Every request is Input (validate) → Process (logic) → Output (JSON + status).', see: 'The Pulse strip.' },
];

function MethodBadge({ method }: { method: 'GET' | 'POST' }) {
  const color = method === 'GET' ? 'var(--mint)' : 'var(--neon)';
  return (
    <span
      className="rounded-lg border px-2.5 py-1 font-mono text-xs font-bold"
      style={{ color, borderColor: `color-mix(in oklch, ${color} 45%, transparent)`, background: `color-mix(in oklch, ${color} 10%, transparent)` }}
    >
      {method}
    </span>
  );
}

function EndpointCard({ ep }: { ep: EndpointDoc }) {
  const navigate = useNavigate();
  return (
    <GlassCard elevation={2} className="reveal p-6 min-w-0">
      <div className="flex flex-wrap items-center gap-3">
        <MethodBadge method={ep.method} />
        <code className="font-mono text-sm text-[var(--ink)]">{ep.path}</code>
        {ep.auth && (
          <span className="rounded-full border border-white/15 px-2.5 py-0.5 font-mono text-[11px] text-[var(--gold)]">
            X-API-Key: write
          </span>
        )}
        <button
          type="button"
          className="btn-ghost ml-auto !py-1.5 text-xs"
          onClick={() => navigate('/playground', { state: { method: ep.method, path: ep.path, body: ep.bodyExample } })}
        >
          <FlaskConical size={13} aria-hidden="true" /> Try it
        </button>
      </div>

      <h3 className="display mt-3 text-lg font-semibold">{ep.title}</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">{ep.description}</p>

      {ep.query && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="font-mono text-[11px] uppercase tracking-widest text-[var(--faint)]">
                <th className="pb-2 pr-4 font-medium">Query</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {ep.query.map((q) => (
                <tr key={q.name} className="border-t border-white/10">
                  <td className="py-2 pr-4 font-mono text-[var(--neon)]">{q.name}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-[var(--muted)]">{q.type}</td>
                  <td className="py-2 text-[var(--muted)]">{q.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ep.bodyExample !== undefined && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-[var(--muted)]">Example request body</summary>
          <HighlightedJson data={ep.bodyExample} className="mt-2 max-h-56" />
        </details>
      )}

      <div className="mt-4">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-[var(--faint)]">Status codes</p>
        <ul className="space-y-1.5">
          {ep.statuses.map((s) => (
            <li key={s.code} className="flex gap-3 text-sm">
              <span className="w-10 shrink-0 font-mono font-semibold" style={{ color: `var(--${s.code < 300 ? 'mint' : s.code < 500 ? 'gold' : 'coral'})` }}>
                {s.code}
              </span>
              <span className="text-[var(--muted)]">{s.meaning}</span>
            </li>
          ))}
        </ul>
      </div>
    </GlassCard>
  );
}

export default function Docs() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return (
    <div>
      <SectionHeader
        kicker="Docs"
        title="If it isn't documented, it doesn't exist."
        description="Every endpoint, its contract, and a one-click jump into the Playground. The machine-readable source of truth lives at /openapi.json."
      />

      <GlassCard elevation={1} className="reveal mb-8 flex flex-wrap items-center gap-4 p-5">
        <div className="flex-1 min-w-52">
          <h2 className="display text-lg font-semibold">Interactive reference</h2>
          <p className="text-sm text-[var(--muted)]">Scalar renders the OpenAPI document — generated from the Zod schemas.</p>
        </div>
        <a className="btn-primary" href={`${origin}/reference`} target="_blank" rel="noreferrer">
          Open /reference <ArrowUpRight size={15} aria-hidden="true" />
        </a>
        <a className="btn-ghost" href={`${origin}/openapi.json`} target="_blank" rel="noreferrer">
          openapi.json <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </GlassCard>

      <div className="grid gap-5">
        {ENDPOINTS.map((ep) => (
          <EndpointCard key={ep.id} ep={ep} />
        ))}
      </div>

      <h2 className="display reveal mt-12 mb-5 text-2xl font-semibold">The ideas, and where to see them</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CONCEPTS.map((c) => (
          <GlassCard key={c.title} elevation={1} className="reveal p-5">
            <h3 className="display font-semibold" style={{ color: 'var(--neon)' }}>{c.title}</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">{c.text}</p>
            <p className="mt-3 font-mono text-xs text-[var(--faint)]">See it: {c.see}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
