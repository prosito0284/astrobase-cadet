import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeck,
  choose,
  createGame,
  currentCard,
  energyFactor,
  flarePower,
  medal,
  previewStormDamage,
  stormDamage,
  stormFromDonki,
  STORM_DAYS,
  TOTAL_DAYS,
} from '../src/cadet/engine.ts';
import type { CadetState } from '../src/cadet/engine.ts';
import { DECISION_CARDS, REAL_STORMS } from '../src/cadet/data.ts';

const play = (s: CadetState, pick: (s: CadetState) => 0 | 1): CadetState => {
  while (s.status === 'playing') s = choose(s, pick(s));
  return s;
};

test('Cadete: el mazo tiene 10 días, tormentas en los días 1, 4, 7 y 10, sin tarjetas repetidas', () => {
  for (const site of ['moon', 'mars'] as const) {
    for (let seed = 1; seed <= 20; seed++) {
      const deck = buildDeck(site, seed);
      assert.equal(deck.length, TOTAL_DAYS);
      deck.forEach((e, i) => assert.equal(e.kind === 'storm', STORM_DAYS.includes(i + 1)));
      const ids = deck.flatMap(e => (e.kind === 'card' ? [e.cardId] : []));
      assert.equal(new Set(ids).size, ids.length);
      for (const id of ids) {
        assert.ok(DECISION_CARDS.find(c => c.id === id)!.sites.includes(site), `${id} no es de ${site}`);
      }
    }
  }
});

test('Cadete: misma semilla = misma partida; semillas distintas cambian el orden (rejugable)', () => {
  assert.deepEqual(buildDeck('moon', 7), buildDeck('moon', 7));
  const orders = new Set(Array.from({ length: 10 }, (_, i) => JSON.stringify(buildDeck('moon', i + 1))));
  assert.ok(orders.size > 5);
});

test('Cadete: una llamarada en vivo de DONKI es la primera tormenta', () => {
  const live = stormFromDonki([{ classType: 'M5.1', peakTime: '2026-10-30T10:00Z', flrID: 'live-1' }])!;
  const deck = buildDeck('mars', 3, live);
  assert.equal(deck[0].kind, 'storm');
  assert.equal(deck[0].kind === 'storm' && deck[0].storm.live, true);
});

test('Cadete: ninguna opción es gratis (cuesta algo o renuncia a un descubrimiento)', () => {
  for (const card of DECISION_CARDS) {
    for (const site of card.sites) {
      const effs = card.options.map(o => ({ ...o.effects, ...(o.effectsBySite?.[site] ?? {}) }));
      effs.forEach((e, i) => {
        const hasCost = Object.entries(e).some(([k, v]) => k !== 'stars' && (v as number) < 0);
        const other = effs[1 - i];
        const givesUpDiscovery = (other.stars ?? 0) > (e.stars ?? 0);
        assert.ok(hasCost || givesUpDiscovery, `${card.id}/${site} opción ${i} es gratis`);
      });
    }
  }
});

test('Cadete: subir el escudo reduce el daño de la tormenta y la vista previa coincide', () => {
  const g = createGame('moon', 1);
  assert.equal(currentCard(g).storm !== undefined, true);
  const dmgShield = previewStormDamage(g, 0)!;
  const dmgNone = previewStormDamage(g, 1)!;
  assert.ok(dmgShield < dmgNone);

  const a = choose(g, 0);
  const b = choose(g, 1);
  assert.ok(a.health > b.health);
  assert.ok(a.energy < b.energy, 'el escudo debe costar energía');
  const line = a.lastReport!.lines.find(l => l.icon === '🛡️' || l.icon === '☢️')!;
  assert.ok(line.text.es.includes(`−${dmgShield}`));
});

test('Cadete: no se puede gastar energía que no hay (la acción rinde a medias)', () => {
  assert.equal(energyFactor(15, { energy: -30 }), 0.5);
  assert.equal(energyFactor(50, { energy: -30 }), 1);
  assert.equal(energyFactor(0, { air: 5 }), 1);

  const full = createGame('moon', 1);
  const low: CadetState = { ...full, energy: 15 };
  const a = choose(full, 0);
  const b = choose(low, 0);
  assert.ok(b.shield < a.shield);
  assert.ok(b.lastReport!.lines.some(l => l.icon === '🪫'));
});

test('Cadete: esperar a Houston cuesta mucho más aire en Marte que en la Luna (retraso de la luz)', () => {
  const card = DECISION_CARDS.find(c => c.id === 'air_alarm')!;
  const moon = { ...card.options[0].effects, ...card.options[0].effectsBySite!.moon };
  const mars = { ...card.options[0].effects, ...card.options[0].effectsBySite!.mars };
  assert.ok((mars.air ?? 0) < (moon.air ?? 0));
});

