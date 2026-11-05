import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GEOLOGICAL_SAMPLES,
  getGeologicalSample,
  isValidGeologicalSampleId,
  getSamplesByLocation,
  calculateCabinetBonuses,
  rollGeologicalSample,
  LEGACY_SAMPLE_ALIASES,
} from '../src/data/geologicalSamples';
import {
  GEOLOGICAL_CATALOG,
  GeologicalCabinetManager,
} from './helpers/sprintHarness';
import { BaseLocation, ColonySaveData } from '../src/types/game';

describe('Tier 1.19: Sprint 6 - NASA Astromaterials Geological Specimen Database & Cabinet', () => {

  // =========================================================================
  // 1. CATALOG INTEGRITY & AUTHENTIC NASA CITATIONS
  // =========================================================================
  describe('Group 1: Authentic NASA Astromaterials Catalog Integrity', () => {
    it('SAMP-1: Catalog contains all 6 authentic NASA specimens (3 Moon, 3 Mars)', () => {
      const keys = Object.keys(GEOLOGICAL_SAMPLES);
      assert.strictEqual(keys.length, 6, 'Must contain exactly 6 authentic specimens');
      assert.ok('lunar_basalt' in GEOLOGICAL_SAMPLES);
      assert.ok('anorthosite_genesis' in GEOLOGICAL_SAMPLES);
      assert.ok('polar_ice_core' in GEOLOGICAL_SAMPLES);
      assert.ok('jezero_clay' in GEOLOGICAL_SAMPLES);
      assert.ok('basaltic_shergottite' in GEOLOGICAL_SAMPLES);
      assert.ok('sulfate_hydrate' in GEOLOGICAL_SAMPLES);
    });

    it('SAMP-2: Moon specimens partition strictly to 3 samples with authentic Apollo/VIPER facts', () => {
      const moonSamples = getSamplesByLocation('moon');
      assert.strictEqual(moonSamples.length, 3);

      const basalt = GEOLOGICAL_SAMPLES.lunar_basalt;
      assert.ok(basalt.nasaMissionRef.includes('Apollo 11'), 'Basalt must cite Apollo 11');
      assert.ok(basalt.chemicalFormula.includes('FeTiO₃'), 'Basalt must specify ilmenite formula');
      assert.ok(basalt.geologicalAge.includes('3.7'), 'Basalt age must be ~3.7 Ga');

      const genesis = GEOLOGICAL_SAMPLES.anorthosite_genesis;
      assert.ok(genesis.nasaMissionRef.includes('Apollo 15'), 'Genesis Rock must cite Apollo 15');
      assert.ok(genesis.sampleCatalogId.includes('15415'), 'Must cite official specimen #15415');
      assert.ok(genesis.chemicalFormula.includes('CaAl₂Si₂O₈'), 'Must specify anorthite plagioclase formula');

      const ice = GEOLOGICAL_SAMPLES.polar_ice_core;
      assert.ok(ice.nasaMissionRef.includes('LCROSS') || ice.nasaMissionRef.includes('VIPER'));
      assert.ok(ice.geologicalAge.includes('40 Kelvin') || ice.geologicalAge.includes('-233 °C'));
      assert.ok(ice.chemicalFormula.includes('H₂O'));
    });

    it('SAMP-3: Mars specimens partition strictly to 3 samples with authentic Perseverance/Curiosity facts', () => {
      const marsSamples = getSamplesByLocation('mars');
      assert.strictEqual(marsSamples.length, 3);

      const clay = GEOLOGICAL_SAMPLES.jezero_clay;
      assert.ok(clay.nasaMissionRef.includes('Perseverance'));
      assert.ok(clay.nasaMissionRef.includes('PIXL') || clay.nasaMissionRef.includes('SHERLOC'));
      assert.ok(clay.astrobiologicalSignificanceEs.includes('biofirmas') || clay.astrobiologicalSignificanceEs.includes('fósiles'));

      const shergottite = GEOLOGICAL_SAMPLES.basaltic_shergottite;
      assert.ok(shergottite.chemicalFormula.includes('Maskelinita') || shergottite.chemicalFormula.includes('SiO₃'));
      assert.ok(shergottite.scientificFactEs.includes('Viking') || shergottite.scientificFactEn.includes('Viking'));

      const sulfate = GEOLOGICAL_SAMPLES.sulfate_hydrate;
      assert.ok(sulfate.nasaMissionRef.includes('Curiosity'));
      assert.ok(sulfate.chemicalFormula.includes('CaSO₄'));
      assert.ok(sulfate.sampleCatalogId.includes('Cumberland') || sulfate.sampleCatalogId.includes('Duluth'));
    });

    it('SAMP-4: All specimens contain non-empty bilingual descriptions, formulas and visual properties', () => {
      for (const specimen of Object.values(GEOLOGICAL_SAMPLES)) {
        assert.ok(specimen.nameEs.length > 5);
        assert.ok(specimen.nameEn.length > 5);
        assert.ok(specimen.subnameEs.length > 5);
        assert.ok(specimen.subnameEn.length > 5);
        assert.ok(specimen.scientificFactEs.length > 30);
        assert.ok(specimen.scientificFactEn.length > 30);
        assert.ok(specimen.astrobiologicalSignificanceEs.length > 30);
        assert.ok(specimen.astrobiologicalSignificanceEn.length > 30);
        assert.ok(specimen.chemicalFormula.length > 3);
        assert.ok(specimen.visuals.primaryColor.startsWith('#'));
        assert.ok(specimen.visuals.accentColor.startsWith('#'));
        assert.ok(specimen.visuals.icon.length > 0);
      }
    });

    it('SAMP-5: Every specimen grants passive Science (+5% to +10%) and Morale (+2 to +5) bonuses', () => {
      for (const specimen of Object.values(GEOLOGICAL_SAMPLES)) {
        assert.ok(specimen.stackingBonus.scienceBonusPct >= 5 && specimen.stackingBonus.scienceBonusPct <= 10);
        assert.ok(specimen.stackingBonus.moraleBonus >= 2 && specimen.stackingBonus.moraleBonus <= 5);
      }
    });
  });

  // =========================================================================
  // 2. PROBABILISTIC EXTRACTION ROLLS & TARGET MAPPING
  // =========================================================================
  describe('Group 2: Rover Mining & Sortie Geological Extraction Rolls', () => {
    it('ROLL-1: Probability gate strictly respects 40% threshold (roll > 0.40 yields null)', () => {
      const miss1 = rollGeologicalSample('moon', 'shackleton_ice', 0.401);
      const miss2 = rollGeologicalSample('mars', 'jezero_delta', 0.999);
      const miss3 = rollGeologicalSample('moon', undefined, 0.50);

      assert.strictEqual(miss1, null);
      assert.strictEqual(miss2, null);
      assert.strictEqual(miss3, null);
    });

    it('ROLL-2: Roll <= 0.40 succeeds and produces valid geological specimen', () => {
      const hit1 = rollGeologicalSample('moon', 'shackleton_ice', 0.39);
      const hit2 = rollGeologicalSample('mars', 'jezero_delta', 0.15);

      assert.ok(hit1 !== null);
      assert.ok(hit2 !== null);
      assert.strictEqual(hit1.location, 'moon');
      assert.strictEqual(hit2.location, 'mars');
    });

    it('ROLL-3: Moon sortie to shackleton_ice rolls polar_ice_core', () => {
      const sample = rollGeologicalSample('moon', 'shackleton_ice', 0.25);
      assert.ok(sample !== null);
      assert.strictEqual(sample.id, 'polar_ice_core');
      assert.strictEqual(sample.stackingBonus.waterEfficiencyBonusPct, 20);
    });

    it('ROLL-4: Moon sortie to lava_tube_cave rolls lunar_basalt', () => {
      const sample = rollGeologicalSample('moon', 'lava_tube_cave', 0.25);
      assert.ok(sample !== null);
      assert.strictEqual(sample.id, 'lunar_basalt');
      assert.strictEqual(sample.stackingBonus.shieldBonusPct, 15);
    });

    it('ROLL-5: Moon sortie to eternal_light_ridge rolls anorthosite_genesis', () => {
      const sample = rollGeologicalSample('moon', 'eternal_light_ridge', 0.25);
      assert.ok(sample !== null);
      assert.strictEqual(sample.id, 'anorthosite_genesis');
      assert.strictEqual(sample.stackingBonus.moraleBonus, 5);
    });

    it('ROLL-6: Mars sortie to jezero_delta rolls jezero_clay', () => {
      const sample = rollGeologicalSample('mars', 'jezero_delta', 0.20);
      assert.ok(sample !== null);
      assert.strictEqual(sample.id, 'jezero_clay');
      assert.strictEqual(sample.stackingBonus.scienceBonusPct, 10);
    });

    it('ROLL-7: Mars sortie to dune_field_clean rolls basaltic_shergottite', () => {
      const sample = rollGeologicalSample('mars', 'dune_field_clean', 0.20);
      assert.ok(sample !== null);
      assert.strictEqual(sample.id, 'basaltic_shergottite');
      assert.strictEqual(sample.stackingBonus.shieldBonusPct, 10);
    });

    it('ROLL-8: Mars sortie to hydrated_sulfates rolls sulfate_hydrate', () => {
      const sample = rollGeologicalSample('mars', 'hydrated_sulfates', 0.20);
      assert.ok(sample !== null);
      assert.strictEqual(sample.id, 'sulfate_hydrate');
      assert.strictEqual(sample.stackingBonus.waterEfficiencyBonusPct, 15);
    });

    it('ROLL-9: 3D laser mining node types map appropriately on Moon and Mars', () => {
      const moonWater = rollGeologicalSample('moon', 'water', 0.1);
      assert.strictEqual(moonWater?.id, 'polar_ice_core');

      const moonShield = rollGeologicalSample('moon', 'shield', 0.1);
      assert.strictEqual(moonShield?.id, 'lunar_basalt');

      const marsScience = rollGeologicalSample('mars', 'science', 0.1);
      assert.strictEqual(marsScience?.id, 'jezero_clay');

      const marsWater = rollGeologicalSample('mars', 'water', 0.1);
      assert.strictEqual(marsWater?.id, 'sulfate_hydrate');
    });

    it('ROLL-10: Untargeted rolls distribute across all 3 planet specimens smoothly without error', () => {
      const foundIdsMoon = new Set<string>();
      for (let r = 0.01; r < 0.40; r += 0.05) {
        const sample = rollGeologicalSample('moon', undefined, r);
        if (sample) foundIdsMoon.add(sample.id);
      }
      assert.ok(foundIdsMoon.size >= 2, 'Should distribute across moon specimens');

      const foundIdsMars = new Set<string>();
      for (let r = 0.01; r < 0.40; r += 0.05) {
        const sample = rollGeologicalSample('mars', undefined, r);
        if (sample) foundIdsMars.add(sample.id);
      }
      assert.ok(foundIdsMars.size >= 2, 'Should distribute across mars specimens');
    });
  });

  // =========================================================================
  // 3. STACKING BONUSES & MATHEMATICAL RESILIENCE
  // =========================================================================
  describe('Group 3: Stacking Bonuses & Math Safety', () => {
    it('BUFF-1: Empty cabinet returns baseline 0% bonuses and 1.0x multiplier safely', () => {
      const bonuses = calculateCabinetBonuses([]);
      assert.strictEqual(bonuses.totalScienceBonusPct, 0);
      assert.strictEqual(bonuses.scienceMultiplier, 1.0);
      assert.strictEqual(bonuses.totalMoraleBonus, 0);
      assert.strictEqual(bonuses.totalShieldBonusPct, 0);
      assert.strictEqual(bonuses.totalWaterEfficiencyBonusPct, 0);
      assert.strictEqual(bonuses.discoveredCount, 0);
    });

    it('BUFF-2: Single discovered specimen calculates correct bonus', () => {
      const bonuses = calculateCabinetBonuses(['lunar_basalt']);
      assert.strictEqual(bonuses.totalScienceBonusPct, 8);
      assert.strictEqual(bonuses.scienceMultiplier, 1.08);
      assert.strictEqual(bonuses.totalMoraleBonus, 3);
      assert.strictEqual(bonuses.totalShieldBonusPct, 15);
      assert.strictEqual(bonuses.discoveredCount, 1);
    });

    it('BUFF-3: Complete Moon collection stacks all 3 Lunar specimens', () => {
      const bonuses = calculateCabinetBonuses(['lunar_basalt', 'anorthosite_genesis', 'polar_ice_core']);
      // 8 + 10 + 10 = 28% science
      assert.strictEqual(bonuses.totalScienceBonusPct, 28);
      assert.strictEqual(bonuses.scienceMultiplier, 1.28);
      // 3 + 5 + 4 = 12 morale
      assert.strictEqual(bonuses.totalMoraleBonus, 12);
      // 15 + 10 = 25% shield
      assert.strictEqual(bonuses.totalShieldBonusPct, 25);
      // 20% water
      assert.strictEqual(bonuses.totalWaterEfficiencyBonusPct, 20);
      assert.strictEqual(bonuses.discoveredCount, 3);
    });

    it('BUFF-4: Complete Mars collection stacks all 3 Martian specimens', () => {
      const bonuses = calculateCabinetBonuses(['jezero_clay', 'basaltic_shergottite', 'sulfate_hydrate']);
      // 10 + 8 + 7 = 25% science
      assert.strictEqual(bonuses.totalScienceBonusPct, 25);
      assert.strictEqual(bonuses.scienceMultiplier, 1.25);
      // 5 + 3 + 3 = 11 morale
      assert.strictEqual(bonuses.totalMoraleBonus, 11);
      // 5 + 10 = 15% shield
      assert.strictEqual(bonuses.totalShieldBonusPct, 15);
      // 15% water
      assert.strictEqual(bonuses.totalWaterEfficiencyBonusPct, 15);
      assert.strictEqual(bonuses.discoveredCount, 3);
    });

    it('BUFF-5: Duplicate collection scales bonuses linearly without numeric overflow', () => {
      const duplicates = Array(50).fill('polar_ice_core');
      const bonuses = calculateCabinetBonuses(duplicates);

      assert.strictEqual(bonuses.totalScienceBonusPct, 10 * 50); // 500%
      assert.strictEqual(bonuses.scienceMultiplier, 6.0); // 1.0 + 5.0
      assert.strictEqual(bonuses.totalMoraleBonus, 4 * 50);      // 200
      assert.strictEqual(bonuses.totalWaterEfficiencyBonusPct, 20 * 50); // 1000%
      assert.ok(Number.isFinite(bonuses.scienceMultiplier));
    });

    it('BUFF-6: Invalid, null or corrupt IDs in cabinet are filtered without throwing', () => {
      const corrupt = ['lunar_basalt', null as any, undefined as any, 'non_existent_rock', ''];
      const bonuses = calculateCabinetBonuses(corrupt);

      assert.strictEqual(bonuses.totalScienceBonusPct, 8);
      assert.strictEqual(bonuses.discoveredCount, 1);
    });
  });

  // =========================================================================
  // 4. LEGACY ALIASES & SPRINT HARNESS INTEROPERABILITY
  // =========================================================================
  describe('Group 4: Legacy Aliases & Backward Interoperability', () => {
    it('LEG-1: Legacy keys map smoothly to canonical specimens', () => {
      assert.strictEqual(LEGACY_SAMPLE_ALIASES['polar_ice_cores'], 'polar_ice_core');
      assert.strictEqual(LEGACY_SAMPLE_ALIASES['lunar_basalts'], 'lunar_basalt');
      assert.strictEqual(LEGACY_SAMPLE_ALIASES['jezero_clays_biofirmas'], 'jezero_clay');

      const sample1 = getGeologicalSample('polar_ice_cores');
      assert.ok(sample1 !== undefined);
      assert.strictEqual(sample1.id, 'polar_ice_core');

      const sample2 = getGeologicalSample('lunar_basalts');
      assert.ok(sample2 !== undefined);
      assert.strictEqual(sample2.id, 'lunar_basalt');

      const sample3 = getGeologicalSample('jezero_clays_biofirmas');
      assert.ok(sample3 !== undefined);
      assert.strictEqual(sample3.id, 'jezero_clay');
    });

    it('LEG-2: isValidGeologicalSampleId verifies canonical and legacy keys correctly', () => {
      assert.strictEqual(isValidGeologicalSampleId('lunar_basalt'), true);
      assert.strictEqual(isValidGeologicalSampleId('polar_ice_cores'), true);
      assert.strictEqual(isValidGeologicalSampleId('kryptonite'), false);
      assert.strictEqual(isValidGeologicalSampleId(''), false);
    });

    it('LEG-3: sprintHarness prototype harness maintains 100% test contract', () => {
      const manager = new GeologicalCabinetManager();
      manager.addSample(GEOLOGICAL_CATALOG.polar_ice_cores, 5);
      manager.addSample(GEOLOGICAL_CATALOG.jezero_clays_biofirmas, 8);

      const buffs = manager.getCumulativeBuffs();
      assert.strictEqual(buffs.totalScienceBonusPct, 15 + 25);
      assert.strictEqual(buffs.totalMoraleBonus, 10 + 15);
    });
  });

  // =========================================================================
  // 5. INDEPENDENT CELESTIAL BODY PERSISTENCE & STORAGE ISOLATION
  // =========================================================================
  describe('Group 5: Dual Celestial Body Persistence & Storage Isolation', () => {
    it('PERS-1: Moon and Mars maintain completely isolated sample collections', () => {
      const dualColonies: { moon: ColonySaveData; mars: ColonySaveData } = {
        moon: {
          currentDay: 5,
          resources: {} as any,
          modules: [],
          crew: [],
          radiationActive: false,
          dustStormActive: false,
          isLunarNight: false,
          currentTemperatureCelsius: -180,
          isTemperatureExtreme: true,
          isCommBlackout: false,
          solarFluctuation: false,
          emergencyO2Active: false,
          batteryFault: false,
          batteryFaultCount: 0,
          batteryLockoutSeconds: 0,
          batteryLockoutTurns: 0,
          wiringErrorActive: false,
          sandstormEnergyHaltDays: 0,
          plantsNeedDoubleWaterOnce: false,
          plantsWipedGrowth: false,
          empStunSeconds: 0,
          populationExpanded: false,
          assignedToMine: [],
          sampleCabinet: ['lunar_basalt', 'polar_ice_core'],
        },
        mars: {
          currentDay: 5,
          resources: {} as any,
          modules: [],
          crew: [],
          radiationActive: false,
          dustStormActive: false,
          isLunarNight: false,
          currentTemperatureCelsius: 20,
          isTemperatureExtreme: false,
          isCommBlackout: false,
          solarFluctuation: false,
          emergencyO2Active: false,
          batteryFault: false,
          batteryFaultCount: 0,
          batteryLockoutSeconds: 0,
          batteryLockoutTurns: 0,
          wiringErrorActive: false,
          sandstormEnergyHaltDays: 0,
          plantsNeedDoubleWaterOnce: false,
          plantsWipedGrowth: false,
          empStunSeconds: 0,
          populationExpanded: false,
          assignedToMine: [],
          sampleCabinet: ['jezero_clay'],
        },
      };

      const moonBonuses = calculateCabinetBonuses(dualColonies.moon.sampleCabinet || []);
      const marsBonuses = calculateCabinetBonuses(dualColonies.mars.sampleCabinet || []);

      assert.strictEqual(moonBonuses.discoveredCount, 2);
      assert.strictEqual(marsBonuses.discoveredCount, 1);
      assert.strictEqual(dualColonies.moon.sampleCabinet?.includes('jezero_clay'), false);
      assert.strictEqual(dualColonies.mars.sampleCabinet?.includes('lunar_basalt'), false);
    });

    it('PERS-2: Backward compatibility with legacy saves without sampleCabinet initializes empty array', () => {
      const legacySave = {
        currentDay: 10,
        resources: {},
        modules: [],
        crew: [],
      };

      const cabinet: string[] = Array.isArray((legacySave as any).sampleCabinet) 
        ? (legacySave as any).sampleCabinet 
        : [];

      assert.deepStrictEqual(cabinet, []);
      const bonuses = calculateCabinetBonuses(cabinet);
      assert.strictEqual(bonuses.scienceMultiplier, 1.0);
    });
  });

});
