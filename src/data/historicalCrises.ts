export interface HistoricalCrisis {
  id: string;
  titleEs: string;
  titleEn: string;
  year: number;
  missionName: string;
  badgeText: string;
  location: 'moon' | 'mars';
  icon: string;
  descriptionEs: string;
  descriptionEn: string;
  nasaDatasetRef: string;
  targetDays: number;
  objectiveEs: string;
  objectiveEn: string;
  initialOverrides: {
    oxygen: number;
    energy: number;
    water: number;
    food: number;
    shieldIntegrity: number;
    radiationExposure: number;
    sciencePoints: number;
  };
  specialCondition: 'extreme_radiation' | 'solar_blackout' | 'co2_emergency' | 'botanical_breakthrough';
}

export const HISTORICAL_CRISES: HistoricalCrisis[] = [
  {
    id: 'halloween_2003',
    titleEs: 'Tormenta Solar de Halloween de 2003',
    titleEn: 'The 2003 Halloween Solar Storms',
    year: 2003,
    missionName: 'ISS Expedición 8 & SOHO',
    badgeText: 'DONKI CLASE X28',
    location: 'moon',
    icon: '☀️',
    descriptionEs: 'A finales de octubre de 2003, el Sol desató una serie de fulguraciones gigantescas clasificadas hasta en X28 y eyecciones de masa coronal a más de 2.000 km/s. Los astronautas de la ISS tuvieron que refugiarse en el módulo de servicio Zvezda, el más blindado de la estación. Tu base lunar está en el camino de la tormenta sin atmósfera protectora.',
    descriptionEn: 'In late October 2003, the Sun unleashed extreme X28 class flares and CMEs topping 2,000 km/s. ISS Expedition 8 astronauts retreated to the heavily shielded Zvezda module. Your lunar base sits right in the firing line.',
    nasaDatasetRef: 'NASA DONKI Historical Archive & SOHO LASCO Coronagraph',
    targetDays: 7,
    objectiveEs: 'Sobrevive 7 días de bombardeo de protones solares manteniendo el blindaje por encima del 60% y preservando la salud de la tripulación.',
    objectiveEn: 'Survive 7 days of intense proton flux keeping shield integrity above 60% and protecting crew biology.',
    initialOverrides: {
      oxygen: 80,
      energy: 95,
      water: 70,
      food: 75,
      shieldIntegrity: 85,
      radiationExposure: 12,
      sciencePoints: 20,
    },
    specialCondition: 'extreme_radiation',
  },
  {
    id: 'opportunity_2018',
    titleEs: 'La Gran Tormenta Global de Marte (2018)',
    titleEn: 'The 2018 Global Martian Dust Storm',
    year: 2018,
    missionName: 'Rover Opportunity & MRO MARCI',
    badgeText: 'MEDA TAU > 10',
    location: 'mars',
    icon: '🌪️',
    descriptionEs: 'En junio de 2018, una gigantesca tormenta de polvo rodeó todo el planeta Marte. El polvo fino bloqueó más del 99% de la luz solar en el valle Perseverance, apagando las baterías del rover Opportunity tras 15 heroicos años. Tu base marciana debe racionar energía hasta que los cielos se aclaren.',
    descriptionEn: 'In June 2018, a planet-encircling dust storm blotted out over 99% of sunlight in Perseverance Valley, cutting off solar arrays. Your Martian outpost must survive extreme brownout conditions.',
    nasaDatasetRef: 'Mars Reconnaissance Orbiter (MRO) & Mars 2020 MEDA Data',
    targetDays: 8,
    objectiveEs: 'Administra tus baterías durante 8 soles de oscuridad solar apagando módulos prescindibles sin que el soporte vital se congele.',
    objectiveEn: 'Ration energy across 8 sunless sols by disabling non-critical systems while keeping thermal life support online.',
    initialOverrides: {
      oxygen: 75,
      energy: 40, // Low battery at start!
      water: 60,
      food: 70,
      shieldIntegrity: 70,
      radiationExposure: 6,
      sciencePoints: 30,
    },
    specialCondition: 'solar_blackout',
  },
  {
    id: 'veggie_harvest_2015',
    titleEs: 'Misión Veggie-01: El Primer Cultivo en la ISS (2015)',
    titleEn: 'Veggie-01: First Space Harvest on the ISS',
    year: 2015,
    missionName: 'ISS Expedición 44 (Scott Kelly & Kjell Lindgren)',
    badgeText: 'OSDR OSD-379',
    location: 'moon',
    icon: '🥬',
    descriptionEs: 'El astronauta Scott Kelly cosechó y probó por primera vez lechuga romana roja "Outredgeous" cultivada en microgravedad con luces LED rojas y azules. La tripulación aprendió a combatir los hongos en las raíces y demostró que la comida fresca multiplica la salud mental de los exploradores espaciales.',
    descriptionEn: 'Astronaut Scott Kelly harvested and consumed the first space-grown Outredgeous red romaine lettuce on the ISS. The crew overcame microgravity root mold and proved fresh greens revolutionize space psychology.',
    nasaDatasetRef: 'NASA OSDR Accession OSD-379 & OSD-120 (Veggie System)',
    targetDays: 6,
    objectiveEs: 'Optimiza la fotosíntesis del invernadero, produce 90 unidades de alimento fresco y eleva la moral de la tripulación al 100%.',
    objectiveEn: 'Optimize hydroponic photoperiods, produce 90 food units, and boost crew morale to 100%.',
    initialOverrides: {
      oxygen: 85,
      energy: 90,
      water: 85,
      food: 45, // Needs immediate cultivation
      shieldIntegrity: 80,
      radiationExposure: 4,
      sciencePoints: 25,
    },
    specialCondition: 'botanical_breakthrough',
  },
  {
    id: 'apollo_13_scrubber',
    titleEs: 'Apolo 13: La Crisis de CO2 y el Filtro Cuadrado (1970)',
    titleEn: 'Apollo 13: The Square LiOH Scrubber Hack',
    year: 1970,
    missionName: 'Apolo 13 (Lovell, Swigert, Haise)',
    badgeText: 'ECLSS EMERGENCIA',
    location: 'moon',
    icon: '⚠️',
    descriptionEs: 'Tras la explosión del tanque de oxígeno número 2, la tripulación se refugió en el módulo lunar Acuario. Pero los filtros de hidróxido de litio (LiOH) redondos se agotaron y los cartuchos de repuesto del módulo de mando eran cuadrados. Con cinta adhesiva, cartones y una manguera de traje espacial, los ingenieros de Houston salvaron a la tripulación antes de que el CO2 fuera letal.',
    descriptionEn: 'Following an oxygen tank explosion, the crew moved into Lunar Module Aquarius. But round LiOH scrubbers depleted while command module spares were square. Houston engineers improvised an adapter using tape, cardboard, and flight manuals.',
    nasaDatasetRef: 'NASA Apollo 13 Mission Flight Transcript & ECLSS Engineering Log',
    targetDays: 5,
    objectiveEs: 'Repara y mantén activo el reciclador de oxígeno y depurador de CO2 durante 5 días críticos con recursos mínimos de agua y energía.',
    objectiveEn: 'Repair and maintain active oxygen scrubbers across 5 critical days under severe energy and water constraints.',
    initialOverrides: {
      oxygen: 45, // Critical O2 start!
      energy: 35, // Very low power!
      water: 40,
      food: 60,
      shieldIntegrity: 70,
      radiationExposure: 5,
      sciencePoints: 15,
    },
    specialCondition: 'co2_emergency',
  },
];
