import { 
  BaseLocation, 
  GameDifficulty, 
  ResourceState, 
  ColonySaveData 
} from '../../src/types/game.ts';
import { SCENARIOS } from '../../src/data/scenarios.ts';
import { INITIAL_MODULES } from '../../src/data/modules.ts';
import { INITIAL_CREW, EXPANDED_CREW_MEMBERS } from '../../src/data/crew.ts';
import { HISTORICAL_CRISES, HistoricalCrisis } from '../../src/data/historicalCrises.ts';

export const MAX_SCIENCE_POINTS = 500;

export const clampResources = (
  res: Partial<ResourceState> | undefined,
  baseMax?: Partial<ResourceState>
): ResourceState => {
  const getPositiveCap = (val: any, fallbackVal: any, defaultVal: number): number => {
    const n = Number(val);
    if (Number.isFinite(n) && n > 0) return n;
    const fb = Number(fallbackVal);
    if (Number.isFinite(fb) && fb > 0) return fb;
    return defaultVal;
  };

  const maxO2 = getPositiveCap(res?.maxOxygen, baseMax?.maxOxygen, 100);
  const maxH2O = getPositiveCap(res?.maxWater, baseMax?.maxWater, 100);
  const maxE = getPositiveCap(res?.maxEnergy, baseMax?.maxEnergy, 100);
  const maxF = getPositiveCap(res?.maxFood, baseMax?.maxFood, 100);

  const rawMaxSci = Number.isFinite(Number(res?.maxSciencePoints))
    ? Number(res?.maxSciencePoints)
    : Number.isFinite(Number(baseMax?.maxSciencePoints))
      ? Number(baseMax?.maxSciencePoints)
      : MAX_SCIENCE_POINTS;
  const maxSci = Math.max(1, Math.min(MAX_SCIENCE_POINTS, rawMaxSci));

  const safeNum = (v: any, fallback: number, min: number, max: number): number => {
    const safeFallback = Number.isFinite(fallback) ? Math.max(min, Math.min(max, fallback)) : min;
    if (v === undefined || v === null) return safeFallback;
    const n = Number(v);
    if (!Number.isFinite(n)) return safeFallback;
    if (n < min) return min;
    if (n > max) return max;
    return n;
  };

  return {
    oxygen: safeNum(res?.oxygen, 80, 0, maxO2),
    maxOxygen: maxO2,
    water: safeNum(res?.water, 75, 0, maxH2O),
    maxWater: maxH2O,
    energy: safeNum(res?.energy, 85, 0, maxE),
    maxEnergy: maxE,
    energyProduction: safeNum(res?.energyProduction, 30, 0, 9999),
    energyConsumption: safeNum(res?.energyConsumption, 25, 0, 9999),
    food: safeNum(res?.food, 80, 0, maxF),
    maxFood: maxF,
    radiationExposure: safeNum(res?.radiationExposure, 0, 0, 9999),
    shieldIntegrity: safeNum(res?.shieldIntegrity, 80, 0, 100),
    sciencePoints: safeNum(res?.sciencePoints, 0, 0, maxSci),
    maxSciencePoints: maxSci,
  };
};

export interface RoverSortieTarget {
  id: string;
  nameEs: string;
  batteryCost: number;
  rewardType: 'water' | 'shield' | 'science' | 'energy';
  rewardAmount: number;
}

export const ROVER_TARGETS: Record<BaseLocation, RoverSortieTarget[]> = {
  moon: [
    { id: 'shackleton_rim', nameEs: 'Cráter Shackleton', batteryCost: 15, rewardType: 'water', rewardAmount: 22 },
    { id: 'lava_tube_cave', nameEs: 'Tubo de Lava', batteryCost: 14, rewardType: 'shield', rewardAmount: 18 },
    { id: 'eternal_light_ridge', nameEs: 'Pico de Luz Eterna', batteryCost: 12, rewardType: 'energy', rewardAmount: 15 },
  ],
  mars: [
    { id: 'jezero_delta', nameEs: 'Delta Fluvial Jezero', batteryCost: 14, rewardType: 'science', rewardAmount: 25 },
    { id: 'dune_field_clean', nameEs: 'Campo de Dunas', batteryCost: 12, rewardType: 'energy', rewardAmount: 18 },
    { id: 'hydrated_sulfates', nameEs: 'Sulfatos Hidratados', batteryCost: 16, rewardType: 'water', rewardAmount: 20 },
  ],
};

export class AstrobaseSimulation {
  public colony: ColonySaveData;
  public location: BaseLocation;
  public unlockedAchievements: Set<string>;
  public activeCrisis: HistoricalCrisis | null = null;
  public actionLogs: string[] = [];

