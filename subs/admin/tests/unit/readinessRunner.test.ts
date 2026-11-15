import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { CONCURRENCY, createGetOnlyFetch, runReadiness } from '../../src/lib/readinessRunner';
import { VALIDATION_SUBS } from '../../src/config/validationRegistry';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const mk = (fetchImpl: typeof fetch, paths = ['/a', '/b']) =>
  createGetOnlyFetch({ baseUrl: 'https://api.test', headers: () => ({ Authorization: 'Bearer x' }), allowedPaths: new Set(paths), fetchImpl });
const sub = (id: string, ...checks: [string, boolean][]) => ({ id, readChecks: checks.map(([path, required]) => ({ label: path, path, required })) });

describe('createGetOnlyFetch', () => {
  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'post'])('blocks %s before any network call', async (method) => {
    const f = vi.fn();
    await expect(mk(f as unknown as typeof fetch)('/a', { method })).rejects.toThrow(/non-GET blocked/);
    expect(f).not.toHaveBeenCalled();
  });

  it('rejects off-allowlist paths without fetching', async () => {
    const f = vi.fn();
    await expect(mk(f as unknown as typeof fetch)('/nope')).rejects.toThrow(/not allowed/);
    expect(f).not.toHaveBeenCalled();
  });

  it('always sends a fixed GET with no body', async () => {
    const f = vi.fn().mockResolvedValue(json({}));
    await mk(f as unknown as typeof fetch)('/a', { method: 'get', body: 'x' } as never);
    const init = f.mock.calls[0][1];
    expect(init.method).toBe('GET');
    expect(init).not.toHaveProperty('body');
  });

  it('keeps a single network call and no write verbs in the runner source', () => {
    const src = readFileSync(new URL('../../src/lib/readinessRunner.ts', import.meta.url), 'utf8');
    expect(src.match(/doFetch\(/g)).toHaveLength(1);
    expect(src).not.toMatch(/method:\s*['"](POST|PUT|PATCH|DELETE)/);
  });
});

describe('runReadiness', () => {
  it('passes when everything is 200 JSON', async () => {
    const r = await runReadiness([sub('s', ['/a', true], ['/b', false])], mk((async () => json({ ok: 1 })) as typeof fetch));
    expect(r.verdict).toBe('Ready');
    expect(r.counts.passed).toBe(2);
  });

  it('maps required failures to fail and optional ones to warn', async () => {
    const f = (async (url: string) => (url.endsWith('/a') ? json({}, 500) : json({}, 404))) as unknown as typeof fetch;
    const r = await runReadiness([sub('s', ['/a', true], ['/b', false])], mk(f));
    expect(r.verdict).toBe('Not ready');
    expect(r.subs[0].routes.map((x) => x.outcome)).toEqual(['fail', 'warn']);
    const w = await runReadiness([sub('s', ['/b', false])], mk(f));
    expect(w.verdict).toBe('Ready with warnings');
  });

  it('fails a 200 that is not a JSON object', async () => {
    const r = await runReadiness([sub('s', ['/a', true])], mk((async () => new Response('<html>')) as typeof fetch));
    expect(r.verdict).toBe('Not ready');
    expect(r.subs[0].routes[0].hint).toBe('bad response');
  });

  it('aborts on 401, skips the rest and reports Session expired', async () => {
    const f = vi.fn(async () => json({}, 401));
    const paths = Array.from({ length: 10 }, (_, i) => `/p${i}`);
    const r = await runReadiness([sub('s', ...paths.map((p): [string, boolean] => [p, true]))], mk(f as unknown as typeof fetch, paths));
    expect(r.verdict).toBe('Session expired');
    expect(f.mock.calls.length).toBeLessThanOrEqual(CONCURRENCY);
    expect(r.counts.skipped).toBeGreaterThan(0);
  });

  it('flags an environment mismatch when every route is 403', async () => {
    const r = await runReadiness([sub('s', ['/a', true], ['/b', true])], mk((async () => json({}, 403)) as typeof fetch));
    expect(r.environmentMismatch).toBe(true);
    expect(r.verdict).toBe('Not ready');
  });

  it('never exceeds the concurrency cap', async () => {
    let inflight = 0;
    let max = 0;
    const f = (async () => {
      max = Math.max(max, ++inflight);
      await new Promise((r) => setTimeout(r, 5));
      inflight--;
      return json({});
    }) as unknown as typeof fetch;
    const paths = Array.from({ length: 12 }, (_, i) => `/p${i}`);
    await runReadiness([sub('s', ...paths.map((p): [string, boolean] => [p, true]))], mk(f, paths));
    expect(max).toBeLessThanOrEqual(CONCURRENCY);
  });

  it('never leaks response data into results', async () => {
    const f = (async (url: string) => (url.endsWith('/a') ? json({ secret: 'SECRET-123' }) : json({ error: 'SECRET-123' }, 500))) as unknown as typeof fetch;
    const r = await runReadiness([sub('s', ['/a', true], ['/b', true])], mk(f));
    expect(JSON.stringify(r)).not.toContain('SECRET-123');
  });
});

describe('registry readChecks', () => {
  it('are static GET list paths with no id templates', () => {
    for (const s of VALIDATION_SUBS) {
      expect(s.readChecks.length).toBeGreaterThan(0);
      for (const c of s.readChecks) expect(c.path).toMatch(/^\/[a-z-/]+(\?[a-z=]+)?$/);
    }
  });
});
