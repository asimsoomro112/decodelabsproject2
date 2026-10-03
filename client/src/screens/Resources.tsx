import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react';
import { apiFetch, DEMO_WRITE_KEY } from '../api/client';
import { Field, GlassCard, SectionHeader, Skeleton, useToast } from '../components/ui';

type Tab = 'courses' | 'learners';

interface Course {
  id: string; title: string; description?: string; level: string; seats: number; startDate: string; createdAt: string;
}
interface Learner {
  id: string; name: string; email: string; createdAt: string;
}
interface Meta {
  total: number; page: number; limit: number;
}
interface FieldErrorItem {
  field: string; code: string; message: string;
}

const SPRING = { type: 'spring', stiffness: 320, damping: 32 } as const;

export default function Resources() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('courses');
  const [items, setItems] = useState<(Course | Learner)[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selected, setSelected] = useState<Course | Learner | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [apiKey, setApiKey] = useState(DEMO_WRITE_KEY);
  const [form, setForm] = useState({ title: '', description: '', level: 'beginner', seats: '40', startDate: '', name: '', email: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Debounced search.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(qInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [qInput]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q) params.set('q', q);
      if (tab === 'courses' && level) params.set('level', level);
      const r = await apiFetch<{ data: (Course | Learner)[]; meta: Meta }>(`/api/v1/${tab}?${params}`);
      if (r.status === 200) {
        setItems(r.data.data);
        setMeta(r.data.meta);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, q, level, page, limit]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    setPage(1);
    setSelected(null);
    setShowForm(false);
    setFieldErrors({});
  }, [tab]);

  // Esc closes the drawer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    const payload =
      tab === 'courses'
        ? {
            title: form.title,
            ...(form.description ? { description: form.description } : {}),
            level: form.level,
            seats: Number(form.seats),
            startDate: form.startDate,
          }
        : { name: form.name, email: form.email };
    try {
      const r = await apiFetch<{ id: string } & Record<string, unknown>>(`/api/v1/${tab}`, {
        method: 'POST',
        headers: { 'X-API-Key': apiKey },
        json: payload,
      });
      if (r.status === 201) {
        toast({ title: 'Created', description: `201 — the API accepted it.`, tone: 'ok' });
        setShowForm(false);
        setForm({ title: '', description: '', level: 'beginner', seats: '40', startDate: '', name: '', email: '' });
        fetchList();
      } else if (r.status === 400 || r.status === 422 || r.status === 409) {
        const data = r.data as unknown as { detail?: string; errors?: FieldErrorItem[] };
        const mapped: Record<string, string> = {};
        for (const err of data.errors ?? []) {
          mapped[err.field] = mapped[err.field] ? `${mapped[err.field]} ${err.message}` : err.message;
        }
        setFieldErrors(mapped);
        if (Object.keys(mapped).length === 0) {
          toast({ title: `Request rejected (${r.status})`, description: data.detail, tone: 'error' });
        }
      } else {
        const data = r.data as unknown as { detail?: string; title?: string };
        toast({ title: data.title ?? `Error ${r.status}`, description: data.detail, tone: 'error' });
      }
    } catch {
      toast({ title: 'Network error', description: 'The server did not answer.', tone: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));
  const isCourse = (x: Course | Learner): x is Course => 'title' in x;

  return (
    <div>
      <SectionHeader
        kicker="Resources"
        title="The API, used for real."
        description="Live lists with search, filter and pagination — and create forms that surface the API's field-level errors inline. This is the Gatekeeper, visible."
      />

      {/* Tabs + actions */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="glass glass-pill glass-1 flex p-1" role="tablist" aria-label="Resource type">
          {(['courses', 'learners'] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`relative min-h-[44px] rounded-full px-5 text-sm font-medium capitalize transition-colors ${
                tab === t ? 'text-[#04121a]' : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              {tab === t && (
                <motion.span
                  layoutId="res-tab"
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'linear-gradient(135deg, var(--neon), var(--pulse))' }}
                  transition={SPRING}
                />
              )}
              <span className="relative z-10">{t}</span>
            </button>
          ))}
        </div>
        <button type="button" className="btn-primary ml-auto" onClick={() => setShowForm((s) => !s)}>
          {showForm ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
          {showForm ? 'Close form' : `New ${tab === 'courses' ? 'course' : 'learner'}`}
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence initial={false}>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <GlassCard elevation={3} className="mb-6 p-6">
              <form onSubmit={submit} noValidate>
                <div className="grid gap-4 md:grid-cols-2">
                  {tab === 'courses' ? (
                    <>
                      <Field label="Title" htmlFor="f-title" error={fieldErrors.title}>
                        <input id="f-title" className="field-input" value={form.title} onChange={set('title')} placeholder="GraphQL in Practice" />
                      </Field>
                      <Field label="Level" htmlFor="f-level" error={fieldErrors.level}>
                        <select id="f-level" className="field-input" value={form.level} onChange={set('level')}>
                          <option value="beginner">beginner</option>
                          <option value="intermediate">intermediate</option>
                          <option value="advanced">advanced</option>
                        </select>
                      </Field>
                      <div className="md:col-span-2">
                        <Field label="Description (optional)" htmlFor="f-desc" error={fieldErrors.description}>
                          <textarea id="f-desc" className="field-input" rows={2} value={form.description} onChange={set('description')} placeholder="What will learners build?" />
                        </Field>
                      </div>
                      <Field label="Seats (1–500)" htmlFor="f-seats" error={fieldErrors.seats}>
                        <input id="f-seats" type="number" min={1} max={500} className="field-input" value={form.seats} onChange={set('seats')} />
                      </Field>
                      <Field label="Start date (not in the past → 422)" htmlFor="f-date" error={fieldErrors.startDate}>
                        <input id="f-date" type="date" className="field-input" value={form.startDate} onChange={set('startDate')} />
                      </Field>
                    </>
                  ) : (
                    <>
                      <Field label="Name" htmlFor="f-name" error={fieldErrors.name}>
                        <input id="f-name" className="field-input" value={form.name} onChange={set('name')} placeholder="Zara Iqbal" />
                      </Field>
                      <Field label="Email (unique → 409)" htmlFor="f-email" error={fieldErrors.email}>
                        <input id="f-email" type="email" className="field-input" value={form.email} onChange={set('email')} placeholder="zara@example.com" />
                      </Field>
                    </>
                  )}
                  <div className="md:col-span-2">
                    <Field label="X-API-Key" htmlFor="f-key" hint="POST requires the write key. Try the read-only key to watch a 403 happen.">
                      <input id="f-key" className="field-input font-mono text-sm" value={apiKey} onChange={(e) => setApiKey(e.target.value)} spellCheck={false} />
                    </Field>
                  </div>
                </div>
                <button type="submit" className="btn-primary mt-5" disabled={submitting}>
                  <Plus size={16} aria-hidden="true" /> {submitting ? 'Creating…' : `Create ${tab === 'courses' ? 'course' : 'learner'}`}
                </button>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search / filter */}
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-52 flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--faint)]" aria-hidden="true" />
          <input
            className="field-input !pl-10"
            placeholder={`Search ${tab}…`}
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            aria-label={`Search ${tab}`}
          />
        </div>
        {tab === 'courses' && (
          <select className="field-input !w-auto" value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }} aria-label="Filter by level">
            <option value="">All levels</option>
            <option value="beginner">beginner</option>
            <option value="intermediate">intermediate</option>
            <option value="advanced">advanced</option>
          </select>
        )}
        <select className="field-input !w-auto" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} aria-label="Page size">
          <option value={5}>5 / page</option>
          <option value={10}>10 / page</option>
          <option value={25}>25 / page</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <GlassCard elevation={1} className="p-10 text-center text-[var(--muted)]">
          Nothing here. Try a different search — or create the first one.
        </GlassCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item)}
              className="glass glass-1 specular p-5 text-left transition-transform active:scale-[0.98]"
              style={{ viewTransitionName: `res-card-${item.id}` }}
            >
              {isCourse(item) ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="display font-semibold">{item.title}</h3>
                    <span
                      className="shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[11px]"
                      style={{ color: 'var(--pulse)', borderColor: 'color-mix(in oklch, var(--pulse) 40%, transparent)' }}
                    >
                      {item.level}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm text-[var(--muted)]">{item.description ?? 'No description.'}</p>
                  <p className="mt-3 font-mono text-xs text-[var(--faint)]">
                    {item.seats} seats · starts {item.startDate}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="display font-semibold">{item.name}</h3>
                  <p className="mt-1 font-mono text-sm text-[var(--muted)]">{item.email}</p>
                  <p className="mt-3 font-mono text-xs text-[var(--faint)]">
                    joined {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between">
        <p className="font-mono text-xs text-[var(--muted)]" aria-live="polite">
          {meta.total} total · page {meta.page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost !px-4" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn-ghost !px-4"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Detail drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/55"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              aria-hidden="true"
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={isCourse(selected) ? selected.title : selected.name}
              className="fixed right-0 top-0 z-[61] h-full w-full max-w-md"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={SPRING}
            >
              <div
                className="glass glass-3 flex h-full flex-col overflow-y-auto p-6 md:p-8"
                style={{ viewTransitionName: `res-card-${selected.id}`, borderRadius: 0 }}
              >
                <button
                  type="button"
                  className="btn-ghost ml-auto !px-3 !py-2"
                  onClick={() => setSelected(null)}
                  aria-label="Close details"
                >
                  <X size={16} aria-hidden="true" />
                </button>
                {isCourse(selected) ? (
                  <>
                    <span className="mt-2 inline-block w-fit rounded-full border px-3 py-1 font-mono text-xs" style={{ color: 'var(--pulse)', borderColor: 'color-mix(in oklch, var(--pulse) 40%, transparent)' }}>
                      {selected.level}
                    </span>
                    <h2 className="display mt-3 text-3xl font-bold">{selected.title}</h2>
                    <p className="mt-3 text-[var(--muted)]">{selected.description ?? 'No description.'}</p>
                    <dl className="mt-6 space-y-3 font-mono text-sm">
                      <div className="flex justify-between"><dt className="text-[var(--faint)]">seats</dt><dd>{selected.seats}</dd></div>
                      <div className="flex justify-between"><dt className="text-[var(--faint)]">startDate</dt><dd>{selected.startDate}</dd></div>
                      <div className="flex justify-between"><dt className="text-[var(--faint)]">id</dt><dd className="break-all text-right text-xs">{selected.id}</dd></div>
                      <div className="flex justify-between"><dt className="text-[var(--faint)]">createdAt</dt><dd className="text-xs">{selected.createdAt}</dd></div>
                    </dl>
                  </>
                ) : (
                  <>
                    <h2 className="display mt-2 text-3xl font-bold">{selected.name}</h2>
                    <p className="mt-2 font-mono text-[var(--muted)]">{selected.email}</p>
                    <dl className="mt-6 space-y-3 font-mono text-sm">
                      <div className="flex justify-between"><dt className="text-[var(--faint)]">id</dt><dd className="break-all text-right text-xs">{selected.id}</dd></div>
                      <div className="flex justify-between"><dt className="text-[var(--faint)]">createdAt</dt><dd className="text-xs">{selected.createdAt}</dd></div>
                    </dl>
                  </>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