  // Botanical Lab modal transient state
  public cropGrowthProgress: number = 65;
  public cropRedSpectrum: number = 75;
  public cropBlueSpectrum: number = 25;

  constructor(location: BaseLocation = 'moon', difficulty: GameDifficulty = 'normal') {
    this.location = location;
    const scen = SCENARIOS.find(s => s.location === location) || SCENARIOS[0];

    this.colony = {
      currentDay: 1,
      difficulty,
      missionCompleted: false,
      resources: clampResources(scen.initialResources),
      modules: JSON.parse(JSON.stringify(INITIAL_MODULES)),
      crew: JSON.parse(JSON.stringify(INITIAL_CREW)),
      radiationActive: false,
      dustStormActive: false,
      isLunarNight: false,
      currentTemperatureCelsius: location === 'moon' ? -50 : -20,
      isTemperatureExtreme: false,
      isCommBlackout: false,
      solarFluctuation: false,
      emergencyO2Active: false,
      emergencyO2Charges: 2,
      roverSortiesToday: 0,
      hasHarvestedToday: false,
      hasQuizCompletedToday: false,
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
    };

    this.unlockedAchievements = new Set<string>();
  }

  public get effectiveTotalDays(): number {
    if (this.activeCrisis) return this.activeCrisis.targetDays;
    return this.location === 'moon' ? 28 : 30;
  }

  public unlockAchievement(id: string): void {
    this.unlockedAchievements.add(id);
    this.actionLogs.push(`ACHIEVEMENT_UNLOCKED: ${id}`);
  }

  // Sol / Day Advancement
  public advanceDay(): { success: boolean; reason?: string } {
    if (this.colony.missionCompleted || this.colony.currentDay >= this.effectiveTotalDays) {
      return { success: false, reason: 'MISSION_ALREADY_COMPLETED' };
    }

    const nextDay = this.colony.currentDay + 1;
    const maxDays = this.effectiveTotalDays;

    // Daily reset of per-Sol rate limits
    this.colony.roverSortiesToday = 0;
    this.colony.hasHarvestedToday = false;
    this.colony.hasQuizCompletedToday = false;

    // Reset daily timers and lockouts
    if (this.colony.batteryLockoutSeconds > 0) {
      this.colony.batteryLockoutSeconds = Math.max(0, this.colony.batteryLockoutSeconds - 1);
    }
    if (this.colony.empStunSeconds > 0) {
      this.colony.empStunSeconds = Math.max(0, this.colony.empStunSeconds - 1);
    }

    // Weather & Lunar night
    const isNightNow = this.location === 'moon' && (this.colony.difficulty === 'dificil' ? (nextDay >= 8 && nextDay <= 19) : (nextDay >= 10 && nextDay <= 18));
    this.colony.isLunarNight = isNightNow;

    if (this.location === 'moon') {
      this.colony.currentTemperatureCelsius = isNightNow ? -180 : -50;
      this.colony.isTemperatureExtreme = true;
    } else {
      this.colony.currentTemperatureCelsius = (nextDay % 2 === 0) ? -85 : -20;
      this.colony.isTemperatureExtreme = this.colony.currentTemperatureCelsius < -50;
    }

    // Daily life-support consumption
    const livingCrewCount = this.colony.crew.filter(c => c.status !== 'deceased').length;
    const o2Drain = livingCrewCount * 1.5;
    const h2oDrain = livingCrewCount * 1.8;
    const foodDrain = livingCrewCount * 1.2;

    this.colony.resources = clampResources({
      ...this.colony.resources,
      oxygen: this.colony.resources.oxygen - o2Drain,
      water: this.colony.resources.water - h2oDrain,
      food: this.colony.resources.food - foodDrain,
    }, this.colony.resources);

    // Check crew health against starvation/asphyxiation
    if (this.colony.resources.oxygen <= 0 || this.colony.resources.water <= 0 || this.colony.resources.food <= 0) {
      this.colony.crew = this.colony.crew.map(c => {
        if (c.status === 'deceased') return c;
        const newHealth = Math.max(0, c.health - 25);
        return {
          ...c,
          health: newHealth,
          status: newHealth <= 0 ? 'deceased' : newHealth < 25 ? 'critical' : 'alive',
          causeOfDeath: newHealth <= 0 ? 'Falla de soporte vital (ECLSS agotado)' : c.causeOfDeath,
        };
      });
      // Evict dead crew from mine
      this.evictDeceasedMiners();
    }

    this.colony.currentDay = nextDay;

    // Victory check
    if (nextDay >= maxDays) {
      this.colony.missionCompleted = true;
      if (this.activeCrisis) {
        this.unlockAchievement(`crisis_${this.activeCrisis.id}`);
      } else if (this.colony.difficulty === 'dificil') {
        this.unlockAchievement('supreme_commander');
      }
    }

    return { success: true };
  }

