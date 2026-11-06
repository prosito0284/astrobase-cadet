import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { paperCards, paperFlares, paperRules, radiationShieldThreshold } from '../src/cadet/paper.ts';
import { choose, createGame, dailyDose, LEVELS, stormDamage, flarePower, SHIELD_UP } from '../src/cadet/engine.ts';
import { DECISION_CARDS, REAL_STORMS } from '../src/cadet/data.ts';

describe('Cadet paper mission (same rules as the game)', () => {
  it('the radiation threshold matches the engine', () => {
    const t = radiationShieldThreshold('moon');
    assert.ok(dailyDose('moon', t) < 1 && dailyDose('moon', t - 1) >= 1, `moon ${t}`);
    assert.equal(radiationShieldThreshold('mars'), 0); // en Marte la radiación de fondo siempre quita 1
  });

  it('printed starting values and costs come from the engine constants', () => {
    for (const level of ['easy', 'normal'] as const) {
      const r = paperRules('moon', level)[0].es;
      const st = LEVELS[level].start;
      for (const v of [st.air, st.energy, st.shield, st.health]) assert.ok(r.includes(String(v)), r);
    }
    const storm = paperRules('mars', 'normal')[2].es;
    assert.ok(storm.includes(`−${-SHIELD_UP.energy} energía`) && storm.includes(`+${SHIELD_UP.shield} escudo`), storm);
  });

  it('the paper damage formula gives the same damage as the game', () => {
    for (const s of REAL_STORMS) {
      for (const shield of [0, 40, 75, 100]) {
        const paper = Math.round((flarePower(s.classType) * (100 - shield)) / 100);
        assert.equal(paper, stormDamage(flarePower(s.classType), shield));
      }
    }
    assert.equal(paperFlares().length, REAL_STORMS.length);
  });

  it('every card of each site is printed with its site-specific numbers', () => {
    for (const site of ['moon', 'mars'] as const) {
      const cards = paperCards(site);
      assert.equal(cards.length, DECISION_CARDS.filter(c => c.sites.includes(site)).length);
      const alarm = cards.find(c => c.id === 'air_alarm')!;
      assert.equal(alarm.options[0].effects.air, site === 'moon' ? -3 : -18);
    }
  });

  it('playing with ONLY the printed rules gives exactly the same bars as the game, every day', () => {
    // Simulador "de papel": sigue al pie de la letra las reglas impresas (paperRules).
    const cl = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
    const thr = { moon: radiationShieldThreshold('moon'), mars: radiationShieldThreshold('mars') };
    let days = 0;
    for (const site of ['moon', 'mars'] as const) {
      for (const level of ['easy', 'normal'] as const) {
        for (let seed = 1; seed <= 40; seed++) {
          let g = createGame(site, seed, undefined, level);
          const L = LEVELS[level];
          let p = { ...L.start };
          let alive = true;
          while (g.status === 'playing' && alive) {
            const pick = ((seed + g.day) % 3 === 0 ? 1 : 0) as 0 | 1;
            const entry = g.deck[g.day - 1];
            const effects = entry.kind === 'storm'
              ? (pick === 0 ? { ...SHIELD_UP } : {})
              : paperCards(site).find(c => c.id === entry.cardId)!.options[pick].effects;
            // Regla 5: energía insuficiente → la parte buena rinde en proporción.
            const need = -(effects.energy ?? 0);
            const f = need > 0 && p.energy < need ? Math.max(0, p.energy) / need : 1;
            const up = (v?: number) => ((v ?? 0) > 0 ? (v ?? 0) * f : (v ?? 0));
            p = { air: cl(p.air + up(effects.air)), energy: cl(p.energy + (effects.energy ?? 0)), shield: cl(p.shield + up(effects.shield)), health: cl(p.health + up(effects.health)) };
            // Regla 3: tormenta.
            if (entry.kind === 'storm') {
              p.health = cl(p.health - Math.round((flarePower(entry.storm.classType) * (100 - p.shield)) / 100));
              p.shield = cl(p.shield - 10);
            }
            // Regla 6: final del día.
            p.air = cl(p.air - L.airUse);
            p.energy = cl(p.energy + (site === 'moon' ? 20 : 16) - 15);
            p.health = cl(p.health - (p.shield < thr[site] ? 2 : 1));
            // Regla 7.
            if (p.energy <= 0) { p.air = cl(p.air - 12); p.health = cl(p.health - 8); }
            if (p.air > 0 && p.air < 25) p.health = cl(p.health - 8);
            else if (p.air >= 40 && p.energy > 0) p.health = cl(p.health + 3);

            g = choose(g, pick);
            days++;
            assert.deepEqual(
              { air: g.air, energy: g.energy, shield: g.shield, health: g.health },
              p,
              `${site} ${level} seed ${seed} day ${g.history.length}`,
            );
            alive = p.air > 0 && p.health > 0;
          }
          assert.equal(alive, g.status !== 'lost', `${site} ${level} ${seed}: paper and game agree on the ending`);
        }
      }
    }
    assert.ok(days > 600);
  });
});
