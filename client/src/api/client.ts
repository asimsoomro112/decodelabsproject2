/**
 * The single fetch wrapper for the whole console.
 * Every request is timed, and every completion fires an `api:request`
 * CustomEvent { status, latency } that the nerve canvas listens to —
 * real traffic, rendered as light.
 */

export interface ApiRequestDetail {
  status: number; // 0 = network failure
  latency: number; // ms
}

export interface ApiInit extends RequestInit {
  json?: unknown;
}

export interface ApiResult<T = unknown> {
  status: number;
  ok: boolean;
  headers: Headers;
  data: T;
  latencyMs: number;
  sizeBytes: number;
}

function fire(status: number, started: number): void {
  const latency = performance.now() - started;
  window.dispatchEvent(
    new CustomEvent<ApiRequestDetail>('api:request', { detail: { status, latency } }),
  );
}

export async function apiFetch<T = unknown>(path: string, init: ApiInit = {}): Promise<ApiResult<T>> {
  const started = performance.now();
  const { json, ...rest } = init;
  const headers = new Headers(rest.headers);
  let body: BodyInit | undefined = rest.body as BodyInit | undefined;
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }

  try {
    const res = await fetch(path, { ...rest, headers, body });
    const text = await res.text();
    const latencyMs = performance.now() - started;
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    fire(res.status, started);
    return {
      status: res.status,
      ok: res.ok,
      headers: res.headers,
      data: data as T,
      latencyMs,
      sizeBytes: new TextEncoder().encode(text).length,
    };
  } catch (err) {
    fire(0, started);
    throw err;
  }
}

// Demo keys are public by design — the API is a teaching demo.
export const DEMO_WRITE_KEY = 'neuro_write_demo_9f2k7q';
export const DEMO_READ_KEY = 'neuro_read_demo_3m8x1z';

export function formatLatency(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

export function formatBytes(n: number): string {
  return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`;
}