  // Botanical Lab: Irrigation
  public waterCrop(): { success: boolean; reason?: string } {
    const WATER_COST = 5;
    if (this.colony.resources.water < WATER_COST) {
      return { success: false, reason: 'INSUFFICIENT_WATER' };
    }

    this.colony.resources = clampResources({
      ...this.colony.resources,
      water: this.colony.resources.water - WATER_COST,
    }, this.colony.resources);

    this.cropGrowthProgress = Math.min(100, this.cropGrowthProgress + 25);
    return { success: true };
  }

  // Botanical Lab: Harvest
  public harvestCrop(): { success: boolean; reason?: string; yield?: any } {
    if (this.cropGrowthProgress < 100) {
      return { success: false, reason: 'CROP_NOT_MATURE' };
    }
    if (this.colony.hasHarvestedToday) {
      return { success: false, reason: 'HARVEST_QUOTA_REACHED' };
    }

    const multiplier = this.colony.difficulty === 'facil' ? 1.5 : 1.0;
    const foodGain = Math.round(25 * multiplier);
    const scienceGain = 15;
    const moraleGain = 12;

    this.colony.resources = clampResources({
      ...this.colony.resources,
      food: this.colony.resources.food + foodGain,
      sciencePoints: this.colony.resources.sciencePoints + scienceGain,
    }, this.colony.resources);

    this.colony.crew = this.colony.crew.map(c => {
      if (c.status === 'deceased') return c;
      return {
        ...c,
        health: Math.min(100, c.health + 5),
        morale: Math.min(100, c.morale + moraleGain),
      };
    });

    this.cropGrowthProgress = 15;
    this.colony.hasHarvestedToday = true;
    this.unlockAchievement('veggie_harvest');

    return { 
      success: true, 
      yield: { food: foodGain, science: scienceGain, morale: moraleGain } 
    };
  }

  // Rover Sorties
  public launchRoverSortie(targetId: string): { success: boolean; reason?: string } {
    const targets = ROVER_TARGETS[this.location] || [];
    const target = targets.find(t => t.id === targetId);
    if (!target) return { success: false, reason: 'INVALID_TARGET' };

    if ((this.colony.roverSortiesToday ?? 0) >= 2) {
      return { success: false, reason: 'SORTIE_LIMIT_REACHED' };
    }

    if (this.colony.resources.energy < target.batteryCost) {
      return { success: false, reason: 'INSUFFICIENT_ENERGY' };
    }

    // Deduct battery cost
    const penalty = this.colony.difficulty === 'dificil' ? 0.6 : 1.0;
    const scienceMultiplier = this.colony.difficulty === 'dificil' ? 1.5 : 1.0;

    const nextRes = { ...this.colony.resources, energy: this.colony.resources.energy - target.batteryCost };

    if (target.rewardType === 'water') {
      nextRes.water = nextRes.water + Math.round(target.rewardAmount * penalty);
    } else if (target.rewardType === 'shield') {
      nextRes.shieldIntegrity = nextRes.shieldIntegrity + Math.round(target.rewardAmount * penalty);
    } else if (target.rewardType === 'science') {
      nextRes.sciencePoints = nextRes.sciencePoints + Math.round(target.rewardAmount * scienceMultiplier);
    } else if (target.rewardType === 'energy') {
      // Energy reward cannot grant unbounded net perpetual power
      nextRes.energy = nextRes.energy + target.rewardAmount;
    }

    this.colony.resources = clampResources(nextRes, this.colony.resources);
    this.colony.roverSortiesToday = (this.colony.roverSortiesToday ?? 0) + 1;
    this.unlockAchievement('rover_sortie');

    return { success: true };
  }

