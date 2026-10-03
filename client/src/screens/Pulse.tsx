import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ArrowDown, ArrowRight, ArrowUp, Cpu, Database, Radio, Timer } from 'lucide-react';
import { apiFetch, formatLatency, type ApiRequestDetail } from '../api/client';
import { GlassCard, useToast } from '../components/ui';
import { useSpecular } from '../hooks/useSpecular';

function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    if (from === target) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function Ecg({ points }: { points: number[] }) {
  const W = 300;
  const H = 64;
  const max = Math.max(...points, 1);
  const coords = points
    .map((v, i) => `${((i / Math.max(1, points.length - 1)) * W).toFixed(1)},${(H - 6 - (v / max) * (H - 14)).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-16 w-full" role="img" aria-label={`API latency over the last ${points.length} health polls`}>
      <polyline
        points={coords}
        fill="none"
        stroke="var(--neon)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 6px var(--neon))' }}
      />
    </svg>
  );
}

const CONCEPTS = [
  'RESTful naming', 'Status codes', 'JSON everywhere', 'Gatekeeper validation',
  'Statelessness', '401 vs 403', '429 rate limits', 'Docs or it didn\u2019t happen', 'Input \u2192 Process \u2192 Output',
];

const STAGES = [
  { key: 'input', label: 'Input', icon: ArrowDown, hint: 'Your request arrives' },
  { key: 'process', label: 'Process', icon: Cpu, hint: 'Gatekeeper + logic' },
  { key: 'output', label: 'Output', icon: ArrowUp, hint: 'JSON + status code' },
];

export default function Pulse() {
  const toast = useToast();
  const heroRef = useSpecular<HTMLDivElement>();
  const [health, setHealth] = useState<{ version: string; uptimeSeconds: number } | null>(null);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [latencies, setLatencies] = useState<number[]>([]);
  const [courses, setCourses] = useState(0);
  const [learners, setLearners] = useState(0);
  const [requests, setRequests] = useState(0);
  const [stage, setStage] = useState(0); // 0 idle, 1 input, 2 process, 3 output

  const coursesN = useCountUp(courses);
  const learnersN = useCountUp(learners);
  const requestsN = useCountUp(requests);

  // Health poll every 5s (feeds the chip + the ECG line).
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await apiFetch<{ version: string; uptimeSeconds: number }>('/api/v1/health');
        if (!alive) return;
        setApiOk(r.status === 200);
        if (r.status === 200) {
          setHealth({ version: String(r.data.version), uptimeSeconds: Number(r.data.uptimeSeconds) });
          setLatencies((ls) => [...ls, r.latencyMs].slice(-30));
        }
      } catch {
        if (alive) setApiOk(false);
      }
    };
    poll();
    const t = setInterval(poll, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // Totals once on mount.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [c, l] = await Promise.all([
          apiFetch<{ meta: { total: number } }>('/api/v1/courses?limit=1'),
          apiFetch<{ meta: { total: number } }>('/api/v1/learners?limit=1'),
        ]);
        if (alive) {
          setCourses(c.data.meta.total);
          setLearners(l.data.meta.total);
        }
      } catch {
        if (alive) toast({ title: 'Could not reach the API', description: 'Is the server running?', tone: 'error' });
      }
    })();
    return () => {
      alive = false;
    };
  }, [toast]);

  // Input -> Process -> Output strip lights up on EVERY real request.
  useEffect(() => {
    const timers: number[] = [];
    const onReq = (_e: Event) => {
      const detail = (_e as CustomEvent<ApiRequestDetail>).detail;
      setRequests((n) => n + 1);
      timers.forEach((t) => clearTimeout(t));
      timers.length = 0;
      setStage(1);
      timers.push(window.setTimeout(() => setStage(2), 220));
      timers.push(window.setTimeout(() => setStage(3), 440));
      timers.push(window.setTimeout(() => setStage(0), 1300));
      void detail;
    };
    window.addEventListener('api:request', onReq);
    return () => {
      window.removeEventListener('api:request', onReq);
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  const lastLatency = latencies[latencies.length - 1];

  return (
    <div>
      {/* Hero */}
      <div ref={heroRef} className="glass glass-3 liquid specular reveal overflow-hidden p-8 md:p-12">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
          <Radio size={12} aria-hidden="true" /> CourseHub · Part 1 · DecodeLabs Project 2
        </p>
        <h1 className="display h-hero max-w-3xl font-bold">
          The nervous system <span style={{ color: 'var(--neon)' }}>of your app.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-[var(--muted)]">
          NeuroAPI is a portfolio-grade REST API — Express 5, TypeScript, Zod 4 — with a living console.
          Every pulse of light behind this page is a real HTTP request.
        </p>

        {/* Live health chip */}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <span className="glass glass-pill glass-1 inline-flex items-center gap-2.5 px-4 py-2.5" role="status">
            <span
              className={`h-2.5 w-2.5 rounded-full ${apiOk ? 'pulse-dot' : ''}`}
              style={{
                background: apiOk === null ? 'var(--faint)' : apiOk ? 'var(--mint)' : 'var(--coral)',
                boxShadow: `0 0 12px ${apiOk ? 'var(--mint)' : 'var(--coral)'}`,
              }}
              aria-hidden="true"
            />
            <span className="text-sm font-medium">
              {apiOk === null ? 'Probing…' : apiOk ? 'API operational' : 'API unreachable'}
            </span>
            {health && (
              <span className="font-mono text-xs text-[var(--muted)]">
                v{health.version} · up {health.uptimeSeconds}s
              </span>
            )}
          </span>
          {lastLatency !== undefined && (
            <span className="inline-flex items-center gap-1.5 font-mono text-sm text-[var(--muted)]">
              <Timer size={14} aria-hidden="true" /> last poll {formatLatency(lastLatency)}
            </span>
          )}
        </div>

        {/* ECG latency line */}
        <div className="mt-6">
          <Ecg points={latencies.length ? latencies : [0]} />
          <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-[var(--faint)]">
            /health latency · last {latencies.length} polls
          </p>
        </div>
      </div>

      {/* Counters */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { icon: Database, label: 'Courses', value: coursesN },
          { icon: ArrowDown, label: 'Learners', value: learnersN },
          { icon: Radio, label: 'Requests this session', value: requestsN },
          { icon: Timer, label: 'Uptime (s)', value: health?.uptimeSeconds ?? 0 },
        ].map((s) => (
          <GlassCard key={s.label} elevation={1} className="reveal p-5">
            <s.icon size={18} style={{ color: 'var(--neon)' }} aria-hidden="true" />
            <p className="display mt-2 text-3xl font-bold tabular-nums">{s.value.toLocaleString()}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Input -> Process -> Output */}
      <GlassCard elevation={1} className="reveal mt-6 p-6 md:p-8" aria-label="Input Process Output model">
        <h2 className="display text-xl font-semibold">Input → Process → Output</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Every request travels this path. Make one — from the Playground, Resources, anywhere — and watch it light up.
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3 md:gap-6" role="status" aria-label={stage === 0 ? 'Idle' : `Stage: ${STAGES[stage - 1].label}`}>
          {STAGES.map((s, i) => {
            const active = stage === i + 1;
            return (
              <div key={s.key} className="relative">
                <motion.div
                  className="glass glass-pill glass-1 flex flex-col items-center gap-1 px-3 py-4 text-center"
                  animate={{
                    scale: active ? 1.04 : 1,
                    borderColor: active ? 'var(--neon)' : 'rgba(255,255,255,0.14)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  style={active ? { boxShadow: '0 0 28px color-mix(in oklch, var(--neon) 35%, transparent)' } : undefined}
                >
                  <s.icon size={20} style={{ color: active ? 'var(--neon)' : 'var(--faint)' }} aria-hidden="true" />
                  <span className="display text-sm font-semibold md:text-base">{s.label}</span>
                  <span className="hidden text-xs text-[var(--muted)] md:block">{s.hint}</span>
                </motion.div>
                {i < 2 && (
                  <ArrowRight
                    size={18}
                    className="absolute top-1/2 -right-4 hidden -translate-y-1/2 text-[var(--faint)] md:block"
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Concepts */}
      <div className="reveal mt-6 mb-12">
        <h2 className="display mb-3 text-xl font-semibold">Ideas, made visible</h2>
        <div className="flex flex-wrap gap-2">
          {CONCEPTS.map((c) => (
            <Link
              key={c}
              to="/docs"
              viewTransition
              className="glass glass-pill glass-1 px-4 py-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
            >
              {c}
            </Link>
          ))}
        </div>
      </div>

      {/* New Features Section */}
      <div className="reveal mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard elevation={2} className="p-8">
          <Database size={24} style={{ color: 'var(--neon)' }} className="mb-4" aria-hidden="true" />
          <h3 className="display text-xl font-bold mb-2">Persistent Data</h3>
          <p className="text-[var(--muted)] text-sm leading-relaxed">
            NeuroAPI stores user actions, session progress, and architectural configurations securely. Every endpoint ensures atomicity and consistency, keeping your frontend firmly rooted in reality.
          </p>
        </GlassCard>
        <GlassCard elevation={2} className="p-8">
          <Cpu size={24} style={{ color: 'var(--pulse)' }} className="mb-4" aria-hidden="true" />
          <h3 className="display text-xl font-bold mb-2">Gatekeeper Auth</h3>
          <p className="text-[var(--muted)] text-sm leading-relaxed">
            Zero-trust model implemented across the entire routing layer. Rate limiting (HTTP 429), payload validation via Zod, and JWT-based identity checks keep the infrastructure rock solid.
          </p>
        </GlassCard>
      </div>

      {/* System Architecture Section */}
      <div className="reveal mt-8 mb-8 p-8 md:p-12 glass glass-2 liquid">
        <h2 className="display text-2xl font-bold mb-4">System Architecture</h2>
        <p className="text-[var(--muted)] mb-6 max-w-3xl">
          The nervous system relies on a clean separation of concerns. The client sends lightweight REST payloads, which are intercepted by middleware, scrubbed for anomalies, and passed into our core business logic nodes.
        </p>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 glass glass-1 p-6 text-center rounded-2xl border border-white/5">
            <span className="block text-[var(--neon)] font-mono text-sm mb-2">01</span>
            <span className="font-semibold">Vite + React UI</span>
          </div>
          <div className="hidden md:flex items-center text-[var(--muted)]">
            <ArrowRight size={20} />
          </div>
          <div className="flex-1 glass glass-1 p-6 text-center rounded-2xl border border-white/5">
            <span className="block text-[var(--pulse)] font-mono text-sm mb-2">02</span>
            <span className="font-semibold">Express 5 REST</span>
          </div>
          <div className="hidden md:flex items-center text-[var(--muted)]">
            <ArrowRight size={20} />
          </div>
          <div className="flex-1 glass glass-1 p-6 text-center rounded-2xl border border-white/5">
            <span className="block text-[var(--mint)] font-mono text-sm mb-2">03</span>
            <span className="font-semibold">Postgres + Prisma</span>
          </div>
        </div>
      </div>
    </div>
  );
}
