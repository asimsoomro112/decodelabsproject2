import { Router, type Request, type Response } from 'express';
import { PROBLEM_CATALOG } from '../errors/problems.ts';
import { sendProblem } from '../errors/problems.ts';

/** GET /problems/:slug — a small human-readable page for every problem type. */
export const problemsRouter = Router();

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

problemsRouter.get('/:slug', (req: Request, res: Response): void => {
  const rawSlug = req.params.slug;
  const slug = typeof rawSlug === 'string' ? rawSlug : '';
  const page = PROBLEM_CATALOG[slug];
  if (!page) {
    sendProblem(res, req, {
      status: 404,
      type: '/problems/not-found',
      title: 'Not Found',
      detail: `No problem page exists for slug "${slug}".`,
    });
    return;
  }

  res
    .status(page.status)
    .type('text/html')
    .send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${page.status} ${escapeHtml(page.title)} — NeuroAPI Problems</title>
<style>
  body { font-family: ui-sans-serif, system-ui, sans-serif; background: #050816; color: #e8ecf8; margin: 0; padding: 48px 20px; }
  main { max-width: 640px; margin: 0 auto; border: 1px solid rgba(255,255,255,.14); border-radius: 24px; padding: 32px; background: rgba(255,255,255,.04); }
  .code { display: inline-block; font-family: ui-monospace, monospace; background: rgba(34,211,238,.12); color: #22d3ee; border-radius: 999px; padding: 4px 14px; font-size: 14px; }
  h1 { font-size: 28px; margin: 16px 0 8px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .08em; color: #8b93b0; margin: 24px 0 6px; }
  p { line-height: 1.6; color: #b9c0d8; margin: 0; }
  a { color: #22d3ee; }
  pre { background: #0a0f24; border-radius: 12px; padding: 16px; overflow: auto; font-size: 13px; }
</style>
</head>
<body>
<main>
  <span class="code">${page.status} · /problems/${escapeHtml(page.slug)}</span>
  <h1>${escapeHtml(page.title)}</h1>
  <h2>What it means</h2><p>${escapeHtml(page.meaning)}</p>
  <h2>When you see it</h2><p>${escapeHtml(page.when)}</p>
  <h2>How to fix it</h2><p>${escapeHtml(page.fix)}</p>
  <h2>Machine-readable form</h2>
  <pre>{
  "type": "/problems/${escapeHtml(page.slug)}",
  "title": "${escapeHtml(page.title)}",
  "status": ${page.status},
  "detail": "…",
  "instance": "/api/v1/…",
  "requestId": "…"
}</pre>
  <p style="margin-top:24px"><a href="/reference">← Back to the API reference</a></p>
</main>
</body>
</html>`);
});
