import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CACHE_FAIL, CACHE_STORM_OK, CACHE_SUN_OK, liveStormHandler, nasaKey, sunNowHandler } from '../api/_proxy.ts';
import type { Req, Res } from '../api/_proxy.ts';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

function fakeRes() {
  const r = { code: 0, headers: {} as Record<string, string>, body: '' };
  const res: Res = {
    status(c) { r.code = c; return res; },
    setHeader(k, v) { r.headers[k.toLowerCase()] = v; },
    end(b) { r.body = b ?? ''; },
  };
  return { res, r };
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s });

describe('API bridge to NASA/NOAA (security)', () => {
  it('only accepts GET/HEAD', async () => {
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
      const { res, r } = fakeRes();
      await liveStormHandler({ method } as Req, res, {});
      assert.equal(r.code, 405, method);
      assert.equal(r.headers['allow'], 'GET, HEAD');
    }
  });

  it('only ever contacts the fixed NASA/NOAA hosts, whatever the request contains (no SSRF)', async () => {
    const hosts = new Set<string>();
    globalThis.fetch = (async (u: RequestInfo | URL) => { hosts.add(new URL(String(u)).host); return json([]); }) as typeof fetch;
    const evil = { method: 'GET', url: '/api/live-storm?url=http://169.254.169.254/', query: { url: 'http://evil.example' }, headers: { host: 'evil.example' } } as unknown as Req;
    await liveStormHandler(evil, fakeRes().res, {});
    await sunNowHandler(evil, fakeRes().res);
    assert.deepEqual([...hosts].sort(), ['api.nasa.gov', 'services.swpc.noaa.gov']);
  });

  it('uses the secret NASA key only if it looks valid, and never returns it', async () => {
    assert.equal(nasaKey({}), 'DEMO_KEY');
    assert.equal(nasaKey({ NASA_API_KEY: 'abc' }), 'DEMO_KEY');
    assert.equal(nasaKey({ NASA_API_KEY: 'x&evil=1' + 'a'.repeat(30) }), 'DEMO_KEY');
    const key = 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0';
    assert.equal(nasaKey({ NASA_API_KEY: key }), key);
    let used = '';
    globalThis.fetch = (async (u: RequestInfo | URL) => {
      if (String(u).includes('api.nasa.gov')) { used = String(u); return json([{ classType: 'X1.0', peakTime: '2026-11-01T00:00Z', flrID: 'f' }]); }
      return json([]);
    }) as typeof fetch;
    const { res, r } = fakeRes();
    await liveStormHandler({ method: 'GET' }, res, { NASA_API_KEY: key });
    assert.ok(used.includes(key));
    assert.ok(!r.body.includes(key), 'key must not leak in the response');
    const body = JSON.parse(r.body);
    assert.deepEqual(Object.keys(body.storm).sort(), ['classType', 'date', 'id', 'live', 'liveSource', 'story'].filter(k => k !== 'liveSource' || body.storm.liveSource !== undefined).sort());
    assert.equal(r.headers['cache-control'], CACHE_STORM_OK);
    assert.equal(r.headers['content-type'], 'application/json; charset=utf-8');
  });

  it('falls back to NOAA, and on total failure answers null with a short cache (no internal details)', async () => {
    globalThis.fetch = (async (u: RequestInfo | URL) => (String(u).includes('nasa') ? json({ e: 1 }, 429) : json([{ max_class: 'M2.0', max_time: '2026-11-01T00:00Z' }]))) as typeof fetch;
    let { res, r } = fakeRes();
    await liveStormHandler({ method: 'GET' }, res, {});
    assert.equal(JSON.parse(r.body).storm.liveSource, 'swpc');

    globalThis.fetch = (async () => { throw new Error('secret internal path /var/task/x'); }) as typeof fetch;
    ({ res, r } = fakeRes());
    await liveStormHandler({ method: 'GET' }, res, {});
    assert.deepEqual(JSON.parse(r.body), { storm: null });
    assert.equal(r.headers['cache-control'], CACHE_FAIL);
    ({ res, r } = fakeRes());
    await sunNowHandler({ method: 'GET' }, res);
    assert.deepEqual(JSON.parse(r.body), { sun: null });
    assert.ok(!r.body.includes('/var/task'));
  });

  it('sun endpoint returns the small summary with a 15-minute shared cache', async () => {
    const rows = Array.from({ length: 200 }, (_, i) => ({ time_tag: new Date(Date.UTC(2026, 10, 5) + i * 60000).toISOString(), flux: 2e-6, energy: '0.1-0.8nm', satellite: 18 }));
    globalThis.fetch = (async () => json(rows)) as typeof fetch;
    const { res, r } = fakeRes();
    await sunNowHandler({ method: 'GET' }, res);
    const body = JSON.parse(r.body);
    assert.equal(body.sun.current, 'C2.0');
    assert.ok(body.sun.points.length <= 96);
    assert.equal(r.headers['cache-control'], CACHE_SUN_OK);
  });
});
