export type BaseLocation = 'moon' | 'mars';

export type GameDifficulty = 'facil' | 'normal' | 'dificil';

export type CrewStatus = 'alive' | 'critical' | 'deceased';

export interface Astronaut {
  id: string;
  name: string;
  role: string;
  avatar: string;
  health: number; // 0 - 100
  morale: number; // 0 - 100
  status: CrewStatus;
  causeOfDeath?: string;
  skills: string;
  quote: string;
  isAssignedToMine?: boolean;
  isShockDisabledDays?: number; // Inability to perform tasks after electrical shock
}

export interface ResourceState {
  oxygen: number;        // kg or % (0-100)
  maxOxygen: number;
  water: number;         // Liters (0-100)
  maxWater: number;
  energy: number;        // kWh stored (0-100)
  maxEnergy: number;
  energyProduction: number; // kW
  energyConsumption: number; // kW
  food: number;          // Rations (0-100)
  maxFood: number;
  radiationExposure: number; // Cumulative mSv
  shieldIntegrity: number;   // 0 - 100%
  sciencePoints: number;     // Scientific discoveries made
  maxSciencePoints?: number; // Upper ceiling for science points (default: 500)
}

export interface BaseModule {
  id: string;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  category: 'life_support' | 'power' | 'science' | 'habitat' | 'defense';
  level: number;
  maxLevel: number;
  isActive: boolean;
  powerRequired: number; // kW
  oxygenDelta: number;   // kg/turn
  waterDelta: number;    // L/turn
  foodDelta: number;     // units/turn
  shieldDelta: number;   // shield %
  scienceDelta: number;  // science/turn
  healthStatus: number;  // 0 - 100%
  icon: string;
}

export interface NasaDataSetCard {
  id: string;
  source: 'DONKI' | 'OSDR' | 'ARTEMIS' | 'MEDA';
  sourceFullName: string;
  title: string;
  titleEs: string;
  dateOrId: string;
  summaryEs: string;
  summaryEn: string;
  realDataValue: string;
  scientificImpact: string;
  scientificImpactEs: string;
  url: string;
  badgeColor: string;
}

export interface MissionEventOption {
  labelEs: string;
  labelEn: string;
  descriptionEs: string;
  descriptionEn: string;
  resourceDeltas: Partial<ResourceState>;
  crewHealthDelta?: number;
  crewMoraleDelta?: number;
  educationalTakeawayEs: string;
  educationalTakeawayEn: string;
  nasaDataId?: string;
}

export interface MissionEvent {
  id: string;
  titleEs: string;
  titleEn: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'radiation' | 'weather' | 'system' | 'science' | 'biology';
  descriptionEs: string;
  descriptionEn: string;
  icon: string;
  nasaReference?: {
    source: string;
    datasetId: string;
    realFactEs: string;
    realFactEn: string;
  };
  options: MissionEventOption[];
}

export interface MissionScenario {
  id: string;
  titleEs: string;
  titleEn: string;
  location: BaseLocation;
  subtitleEs: string;
  subtitleEn: string;
  descriptionEs: string;
  descriptionEn: string;
  commDelaySeconds: number;
  commDelayTextEs: string;
  commDelayTextEn: string;
  targetDays: number;
  initialResources: ResourceState;
  environmentalNotesEs: string[];
  environmentalNotesEn: string[];
}

export interface ColonySaveData {
  currentDay: number;
  resources: ResourceState;
  modules: BaseModule[];
  crew: Astronaut[];
  radiationActive: boolean;
  dustStormActive: boolean;
  isLunarNight: boolean;
  currentTemperatureCelsius: number;
  isTemperatureExtreme: boolean;
  isCommBlackout: boolean;
  solarFluctuation: boolean;
  emergencyO2Active: boolean;
  emergencyO2Charges?: number;   // Consumable canister charges (max 2 per mission)
  roverSortiesToday?: number;     // Number of sorties dispatched in current Sol (max 2)
  hasHarvestedToday?: boolean;   // Whether crops were harvested during current Sol
  hasQuizCompletedToday?: boolean; // Whether NASA quiz bonus was claimed during current Sol
  batteryFault: boolean;
  batteryFaultCount: number;
  batteryLockoutSeconds: number; // 5s critical battery overload lock
  batteryLockoutTurns: number;
  wiringErrorActive: boolean;    // Sudden light drop caused by wiring error
  sandstormEnergyHaltDays: number; // Martian sandstorm disabling energy for 1 day
  plantsNeedDoubleWaterOnce: boolean; // Solar flare consequence: double water for 1 crop cycle
  plantsWipedGrowth: boolean;    // Solar flare consequence: crop growth reset
  empStunSeconds: number;        // 1s task freeze on solar flare
  populationExpanded: boolean;   // True if expanded from 4 to 6 on Day 15
  assignedToMine: string[];      // IDs of astronauts assigned to the ice mine
  difficulty?: GameDifficulty;   // Difficulty locked to this base
  missionCompleted?: boolean;    // True if mission was accomplished
  lastEventDay?: number;         // Sol when the last major mission event occurred
  lastSolarFlareDay?: number;    // Sol when the last solar flare occurred
  lastEventId?: string;          // ID of the last triggered event (to prevent back-to-back duplicate modals)
  builtBuildings?: BaseBuildingId[]; // Constructed 3D base expansion structures
}

export type BaseBuildingId = 'rover_hangar' | 'greenhouse_2' | 'dsoc_tower';

export interface BaseBuildingEffects {
  batteryBonusPct?: number;       // +50% faster battery recharge
  laserRangeBonus?: number;       // +10m (from 25m to 35m) / +30m
  batteryCapacityBonus?: number;  // +25 kWh extended battery capacity
  extraCrewCapacity?: number;     // +4 crew (enabling up to 10 colonists)
  foodDelta?: number;             // +12 food/day or +2.5
  o2Delta?: number;               // +6 O2/day or +3.0
  scienceMultiplier?: number;     // 3x scientific telemetry transmission
}

export interface BaseBuildingDefinition {
  id: BaseBuildingId;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  costScience: number;
  defaultPosition: [number, number, number];
  effects: BaseBuildingEffects;
}


export interface Achievement {
  id: string;
  titleEs: string;
  titleEn: string;
  descriptionEs: string;
  descriptionEn: string;
  icon: string;
  unlockedAtDay?: number;
  unlocked: boolean;
}

export interface FlightLogEntry {
  id: string;
  day: number;
  timestamp: string;
  location: BaseLocation;
  type: 'info' | 'warning' | 'alert' | 'success' | 'event';
  messageEs: string;
  messageEn: string;
}

export interface CommanderProfile {
  name: string;
  callsign: string;
  patch: string;
}
