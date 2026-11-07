import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { bridgeStorm, bridgeSun, validStorm, validSun } from '../src/cadet/bridge.ts';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });
const json = (b: unknown, s = 200, ct = 'application/json; charset=utf-8') => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': ct } });
const goodStorm = { id: 'swpc-M3.5', classType: 'M3.5', date: '2026-11-05', live: true, liveSource: 'swpc', story: { es: 'hola', en: 'hi' } };

describe('Cadet bridge client (treats our own API as untrusted data)', () => {
  it('accepts a well-formed storm and keeps only known fields', () => {
    const s = validStorm({ ...goodStorm, extra: '<script>', story: { es: 'a', en: 'b', html: 'x' } })!;
    assert.deepEqual(Object.keys(s).sort(), ['classType', 'date', 'id', 'live', 'liveSource', 'story']);
    assert.deepEqual(Object.keys(s.story).sort(), ['en', 'es']);
  });

  it('rejects malformed or hostile storms', () => {
    for (const bad of [null, 5, 'x', {}, { ...goodStorm, classType: 'Z9' }, { ...goodStorm, classType: 'X1.0<img>' }, { ...goodStorm, story: { es: 'a'.repeat(5000), en: 'b' } }, { ...goodStorm, liveSource: 'evil' }, { ...goodStorm, date: 1 }]) {
      assert.equal(validStorm(bad), null, JSON.stringify(bad)?.slice(0, 60));
    }
  });

  it('rejects malformed sun data', () => {
    const ok = { points: [{ t: 1, flux: 1e-6 }, { t: 2, flux: 2e-6 }], current: 'C1.0', peak: 'C2.0', peakTime: 2, mood: 'calm', satellite: 18 };
    assert.ok(validSun(ok));
    for (const bad of [{ ...ok, points: [] }, { ...ok, points: [{ t: 'x', flux: 1 }, { t: 2, flux: 1 }] }, { ...ok, mood: 'evil' }, { ...ok, points: Array(500).fill({ t: 1, flux: 1 }) }]) assert.equal(validSun(bad), null);
  });

  it('reports "not available" when the API is missing (local dev returns HTML) or errors', async () => {
    globalThis.fetch = (async () => new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } })) as typeof fetch;
    assert.deepEqual(await bridgeStorm(500), { ok: false });
    globalThis.fetch = (async () => json({}, 500)) as typeof fetch;
    assert.deepEqual(await bridgeSun(500), { ok: false });
    globalThis.fetch = (async () => { throw new TypeError('offline'); }) as typeof fetch;
    assert.deepEqual(await bridgeStorm(500), { ok: false });
  });

  it('uses the bridge answer, including "no flare available"', async () => {
    globalThis.fetch = (async () => json({ storm: goodStorm })) as typeof fetch;
    const a = await bridgeStorm(500);
    assert.ok(a.ok && a.storm?.classType === 'M3.5');
    globalThis.fetch = (async () => json({ storm: null })) as typeof fetch;
    assert.deepEqual(await bridgeStorm(500), { ok: true, storm: null });
  });
});
