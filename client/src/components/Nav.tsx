import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Activity, BookOpen, Database, FlaskConical, House, TestTube2 } from 'lucide-react';
import { apiFetch } from '../api/client';
import { useSpecular } from '../hooks/useSpecular';

const LINKS = [
  { to: '/', label: 'Pulse', icon: House, end: true },
  { to: '/playground', label: 'Playground', icon: FlaskConical },
  { to: '/resources', label: 'Resources', icon: Database },
  { to: '/status-lab', label: 'Status Lab', icon: TestTube2 },
  { to: '/docs', label: 'Docs', icon: BookOpen },
];

const SPRING = { type: 'spring', stiffness: 500, damping: 38 } as const;

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
  );
}

/** Live API status dot. */
function StatusDot() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const r = await apiFetch('/api/v1/health');
        if (alive) setOk(r.status === 200);
      } catch {
        if (alive) setOk(false);
      }
    };
    check();
    const t = setInterval(check, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  const color = ok === null ? 'var(--faint)' : ok ? 'var(--mint)' : 'var(--coral)';
  return (
    <span
      role="status"
      aria-label={ok === null ? 'Checking API status' : ok ? 'API operational' : 'API unreachable'}
      title={ok === null ? 'Checking…' : ok ? 'API operational' : 'API unreachable'}
      className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? 'pulse-dot' : ''}`}
      style={{ background: color, boxShadow: `0 0 10px ${color}` }}
    />
  );
}

function LogoMark() {
  return (
    <span
      className="grid h-8 w-8 place-items-center rounded-xl text-[#04121a]"
      style={{ background: 'linear-gradient(135deg, var(--neon), var(--pulse))' }}
      aria-hidden="true"
    >
      <Activity size={18} strokeWidth={2.5} />
    </span>
  );
}

/**
 * ONE nav component. ≥768px: floating centered pill (condenses after 24px of
 * scroll). <768px: slim top pill + floating bottom tab bar with a draggable
 * liquid capsule (iOS-26 style scrub).
 */
export default function Nav() {
  const desktop = useMediaQuery('(min-width: 768px)');
  const [condensed, setCondensed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useSpecular<HTMLElement>();

  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const onScrubEnd = (_: unknown, info: { point: { x: number } }) => {
    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const idx = Math.max(0, Math.min(LINKS.length - 1, Math.round(((info.point.x - rect.left) / rect.width) * LINKS.length - 0.5)));
    if (LINKS[idx].to !== location.pathname) navigate(LINKS[idx].to);
  };

  if (desktop) {
    return (
      <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <nav
          ref={pillRef}
          aria-label="Primary"
          className={`glass glass-pill glass-1 liquid specular flex items-center gap-1 transition-all duration-300 ${
            condensed ? 'max-w-[560px] px-2 py-1.5' : 'max-w-[720px] px-3 py-2.5'
          }`}
        >
          <NavLink to="/" viewTransition className="mr-1 flex items-center gap-2 rounded-full px-2 py-1" aria-label="NeuroAPI home">
            <LogoMark />
            {!condensed && <span className="display text-lg font-semibold tracking-tight">NeuroAPI</span>}
          </NavLink>
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              viewTransition
              className={({ isActive }) =>
                `relative flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${
                  isActive ? 'text-[#04121a]' : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-full"
                      style={{ background: 'linear-gradient(135deg, var(--neon), var(--pulse))' }}
                      transition={SPRING}
                    />
                  )}
                  <l.icon size={16} className="relative z-10" aria-hidden="true" />
                  <span className="relative z-10">{l.label}</span>
                </>
              )}
            </NavLink>
          ))}
          <span className="ml-1 flex min-h-[44px] items-center px-2">
            <StatusDot />
          </span>
        </nav>
      </header>
    );
  }

  return (
    <>
      <header className="fixed inset-x-0 top-3 z-50 flex justify-center px-4">
        <div className="glass glass-pill glass-1 flex items-center gap-2 px-4 py-2">
          <LogoMark />
          <span className="display text-base font-semibold tracking-tight">NeuroAPI</span>
          <StatusDot />
        </div>
      </header>

      <nav aria-label="Primary" className="fixed inset-x-3 bottom-3 z-50 md:hidden" style={{ bottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
        <div ref={barRef} className="glass glass-pill glass-1 liquid relative grid h-16 grid-cols-5 px-1">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              viewTransition
              className="relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium"
              style={({ isActive }) => ({ color: isActive ? '#04121a' : 'var(--muted)' })}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="tab-active"
                      className="absolute inset-1 rounded-full"
                      style={{ background: 'linear-gradient(135deg, var(--neon), var(--pulse))', touchAction: 'pan-y' }}
                      transition={SPRING}
                      drag="x"
                      dragConstraints={barRef}
                      dragElastic={0.12}
                      dragMomentum={false}
                      onDragEnd={onScrubEnd}
                      aria-hidden="true"
                    />
                  )}
                  <l.icon size={19} className="relative z-10" aria-hidden="true" />
                  <span className="relative z-10 leading-none">{l.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