  // Wiring Mini-Game
  public solveWiringCircuit(connections: Record<string, string>): { success: boolean; reason?: string } {
    if (!this.colony.batteryFault && !this.colony.wiringErrorActive) {
      return { success: false, reason: 'NO_ACTIVE_WIRING_FAULT' };
    }

    if (this.colony.batteryLockoutSeconds > 0) {
      return { success: false, reason: 'BATTERY_BUS_LOCKED_OUT' };
    }

    const availableCrew = this.colony.crew.filter(c => 
      c.status !== 'deceased' && 
      !this.colony.assignedToMine.includes(c.id) && 
      (c.isShockDisabledDays ?? 0) <= 0
    );

    if (this.colony.difficulty === 'dificil' && availableCrew.length < 2) {
      return { success: false, reason: 'INSUFFICIENT_CREW' };
    }

    // Injective (1-to-1 bijective) mapping verification
    const leftKeys = Object.keys(connections);
    const rightVals = Object.values(connections);

    if (leftKeys.length !== 4) {
      return { success: false, reason: 'INCOMPLETE_CONNECTIONS' };
    }

    const uniqueRightVals = new Set(rightVals);
    if (uniqueRightVals.size !== 4) {
      return { success: false, reason: 'NON_INJECTIVE_MAPPING_COLLISION' };
    }

    const allCorrect = leftKeys.every(k => connections[k] === k);
    if (!allCorrect) {
      return { success: false, reason: 'INCORRECT_CONNECTIONS' };
    }

    this.colony.batteryFault = false;
    this.colony.batteryFaultCount = 0;
    this.colony.batteryLockoutSeconds = 0;
    this.colony.wiringErrorActive = false;
    this.unlockAchievement('wire_master');

    return { success: true };
  }

  // DSN Comm Restoration
  public restoreCommSignal(freq: number, angle: number): { success: boolean; reason?: string } {
    if (!this.colony.isCommBlackout) {
      return { success: false, reason: 'NO_ACTIVE_BLACKOUT' };
    }

    const freqDiff = Math.abs(freq - 8.41);
    const angleDiff = Math.abs(angle - 45);
    const freqScore = Math.max(0, 100 - freqDiff * 250);
    const angleScore = Math.max(0, 100 - angleDiff * 4);
    const totalSignalLock = Math.round((freqScore * 0.6) + (angleScore * 0.4));

    if (totalSignalLock < 90) {
      return { success: false, reason: 'SIGNAL_NOT_LOCKED' };
    }

    this.colony.isCommBlackout = false;
    this.unlockAchievement('dsn_restored');
    return { success: true };
  }

  // Cryogenic Ice Mine Assignment
  public toggleAssignMiner(astronautId: string): { success: boolean; reason?: string } {
    if (this.colony.isCommBlackout) {
      return { success: false, reason: 'COMM_BLACKOUT_ACTIVE' };
    }

    this.evictDeceasedMiners();

    const isAssigned = this.colony.assignedToMine.includes(astronautId);
    if (isAssigned) {
      this.colony.assignedToMine = this.colony.assignedToMine.filter(id => id !== astronautId);
      this.colony.crew = this.colony.crew.map(c => c.id === astronautId ? { ...c, isAssignedToMine: false } : c);
      return { success: true };
    }

    const member = this.colony.crew.find(c => c.id === astronautId);
    if (!member || member.status === 'deceased') {
      return { success: false, reason: 'ASTRONAUT_DECEASED_OR_INVALID' };
    }

    if ((member.isShockDisabledDays ?? 0) > 0) {
      return { success: false, reason: 'ASTRONAUT_SHOCK_DISABLED' };
    }

    const maxAllowed = (this.colony.difficulty === 'dificil' && !this.colony.populationExpanded) ? 1 : 2;
    if (this.colony.assignedToMine.length >= maxAllowed) {
      return { success: false, reason: 'MINE_CAPACITY_REACHED' };
    }

    const livingCrew = this.colony.crew.filter(c => c.status !== 'deceased');
    const remainingInBase = livingCrew.length - this.colony.assignedToMine.length;
    if (remainingInBase <= 1) {
      return { success: false, reason: 'BASE_MINIMUM_CREW_VIOLATION' };
    }

    // Set semantics prevent duplicates
    if (!this.colony.assignedToMine.includes(astronautId)) {
      this.colony.assignedToMine = [...this.colony.assignedToMine, astronautId];
      this.colony.crew = this.colony.crew.map(c => c.id === astronautId ? { ...c, isAssignedToMine: true } : c);
    }

    return { success: true };
  }

  public evictDeceasedMiners(): void {
    const livingIds = new Set(this.colony.crew.filter(c => c.status !== 'deceased').map(c => c.id));
    this.colony.assignedToMine = this.colony.assignedToMine.filter(id => livingIds.has(id));
  }

  // Emergency Oxygen Injection
  public injectEmergencyO2(): { success: boolean; reason?: string } {
    if (this.colony.resources.oxygen >= 25) {
      return { success: false, reason: 'O2_NOT_CRITICAL' };
    }

    const charges = this.colony.emergencyO2Charges ?? 2;
    if (charges <= 0) {
      return { success: false, reason: 'NO_CANISTERS_REMAINING' };
    }

    this.colony.emergencyO2Charges = charges - 1;
    this.colony.emergencyO2Active = true;
    this.colony.resources = clampResources({
      ...this.colony.resources,
      oxygen: Math.min(100, this.colony.resources.oxygen + 35),
    }, this.colony.resources);

    return { success: true };
  }

