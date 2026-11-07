import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LIVE_KEY, LIVE_TTL_MS, readCachedLive, writeCachedLive } from '../src/cadet/storage.ts';
import type { SolarStorm } from '../src/cadet/data.ts';

const memStore = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), clear: () => m.clear() };
};
const storm: SolarStorm = { id: 'x', classType: 'M3.5', date: '2026-11-05', live: true, liveSource: 'swpc', story: { es: 'a', en: 'b' } };
const g = globalThis as unknown as { localStorage?: unknown; sessionStorage?: unknown };

describe('Cadet live-storm cache (protects the DEMO_KEY quota in classrooms)', () => {
  beforeEach(() => { g.localStorage = memStore(); g.sessionStorage = memStore(); });
  afterEach(() => { delete g.localStorage; delete g.sessionStorage; });

  it('reuses a live flare for 3 hours and then asks again', () => {
    const t0 = 1_000_000;
    writeCachedLive(storm, t0);
    assert.equal(readCachedLive(t0 + 60_000)?.storm?.classType, 'M3.5');
    assert.equal(readCachedLive(t0 + LIVE_TTL_MS - 1)?.status, 'ok');
    assert.equal(readCachedLive(t0 + LIVE_TTL_MS + 1), null);
  });

  it('still reads the old session format, and ignores junk', () => {
    (g.sessionStorage as Storage).setItem(LIVE_KEY, JSON.stringify(storm));
    assert.equal(readCachedLive()?.storm?.id, 'x');
    for (const junk of ['{', 'null', '{"savedAt":5}', '{"storm":{},"savedAt":5}']) {
      (g.localStorage as Storage).setItem(LIVE_KEY, junk);
      assert.equal(readCachedLive(6), null, junk);
    }
  });

  it('works (returns null) when storage is blocked', () => {
    delete g.localStorage; delete g.sessionStorage;
    assert.equal(readCachedLive(), null);
    assert.doesNotThrow(() => writeCachedLive(storm));
  });
});
