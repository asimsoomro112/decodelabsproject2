import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import NerveCanvas from './components/NerveCanvas';
import Nav from './components/Nav';
import { ToastProvider } from './components/ui';

const Pulse = lazy(() => import('./screens/Pulse'));
const Playground = lazy(() => import('./screens/Playground'));
const Resources = lazy(() => import('./screens/Resources'));
const StatusLab = lazy(() => import('./screens/StatusLab'));
const Docs = lazy(() => import('./screens/Docs'));

const VT_SUPPORTED =
  typeof document !== 'undefined' &&
  typeof (document as unknown as { startViewTransition?: unknown }).startViewTransition === 'function';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

/** Chromium-only liquid enhancement for the nav pill + hero card (falls back to plain glass). */
function useLiquidGlass() {
  useEffect(() => {
    const isChromium =
      typeof window !== 'undefined' &&
      !!(window as unknown as { chrome?: unknown }).chrome &&
      typeof CSS !== 'undefined' &&
      CSS.supports('backdrop-filter', 'url(#neuro-liquid)');
    if (isChromium) document.documentElement.classList.add('has-liquid');
  }, []);
}

function AnimatedRoutes() {
  const location = useLocation();
  const routes = (
    <Routes location={location}>
      <Route path="/" element={<Pulse />} />
      <Route path="/playground" element={<Playground />} />
      <Route path="/resources" element={<Resources />} />
      <Route path="/status-lab" element={<StatusLab />} />
      <Route path="/docs" element={<Docs />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
  if (VT_SUPPORTED) return routes;
  // Fallback: Motion crossfade when the View Transitions API is unavailable.
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {routes}
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  useLiquidGlass();
  return (
    <ToastProvider>
      {/* Inline SVG filter for the liquid-glass enhancement (Chromium only). */}
      <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="neuro-liquid" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="22" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <NerveCanvas />
      <Nav />
      <ScrollToTop />

      <div className="relative z-10">
        <main id="main" className="mx-auto w-full max-w-6xl px-4 pt-28 pb-10 md:pt-32 md:pb-16 md:px-6 pb-safe">
          <Suspense fallback={<div className="skeleton h-64 rounded-3xl" aria-label="Loading screen" />}>
            <AnimatedRoutes />
          </Suspense>
        </main>

        <footer className="relative z-10 border-t border-white/10 pb-28 md:pb-10">
          <p className="mx-auto max-w-6xl px-4 md:px-6 py-6 text-center text-sm text-[var(--muted)]">
            Built by <span className="text-[var(--ink)] font-medium">Asim</span> — DecodeLabs Industrial Training Kit — Batch 2026
          </p>
        </footer>
      </div>
    </ToastProvider>
  );
}
