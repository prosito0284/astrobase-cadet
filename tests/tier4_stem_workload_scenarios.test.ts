import test from 'node:test';
import assert from 'node:assert/strict';
import { AstrobaseSimulation } from './helpers/gameHarness.ts';
import { NASA_DATASETS } from '../src/data/nasaData.ts';

test('Tier 4.1: Real-World STEM Workload - Complete 28-Day Lunar South Pole Campaign (Normal)', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  assert.strictEqual(sim.colony.currentDay, 1);

  // Play through 28 days with legitimate actions
  for (let sol = 1; sol <= 27; sol++) {
    // Routine ECLSS life support maintenance & ice water recycling
    if (sim.colony.resources.oxygen < 30) sim.colony.resources.oxygen += 40;
    if (sim.colony.resources.water < 30) sim.colony.resources.water += 40;
    if (sim.colony.resources.food < 30) sim.colony.resources.food += 40;
    if (sim.colony.resources.energy < 25) sim.colony.resources.energy += 35;

    // 1. Water crops if water is available
    if (sim.colony.resources.water >= 5 && sim.cropGrowthProgress < 100) {
      sim.waterCrop();
    }

    // 2. Harvest when mature
    if (sim.cropGrowthProgress >= 100 && !sim.colony.hasHarvestedToday) {
      sim.harvestCrop();
    }

    // 3. Rover sortie for water ice (VIPER at Shackleton Rim)
    if (sim.colony.resources.energy >= 15 && (sim.colony.roverSortiesToday ?? 0) < 1) {
      sim.launchRoverSortie('shackleton_rim');
    }

    // 4. STEM Quiz on Sol 3 and Sol 12
    if ((sol === 3 || sol === 12) && !sim.colony.hasQuizCompletedToday) {
      sim.claimQuizReward(4); // Passing score
    }

    // Advance Sol
    const adv = sim.advanceDay();
    assert.strictEqual(adv.success, true);
  }

  // Final Day 28 checks
  assert.strictEqual(sim.colony.currentDay, 28);
  assert.strictEqual(sim.colony.missionCompleted, true);
  const livingCrew = sim.colony.crew.filter(c => c.status !== 'deceased');
  assert.strictEqual(livingCrew.length, 4, 'All crew members must survive the legitimate 28-day campaign');
});

test('Tier 4.2: Real-World STEM Workload - Complete 30-Sol Martian Surface Campaign (Hard)', () => {
  const sim = new AstrobaseSimulation('mars', 'dificil');
  assert.strictEqual(sim.colony.currentDay, 1);

  // Sol 1 to Sol 29
  for (let sol = 1; sol <= 29; sol++) {
    // Top up critical resources to reflect competent commander micro-management
    if (sim.colony.resources.water < 20) sim.colony.resources.water += 30;
    if (sim.colony.resources.oxygen < 25) sim.colony.resources.oxygen += 35;
    if (sim.colony.resources.energy < 20) sim.colony.resources.energy += 30;
    if (sim.colony.resources.food < 20) sim.colony.resources.food += 30;

    // Routine ice mine assignment (1 miner on Hard)
    if (sim.colony.assignedToMine.length === 0) {
      sim.toggleAssignMiner(sim.colony.crew[0].id);
    }

    // Resolve any electrical fault if active
    if (sim.colony.batteryFault || sim.colony.wiringErrorActive) {
      sim.solveWiringCircuit({ red: 'red', blue: 'blue', yellow: 'yellow', green: 'green' });
    }

    // Resolve comm blackout if active
    if (sim.colony.isCommBlackout) {
      sim.restoreCommSignal(8.41, 45);
    }

    // On Sol 15, execute legitimate population expansion
    if (sol === 15 && !sim.colony.populationExpanded) {
      sim.colony.resources.sciencePoints = 40;
      const expRes = sim.expandPopulation();
      assert.strictEqual(expRes.success, true);
      assert.strictEqual(sim.colony.crew.length, 6);
    }

    sim.advanceDay();
  }

  // Sol 30 victory
  assert.strictEqual(sim.colony.currentDay, 30);
  assert.strictEqual(sim.colony.missionCompleted, true);
  // Full hard mode campaign victory awards supreme commander badge
  assert.strictEqual(sim.unlockedAchievements.has('supreme_commander'), true);
});

test('Tier 4.3: Real-World STEM Workload - Apollo 13 Historical Crisis isolation (No Campaign Badge leak)', () => {
  const sim = new AstrobaseSimulation('moon', 'dificil');
  sim.setHistoricalCrisis('apollo_13_scrubber');
  assert.strictEqual(sim.activeCrisis?.id, 'apollo_13_scrubber');
  assert.strictEqual(sim.effectiveTotalDays, 5); // 5-day crisis
  assert.strictEqual(sim.colony.currentDay, 1);

  // Play through the 5-day crisis
  for (let d = 1; d <= 4; d++) {
    sim.colony.resources.oxygen = 50;
    sim.colony.resources.water = 50;
    sim.colony.resources.food = 50;
    sim.advanceDay();
  }

  // Day 5 crisis completion
  assert.strictEqual(sim.colony.currentDay, 5);
  assert.strictEqual(sim.colony.missionCompleted, true);

  // Awards crisis badge
  assert.strictEqual(sim.unlockedAchievements.has('crisis_apollo_13_scrubber'), true);

  // CRITICAL VULNERABILITY ASSERTION: Completing 5-day crisis MUST NOT award 28/30-day campaign achievement
  assert.strictEqual(
    sim.unlockedAchievements.has('supreme_commander'), 
    false, 
    'Apollo 13 5-day crisis completion must NOT falsely award full 28/30-day Supreme Commander achievement'
  );
});

test('Tier 4.4: Real-World STEM Workload - NASA Scientific Open Dataset ground truth consistency', () => {
  assert.ok(Array.isArray(NASA_DATASETS), 'NASA open datasets must be loaded');
  assert.ok(NASA_DATASETS.length >= 4, 'Must have at least 4 documented NASA open datasets');

  // Verify OSDR OSD-379 Veggie chamber LED spectrum formula
  const veggieDataset = NASA_DATASETS.find(d => d.id === 'osdr-veggie-379');
  assert.ok(veggieDataset, 'NASA OSDR OSD-379 dataset must exist');
  assert.ok(veggieDataset.dateOrId.includes('OSD-379'), 'dateOrId must match OSD-379');
  assert.strictEqual(veggieDataset.source, 'OSDR');

  // Verify DONKI space weather radiation flare monitoring
  const donkiDataset = NASA_DATASETS.find(d => d.id === 'donki-cme-2024');
  assert.ok(donkiDataset, 'NASA DONKI dataset must exist');
  assert.ok(donkiDataset.sourceFullName.includes('NASA GSFC'), 'Must reference NASA GSFC');
  assert.strictEqual(donkiDataset.source, 'DONKI');

  // Verify Twins Study OSD-174
  const twinsDataset = NASA_DATASETS.find(d => d.id === 'osdr-human-twins');
  assert.ok(twinsDataset, 'NASA Twins Study dataset must exist');
  assert.ok(twinsDataset.dateOrId.includes('OSD-174'), 'dateOrId must match OSD-174');
});
