import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchLiveStorm, stormFromSwpc, SWPC_FLARES_URL } from '../src/cadet/engine.ts';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Simula la red: cada URL que empieza con una clave responde con lo indicado. */
function mockFetch(routes: Record<string, () => Response | Promise<Response>>) {
  const calls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    for (const [prefix, reply] of Object.entries(routes)) if (url.startsWith(prefix)) return reply();
    throw new TypeError('network down');
  }) as typeof fetch;
  return calls;
}

describe('Cadet live storm: NOAA SWPC fallback', () => {
  it('stormFromSwpc picks the strongest flare and marks the source', () => {
    const s = stormFromSwpc([
      { max_class: 'B7.3', max_time: '2026-10-30T13:22:00Z' },
      { max_class: 'M1.4', max_time: '2026-11-02T08:01:00Z' },
      { max_class: 'C9.9', max_time: '2026-11-01T00:00:00Z' },
      { max_class: 'garbage' },
      {},
    ])!;
    assert.equal(s.classType, 'M1.4');
    assert.equal(s.date, '2026-11-02');
    assert.equal(s.live, true);
    assert.equal(s.liveSource, 'swpc');
    assert.ok(!s.story.es.includes('tranquilo'));
  });

  it('says the Sun was calm when only small flares happened', () => {
    const s = stormFromSwpc([{ max_class: 'C2.0', max_time: '2026-11-03T00:00:00Z' }])!;
    assert.ok(s.story.es.includes('tranquilo'));
    assert.ok(s.story.en.includes('calm'));
  });

  it('returns undefined for empty or broken data', () => {
    assert.equal(stormFromSwpc([]), undefined);
    assert.equal(stormFromSwpc([{ max_class: '??' }]), undefined);
  });

  it('uses DONKI first when it answers', async () => {
    const calls = mockFetch({
      'https://api.nasa.gov/DONKI/FLR': () => json([{ classType: 'X1.1', peakTime: '2026-10-20T00:00Z', flrID: 'd1' }]),
      [SWPC_FLARES_URL]: () => json([{ max_class: 'X9.9', max_time: '2026-11-01T00:00Z' }]),
    });
    const s = await fetchLiveStorm(500);
    assert.equal(s?.classType, 'X1.1');
    assert.notEqual(s?.liveSource, 'swpc');
    assert.equal(calls.length, 1);
  });

  it('falls back to SWPC when DONKI returns 503', async () => {
    mockFetch({
      'https://api.nasa.gov/DONKI/FLR': () => json({ error: 'down' }, 503),
      [SWPC_FLARES_URL]: () => json([{ max_class: 'M3.0', max_time: '2026-11-01T00:00Z' }]),
    });
    const s = await fetchLiveStorm(500);
    assert.equal(s?.classType, 'M3.0');
    assert.equal(s?.liveSource, 'swpc');
  });

  it('falls back to SWPC when DONKI answers with no flares', async () => {
    mockFetch({
      'https://api.nasa.gov/DONKI/FLR': () => json([]),
      [SWPC_FLARES_URL]: () => json([{ max_class: 'C1.0', max_time: '2026-11-01T00:00Z' }]),
    });
    assert.equal((await fetchLiveStorm(500))?.liveSource, 'swpc');
  });

  it('returns undefined when both sources are down', async () => {
    mockFetch({});
    assert.equal(await fetchLiveStorm(500), undefined);
  });

  it('gives up on a source that hangs past the timeout', async () => {
    mockFetch({
      'https://api.nasa.gov/DONKI/FLR': () => new Promise<Response>(() => {}),
      [SWPC_FLARES_URL]: () => json([{ max_class: 'M2.0', max_time: '2026-11-01T00:00Z' }]),
    });
    globalThis.fetch = ((orig => (input: RequestInfo | URL, init?: RequestInit) =>
      String(input).startsWith('https://api.nasa.gov')
        ? new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))))
        : orig(input, init))(globalThis.fetch)) as typeof fetch;
    const t0 = Date.now();
    const s = await fetchLiveStorm(200);
    assert.equal(s?.liveSource, 'swpc');
    assert.ok(Date.now() - t0 < 2000);
  });
});
