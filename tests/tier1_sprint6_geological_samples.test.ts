import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GEOLOGICAL_CATALOG,
  GeologicalCabinetManager,
} from './helpers/sprintHarness';

describe('Tier 1.19: Sprint 6 - NASA Geological Samples & Laboratory Cabinet', () => {

  describe('Feature 17: F-NASA-SAMPLES (Rare Geological Sample Rolls & NASA Citations)', () => {
    it('SAMP-1: Catalog contains authentic NASA geological samples with mission citations', () => {
      const ice = GEOLOGICAL_CATALOG.polar_ice_cores;
      const clays = GEOLOGICAL_CATALOG.jezero_clays_biofirmas;
      const basalts = GEOLOGICAL_CATALOG.lunar_basalts;

      assert.ok(ice.nasaMissionRef.includes('VIPER'), 'Ice core must reference VIPER/LRO');
      assert.ok(clays.nasaMissionRef.includes('Perseverance'), 'Clays must reference Perseverance');
      assert.ok(basalts.nasaMissionRef.includes('Apollo'), 'Basalts must reference Apollo');
    });

    it('SAMP-2: Rover sortie on Moon Shackleton Rim rolls polar ice cores', () => {
      const manager = new GeologicalCabinetManager();
      const sample = manager.rollGeologicalSample('moon', 'shackleton_rim', 0.2); // Roll < 0.40

      assert.ok(sample !== null);
      assert.strictEqual(sample.id, 'polar_ice_cores');
      assert.strictEqual(sample.location, 'moon');
      assert.strictEqual(sample.stackingBonus.waterEfficiencyBonusPct, 20);
    });

    it('SAMP-3: Rover sortie on Mars Jezero Delta rolls fluvial clays with biosignature potential', () => {
      const manager = new GeologicalCabinetManager();
      const sample = manager.rollGeologicalSample('mars', 'jezero_delta', 0.15); // Roll < 0.40

      assert.ok(sample !== null);
      assert.strictEqual(sample.id, 'jezero_clays_biofirmas');
      assert.strictEqual(sample.location, 'mars');
      assert.strictEqual(sample.stackingBonus.scienceBonusPct, 25);
    });

    it('SAMP-4: Rolling probability gate strictly respects 40% discovery threshold', () => {
      const manager = new GeologicalCabinetManager();
      // Roll > 0.40 fails discovery
      const sampleMiss = manager.rollGeologicalSample('moon', 'shackleton_rim', 0.65);
      assert.strictEqual(sampleMiss, null, 'Roll above 0.40 must not yield a rare sample');

      // Roll <= 0.40 succeeds
      const sampleHit = manager.rollGeologicalSample('moon', 'shackleton_rim', 0.35);
      assert.ok(sampleHit !== null);
    });

    it('SAMP-5: Lunar basalt discovery provides titanium ilmenite radiation shielding buff', () => {
      const manager = new GeologicalCabinetManager();
      const sample = manager.rollGeologicalSample('moon', 'lava_tube_cave', 0.1);

      assert.ok(sample !== null);
      assert.strictEqual(sample.id, 'lunar_basalts');
      assert.strictEqual(sample.stackingBonus.shieldBonusPct, 15);
    });
  });

  describe('Feature 18: F-SAMPLE-CABINET-UI (Interactive Vitrine & Stacking Buff System)', () => {
    it('CAB-1: Adding sample to vitrine records discovery Sol and initializes quantity to 1', () => {
      const manager = new GeologicalCabinetManager();
      manager.addSample(GEOLOGICAL_CATALOG.polar_ice_cores, 5);

      const entry = manager.vitrine.get('polar_ice_cores');
      assert.ok(entry !== undefined);
      assert.strictEqual(entry.quantity, 1);
      assert.strictEqual(entry.sample.discoverySol, 5);
    });

    it('CAB-2: Duplicate sample collection increments quantity and stacks bonus multipliers', () => {
      const manager = new GeologicalCabinetManager();
      manager.addSample(GEOLOGICAL_CATALOG.jezero_clays_biofirmas, 3);
      manager.addSample(GEOLOGICAL_CATALOG.jezero_clays_biofirmas, 8);

      const entry = manager.vitrine.get('jezero_clays_biofirmas');
      assert.strictEqual(entry?.quantity, 2);

      const buffs = manager.getCumulativeBuffs();
      // 25% * 2 = 50% science bonus
      assert.strictEqual(buffs.totalScienceBonusPct, 50);
      // 15 * 2 = 30 morale
      assert.strictEqual(buffs.totalMoraleBonus, 30);
    });

    it('CAB-3: Multiple distinct samples stack diverse colony bonuses simultaneously', () => {
      const manager = new GeologicalCabinetManager();
      manager.addSample(GEOLOGICAL_CATALOG.polar_ice_cores, 2);
      manager.addSample(GEOLOGICAL_CATALOG.lunar_basalts, 4);

      const buffs = manager.getCumulativeBuffs();
      // polar_ice (15 sci, 10 mor, 20 water) + lunar_basalt (10 sci, 10 mor, 15 shield)
      assert.strictEqual(buffs.totalScienceBonusPct, 25);
      assert.strictEqual(buffs.totalMoraleBonus, 20);
      assert.strictEqual(buffs.totalShieldBonusPct, 15);
      assert.strictEqual(buffs.totalWaterEfficiencyBonusPct, 20);
    });

    it('CAB-4: Empty vitrine returns zero buffs safely without NaN or undefined errors', () => {
      const manager = new GeologicalCabinetManager();
      const buffs = manager.getCumulativeBuffs();

      assert.strictEqual(buffs.totalScienceBonusPct, 0);
      assert.strictEqual(buffs.totalMoraleBonus, 0);
      assert.strictEqual(buffs.totalShieldBonusPct, 0);
      assert.strictEqual(buffs.totalWaterEfficiencyBonusPct, 0);
    });

    it('CAB-5: Scientific facts in Spanish and English contain valid non-empty NASA descriptions', () => {
      for (const sample of Object.values(GEOLOGICAL_CATALOG)) {
        assert.ok(sample.scientificFactEs.length > 20, 'Spanish scientific fact must be descriptive');
        assert.ok(sample.scientificFactEn.length > 20, 'English scientific fact must be descriptive');
        assert.ok(sample.titleEs.length > 0);
        assert.ok(sample.titleEn.length > 0);
      }
    });
  });

});
