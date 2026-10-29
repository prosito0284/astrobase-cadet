export type BaseLocation = 'moon' | 'mars';

export type GameDifficulty = 'facil' | 'normal';

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
  batteryFault: boolean;
  batteryLockoutTurns: number;
  assignedToMine: string[]; // IDs of astronauts assigned to the ice mine
}
