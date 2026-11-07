import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { donkiShouldBackOff, fetchLiveStorm, SWPC_FLARES_URL } from '../src/cadet/engine.ts';
import { DONKI_BACKOFF_MS, donkiBackedOff, setDonkiBackoff } from '../src/cadet/storage.ts';
import { pickVoice } from '../src/cadet/speech.ts';

const realFetch = globalThis.fetch;
const g = globalThis as unknown as { localStorage?: unknown };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });

describe('Cadet: DONKI back-off (quota-friendly)', () => {
  beforeEach(() => {
    const m = new Map<string, string>();
    g.localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
  });
  afterEach(() => { globalThis.fetch = realFetch; delete g.localStorage; });

  it('backs off on 429 and server errors, not on success or no-network', () => {
    assert.equal(donkiShouldBackOff(429), true);
    assert.equal(donkiShouldBackOff(503), true);
    assert.equal(donkiShouldBackOff(200), false);
    assert.equal(donkiShouldBackOff(0), false);
    assert.equal(donkiShouldBackOff(404), false);
  });

  it('remembers the back-off for 1 hour', () => {
    setDonkiBackoff(1000);
    assert.equal(donkiBackedOff(1000 + 60_000), true);
    assert.equal(donkiBackedOff(1000 + DONKI_BACKOFF_MS + 1), false);
  });

  it('reports DONKI status and skips it when asked (goes straight to NOAA)', async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (u: RequestInfo | URL) => {
      calls.push(String(u));
      if (String(u).startsWith('https://api.nasa.gov')) return json({ error: 'rate' }, 429);
      if (String(u) === SWPC_FLARES_URL) return json([{ max_class: 'M1.0', max_time: '2026-11-01T00:00Z' }]);
      throw new TypeError('x');
    }) as typeof fetch;
    let seen = -1;
    const a = await fetchLiveStorm(500, 'DEMO_KEY', { onDonkiStatus: s => { seen = s; } });
    assert.equal(seen, 429);
    assert.equal(a?.liveSource, 'swpc');
    calls.length = 0;
    const b = await fetchLiveStorm(500, 'DEMO_KEY', { skipDonki: true });
    assert.equal(b?.liveSource, 'swpc');
    assert.ok(calls.every(u => !u.includes('api.nasa.gov')), 'no DONKI call');
  });

  it('passes the custom NASA API key', async () => {
    let url = '';
    globalThis.fetch = (async (u: RequestInfo | URL) => { if (!url) url = String(u); return json([]); }) as typeof fetch;
    await fetchLiveStorm(500, 'MY KEY&x');
    assert.ok(url.includes('api_key=MY%20KEY%26x'), url);
  });
});

describe('Cadet: voice picking for read-aloud', () => {
  const v = (lang: string, name = lang, localService = false) => ({ lang, name, localService });
  it('prefers Latin American Spanish, then any Spanish', () => {
    assert.equal(pickVoice([v('en-US'), v('es-ES'), v('es-MX')], 'es')?.lang, 'es-MX');
    assert.equal(pickVoice([v('en-US'), v('es-ES')], 'es')?.lang, 'es-ES');
    assert.equal(pickVoice([v('en-US'), v('es_US')], 'es')?.lang, 'es_US');
    assert.equal(pickVoice([v('en-US')], 'es'), undefined);
  });
  it('prefers a local (offline) voice among equals, and works for English', () => {
    assert.equal(pickVoice([v('es-MX', 'online'), v('es-MX', 'local', true)], 'es')?.name, 'local');
    assert.equal(pickVoice([v('fr-FR'), v('en-GB')], 'en')?.lang, 'en-GB');
  });
});