  // NASA Quiz
  public claimQuizReward(score: number): { success: boolean; reason?: string; scienceEarned?: number } {
    if (this.colony.hasQuizCompletedToday) {
      return { success: false, reason: 'QUIZ_ALREADY_COMPLETED_TODAY' };
    }

    if (score < 3) {
      return { success: false, reason: 'SCORE_BELOW_PASSING_GRADE' };
    }

    // Single unified reward (no double scoring)
    const scienceEarned = 20;
    const moraleEarned = 20;

    this.colony.resources = clampResources({
      ...this.colony.resources,
      sciencePoints: this.colony.resources.sciencePoints + scienceEarned,
    }, this.colony.resources);

    this.colony.crew = this.colony.crew.map(c => {
      if (c.status === 'deceased') return c;
      return {
        ...c,
        morale: Math.min(100, c.morale + moraleEarned),
      };
    });

    this.colony.hasQuizCompletedToday = true;
    this.unlockAchievement('stem_genius');

    return { success: true, scienceEarned };
  }

  // Module Upgrade
  public upgradeModule(moduleId: string): { success: boolean; reason?: string } {
    const mod = this.colony.modules.find(m => m.id === moduleId);
    if (!mod) return { success: false, reason: 'MODULE_NOT_FOUND' };
    if (mod.level >= mod.maxLevel) return { success: false, reason: 'MAX_LEVEL_REACHED' };

    const isBunker = mod.id === 'storm_bunker';
    const cost = (this.colony.difficulty === 'dificil' && isBunker) ? 20 : 10;

    if (this.colony.resources.sciencePoints < cost) {
      return { success: false, reason: 'INSUFFICIENT_SCIENCE' };
    }

    this.colony.resources = clampResources({
      ...this.colony.resources,
      sciencePoints: this.colony.resources.sciencePoints - cost,
    }, this.colony.resources);

    mod.level += 1;
    return { success: true };
  }

  // Population Expansion (Day 15 on Hard)
  public expandPopulation(): { success: boolean; reason?: string } {
    if (this.colony.difficulty !== 'dificil') {
      return { success: false, reason: 'REQUIRES_HARD_DIFFICULTY' };
    }
    if (this.colony.currentDay < 15) {
      return { success: false, reason: 'REQUIRES_DAY_15' };
    }
    if (this.colony.populationExpanded) {
      return { success: false, reason: 'ALREADY_EXPANDED' };
    }

    // Minimum resource check: cannot expand with zero supplies
    const { oxygen, water, energy, food } = this.colony.resources;
    if (oxygen < 15 || water < 15 || energy < 15 || food < 15) {
      return { success: false, reason: 'INSUFFICIENT_SUPPLIES' };
    }

    // 25% supply sacrifice
    this.colony.resources = clampResources({
      ...this.colony.resources,
      oxygen: Math.round(oxygen * 0.75),
      water: Math.round(water * 0.75),
      energy: Math.round(energy * 0.75),
      food: Math.round(food * 0.75),
    }, this.colony.resources);

    this.colony.crew = [
      ...this.colony.crew,
      ...JSON.parse(JSON.stringify(EXPANDED_CREW_MEMBERS)),
    ];
    this.colony.populationExpanded = true;
    this.unlockAchievement('crew_expansion');

    return { success: true };
  }

  // Activate Historical Crisis
  public setHistoricalCrisis(crisisId: string): void {
    const crisis = HISTORICAL_CRISES.find(c => c.id === crisisId);
    if (!crisis) throw new Error(`Crisis ${crisisId} not found`);

    this.activeCrisis = crisis;
    this.location = crisis.location;
    this.colony.currentDay = 1;
    this.colony.missionCompleted = false;
    this.colony.resources = clampResources({
      ...this.colony.resources,
      ...crisis.initialOverrides,
    });
    this.colony.radiationActive = crisis.specialCondition === 'extreme_radiation';
    this.colony.dustStormActive = crisis.specialCondition === 'solar_blackout';
  }

  // Telemetry Debrief Average Health
  public getAverageCrewHealth(): number {
    if (!this.colony.crew || this.colony.crew.length === 0) return 0;
    const sum = this.colony.crew.reduce((acc, c) => acc + c.health, 0);
    return Math.round(sum / this.colony.crew.length);
  }
}