test('Cadete: la fuerza de la tormenta sigue la clase real de la llamarada', () => {
  assert.ok(flarePower('X9.3') > flarePower('X1.8'));
  assert.ok(flarePower('X1.0') > flarePower('M9.9'));
  assert.ok(flarePower('M5.0') > flarePower('C3.0'));
  assert.equal(stormDamage(40, 100), 0);
  assert.equal(stormDamage(40, 0), 40);
  for (const s of REAL_STORMS) assert.ok(flarePower(s.classType) >= 10);
});

test('Cadete: stormFromDonki elige la más fuerte e ignora datos rotos', () => {
  const s = stormFromDonki([
    { classType: 'M2.1', peakTime: '2026-10-01T00:00Z' },
    { classType: 'X1.2', peakTime: '2026-10-20T05:00Z', flrID: 'a' },
    { classType: 'nope' },
    {},
  ])!;
  assert.equal(s.classType, 'X1.2');
  assert.equal(s.date, '2026-10-20');
  assert.equal(s.live, true);
  assert.equal(stormFromDonki([]), undefined);
  assert.equal(stormFromDonki([{ classType: '??' }]), undefined);
});

test('Cadete: cada día explica la radiación en mSv y radiografías', () => {
  const s = choose(createGame('mars', 2), 0);
  assert.ok(s.lastReport!.lines.some(l => /mSv/.test(l.text.es) && /radiografías/.test(l.text.es)));
  assert.ok(s.doseMSv > 0);
});

test('Cadete: se gana al terminar el día 10; se pierde si el aire llega a 0', () => {
  const won = play(createGame('moon', 1), () => 0);
  assert.equal(won.status, 'won');
  assert.ok(medal(won) >= 1);

  const g = createGame('moon', 1);
  const noAir = choose({ ...g, air: 3 }, 1);
  assert.equal(noAir.status, 'lost');
  assert.equal(noAir.lostReason, 'air');
});

test('Cadete: ignorar todas las tormentas siempre termina mal', () => {
  for (const site of ['moon', 'mars'] as const) {
    for (let seed = 1; seed <= 25; seed++) {
      const end = play(createGame(site, seed), () => 1);
      assert.equal(end.status, 'lost');
    }
  }
});

test('Cadete: siempre existe una forma de ganar (juego perfecto, búsqueda completa)', () => {
  const canWin = (s: CadetState): boolean =>
    s.status === 'won' || (s.status === 'playing' && (canWin(choose(s, 0)) || canWin(choose(s, 1))));
  for (const site of ['moon', 'mars'] as const) {
    for (let seed = 1; seed <= 15; seed++) assert.ok(canWin(createGame(site, seed)), `${site} semilla ${seed}`);
  }
});

test('Cadete: el pronóstico diario coincide con lo que de verdad pasa cada día', async () => {
  const { dailyRoutine, LEVELS } = await import('../src/cadet/engine.ts');
  const { SITE_INFO } = await import('../src/cadet/data.ts');
  for (const site of ['moon', 'mars'] as const) {
    for (const level of ['easy', 'normal'] as const) {
      const g = createGame(site, 3, undefined, level);
      const r = dailyRoutine(g);
      assert.equal(r.air, -LEVELS[level].airUse);
      assert.equal(r.energy, SITE_INFO[site].solarGain - 15);
      // El reporte del día dice exactamente esos números.
      const report = choose(g, 0).lastReport!;
      assert.ok(report.lines.some(l => l.text.es.includes(`−${-r.air} de aire`)));
      assert.ok(report.lines.some(l => l.text.es.includes(`+${r.solar}`) && l.text.es.includes(`−${r.machines}`)));
    }
  }
});

test('Cadete: el historial guarda la radiación, la salud y el escudo de cada día', () => {
  let s = createGame('moon', 21);
  let total = 0;
  while (s.status === 'playing') {
    s = choose(s, 0);
    const h = s.history[s.history.length - 1];
    assert.equal(h.doseMSv, s.lastReport!.doseTodayMSv);
    assert.equal(h.health, s.health);
    assert.equal(h.storm, STORM_DAYS.includes(h.day));
    assert.ok(typeof h.shield === 'number' && h.shield >= 0 && h.shield <= 100);
    total += h.doseMSv!;
  }
  assert.ok(Math.abs(total - s.doseMSv) < 0.05, `${total} vs ${s.doseMSv}`);
});

test('Cadete: el daño de tormenta se redondea igual que a mano (sin errores de punto flotante)', () => {
  assert.equal(stormDamage(15, 90), 2);   // 15 × 10 / 100 = 1.5 → 2
  assert.equal(stormDamage(25, 90), 3);   // 2.5 → 3
  assert.equal(stormDamage(45, 0), 45);
  assert.equal(stormDamage(45, 100), 0);
});
