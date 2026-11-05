import { BaseLocation } from '../types/game';

export interface SpecimenBonus {
  scienceBonusPct: number;       // e.g. +8% to +10% science multiplier
  moraleBonus: number;           // e.g. +2 to +5 morale points
  shieldBonusPct?: number;       // passive habitat/radiation shielding buff
  waterEfficiencyBonusPct?: number; // passive ECLSS water recycling buff
}

export interface GeologicalSpecimen {
  id: string;
  nameEs: string;
  nameEn: string;
  subnameEs: string;
  subnameEn: string;
  location: BaseLocation;
  nasaMissionRef: string;
  sampleCatalogId: string;
  discoveryDate: string;
  geologicalAge: string;
  chemicalFormula: string;
  mineralCompositionEs: string;
  mineralCompositionEn: string;
  astrobiologicalSignificanceEs: string;
  astrobiologicalSignificanceEn: string;
  scientificFactEs: string;
  scientificFactEn: string;
  stackingBonus: SpecimenBonus;
  visuals: {
    geometryType: 'polyhedron' | 'octahedron' | 'dodecahedron' | 'icosahedron' | 'tetrahedron' | 'prism';
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    roughness: number;
    metalness: number;
    icon: string;
  };
}

export interface CabinetBonuses {
  totalScienceBonusPct: number;
  scienceMultiplier: number;
  totalMoraleBonus: number;
  totalShieldBonusPct: number;
  totalWaterEfficiencyBonusPct: number;
  discoveredCount: number;
}

/**
 * Authentic NASA Astromaterials Database for Moon & Mars
 * References: NASA Astromaterials Curation (JSC), Apollo Sample Compendium,
 * Mars 2020 Perseverance PIXL/SHERLOC, MSL Curiosity CheMin/SAM, LCROSS/LRO.
 */
export const GEOLOGICAL_SAMPLES: Record<string, GeologicalSpecimen> = {
  // =========================================================================
  // MOON ASTROMATERIALS
  // =========================================================================
  lunar_basalt: {
    id: 'lunar_basalt',
    nameEs: 'Basalto Lunar Ilmenítico',
    nameEn: 'Titanium-Rich Lunar Mare Basalt',
    subnameEs: 'Muestra Apollo 11 · Mare Tranquillitatis',
    subnameEn: 'Apollo 11 Mare Sample · Mare Tranquillitatis',
    location: 'moon',
    nasaMissionRef: 'NASA Apollo 11 Lunar Sample Return (1969)',
    sampleCatalogId: 'Apollo 11 Sample 10049 / 10017',
    discoveryDate: '20 de julio de 1969',
    geologicalAge: '3.70 ± 0.05 Ga (Mil millones de años)',
    chemicalFormula: 'FeTiO₃ + Ca(Mg,Fe)Si₂O₆ + (Ca,Na)(Al,Si)₄O₈',
    mineralCompositionEs: 'Ilmenita con alto titanio (10-13 wt% TiO₂), piroxeno augita, feldespato plagioclasa y olivino ferroso.',
    mineralCompositionEn: 'High-titanium ilmenite (10-13 wt% TiO₂), clinopyroxene augite, plagioclase feldspar, and olivine.',
    astrobiologicalSignificanceEs: 'Cristalizado en enfriamiento rápido en el vacío absoluto tras erupciones volcánicas lunares tempranas. Su abundancia de óxido de hierro y titanio es la base óptima para extracción in-situ de O₂ y blindaje pasivo contra partículas solares de alta energía (SPE).',
    astrobiologicalSignificanceEn: 'Formed by rapid vacuum cooling of lunar mare basalts. Ilmenite provides an optimal feed for in-situ oxygen extraction and passive radiation mass shielding against solar proton events.',
    scientificFactEs: 'El basalto recolectado por Armstrong y Aldrin demostró que el manto lunar albergaba vulcanismo basáltico colosal y carecía por completo de minerales hidratados.',
    scientificFactEn: 'Apollo 11 mare basalt proved the Moon underwent massive volcanic flood basalt events ~3.7 billion years ago in hyper-dry conditions.',
    stackingBonus: {
      scienceBonusPct: 8,
      moraleBonus: 3,
      shieldBonusPct: 15,
    },
    visuals: {
      geometryType: 'polyhedron',
      primaryColor: '#1e293b',
      secondaryColor: '#475569',
      accentColor: '#38bdf8',
      roughness: 0.85,
      metalness: 0.35,
      icon: '🪨',
    },
  },

  anorthosite_genesis: {
    id: 'anorthosite_genesis',
    nameEs: 'Anortosita "Roca del Génesis"',
    nameEn: 'Genesis Rock Ferroan Anorthosite',
    subnameEs: 'Muestra Apollo 15 (15415) · Rima Hadley',
    subnameEn: 'Apollo 15 Sample 15415 · Hadley Rille',
    location: 'moon',
    nasaMissionRef: 'NASA Apollo 15 Lunar Highlands (1971)',
    sampleCatalogId: 'NASA Lunar Specimen #15415',
    discoveryDate: '1 de agosto de 1971',
    geologicalAge: '4.10 ± 0.08 Ga (Corteza primordial lunar)',
    chemicalFormula: 'CaAl₂Si₂O₈ (98% Plagioclasa anortita)',
    mineralCompositionEs: 'Plagioclasa anortítica pura (>98%), con microinclusiones vítreas de piroxeno y olivino magnesiano.',
    mineralCompositionEn: 'Almost pure anorthite plagioclase feldspar (>98%), with trace pyroxene and olivine micro-inclusions.',
    astrobiologicalSignificanceEs: 'Fragmento de la corteza primordial de las tierras altas lunares. Valida la teoría del Océano de Magma Lunar (LMO): la plagioclasa ligera flotó hacia la superficie mientras los minerales densos descendían al núcleo.',
    astrobiologicalSignificanceEn: 'Direct relic of the Moon’s primordial crust, confirming the Lunar Magma Ocean hypothesis where plagioclase floated as scum atop liquid magma.',
    scientificFactEs: 'Descubierta por los astronautas David Scott y James Irwin en las laderas del Monte Hadley; es una de las rocas magmáticas más antiguas y puras conservadas en el Sistema Solar.',
    scientificFactEn: 'Recovered by Apollo 15 astronauts David Scott and James Irwin at Spur Crater; pristine survivor of the Late Heavy Bombardment.',
    stackingBonus: {
      scienceBonusPct: 10,
      moraleBonus: 5,
      shieldBonusPct: 10,
    },
    visuals: {
      geometryType: 'dodecahedron',
      primaryColor: '#e2e8f0',
      secondaryColor: '#94a3b8',
      accentColor: '#67e8f9',
      roughness: 0.45,
      metalness: 0.2,
      icon: '💎',
    },
  },

  polar_ice_core: {
    id: 'polar_ice_core',
    nameEs: 'Núcleo de Hielo Criogénico Polar',
    nameEn: 'Cryogenic PSR Polar Ice Core',
    subnameEs: 'Trampa Fría Cráter Shackleton · LCROSS / VIPER',
    subnameEn: 'Shackleton Cold Trap · LCROSS / VIPER',
    location: 'moon',
    nasaMissionRef: 'NASA LCROSS & VIPER Rover Mission (Polo Sur)',
    sampleCatalogId: 'NASA LRO Diviner PSR Core CABR-1',
    discoveryDate: '9 de octubre de 2009 (Impacto LCROSS) / VIPER In-Situ',
    geologicalAge: 'Preservado a 40 Kelvin (-233 °C) durante ~2.2 Ga',
    chemicalFormula: 'H₂O + CO + CO₂ + CH₄ + NH₃ + H₂S',
    mineralCompositionEs: 'Hielo amorfo criogénico (5.5 wt% H₂O libre en regolito), dióxido de carbono, compuestos orgánicos volátiles simples e hidrocarburos livianos.',
    mineralCompositionEn: 'Cryogenic amorphous water ice (5.5 wt% bound in regolith), carbon monoxide, methane, and comet-delivered volatiles.',
    astrobiologicalSignificanceEs: 'Cápsula de tiempo química inalterada depositada por impactos de cometas primitivos en zonas de sombra permanente (PSR). Proporciona los bloques químicos prebióticos del origen de la vida y agua vital para el sistema de soporte vital.',
    astrobiologicalSignificanceEn: 'Pristine volatile time capsule from primordial cometary impacts into permanent cold traps; provides chemical precursors for astrobiology and ECLSS closed-loop water autonomy.',
    scientificFactEs: 'La sonda de impacto LCROSS expulsó más de 150 kg de vapor de agua al espacio al golpear la oscuridad perpetua del cráter Cabeus a 9.000 km/h.',
    scientificFactEn: 'LCROSS plume analysis confirmed pure cryogenic water ice, sulfur compounds, and simple organics trapped in South Pole craters at -233 °C.',
    stackingBonus: {
      scienceBonusPct: 10,
      moraleBonus: 4,
      waterEfficiencyBonusPct: 20,
    },
    visuals: {
      geometryType: 'icosahedron',
      primaryColor: '#0ea5e9',
      secondaryColor: '#38bdf8',
      accentColor: '#e0f2fe',
      roughness: 0.2,
      metalness: 0.6,
      icon: '🧊',
    },
  },

  // =========================================================================
  // MARS ASTROMATERIALS
  // =========================================================================
  jezero_clay: {
    id: 'jezero_clay',
    nameEs: 'Arcillas Esmectitas de Jezero',
    nameEn: 'Jezero Delta Smectite Phyllosilicates',
    subnameEs: 'Delta Fluvial Cráter Jezero · Muestra Perseverance',
    subnameEn: 'Jezero River Delta · Mars 2020 Perseverance',
    location: 'mars',
    nasaMissionRef: 'NASA Mars 2020 Perseverance Rover PIXL / SHERLOC',
    sampleCatalogId: 'Perseverance Roubion / Belva Core #03',
    discoveryDate: '18 de febrero de 2021 (Aterrizaje) / Sol 198',
    geologicalAge: '3.82 ± 0.04 Ga (Periodo Noeico / Hespérico)',
    chemicalFormula: '(Na,Ca)₀.₃₃(Al,Mg)₂(Si₄O₁₀)(OH)₂·nH₂O',
    mineralCompositionEs: 'Filosilicatos esmectíticos ricos en Fe/Mg (nontronita), carbonatos hidratados de calcio y minerales arcillosos deltaicos.',
    mineralCompositionEn: 'Iron/magnesium-rich smectite phyllosilicates (nontronite), hydrated calcium carbonates, and delta mudstones.',
    astrobiologicalSignificanceEs: 'Principal objetivo de astrobiología planetaria: las arcillas deltaicas formadas en aguas neutras de lagos milenarios tienen el potencial más alto para encapsular y preservar biofirmas fósiles y aminoácidos extraterrestres.',
    astrobiologicalSignificanceEn: 'Prime candidate for ancient biosignatures: lacustrine smectites formed in neutral-pH liquid water preserve microbial structures and organic molecules for billions of years.',
    scientificFactEs: 'El espectrómetro SHERLOC de Perseverance detectó firmas de fluorescencia aromática en estas arcillas, indicando la presencia de anillos moleculares de carbono.',
    scientificFactEn: 'Perseverance PIXL and SHERLOC confirmed deep aqueous alteration and organic aromatic compounds trapped within delta strata.',
    stackingBonus: {
      scienceBonusPct: 10,
      moraleBonus: 5,
      shieldBonusPct: 5,
    },
    visuals: {
      geometryType: 'octahedron',
      primaryColor: '#b45309',
      secondaryColor: '#d97706',
      accentColor: '#fef3c7',
      roughness: 0.7,
      metalness: 0.2,
      icon: '🏺',
    },
  },

  basaltic_shergottite: {
    id: 'basaltic_shergottite',
    nameEs: 'Shergottita Basáltica Ígnea',
    nameEn: 'Igneous Basaltic Shergottite',
    subnameEs: 'Corteza Volcánica de Tharsis · MAVEN / EETA79001',
    subnameEn: 'Tharsis Volcanic Shield · MAVEN / EETA79001',
    location: 'mars',
    nasaMissionRef: 'NASA Mars Odyssey GRS & Martian Meteorite Survey',
    sampleCatalogId: 'NASA Mars Meteorite Compendium EETA79001-A',
    discoveryDate: 'Identificación atmosférica de gases nobles (Curiosity SAM)',
    geologicalAge: '180 Ma (Cristalización) · 3 Ma (Eyección por impacto)',
    chemicalFormula: '(Fe,Mg)SiO₃ + CaAl₂Si₂O₈ (Vidrio Maskelinita)',
    mineralCompositionEs: 'Pigeonita, augita zonada, vidrio de plagioclasa por impacto de choque (maskelinita) y trazas de titanomagnetita.',
    mineralCompositionEn: 'Clinopyroxene (pigeonite, augite), maskelynite (shock-amorphized plagioclase glass), and titanomagnetite.',
    astrobiologicalSignificanceEs: 'Las vesículas de vidrio formadas durante el impacto albergan burbujas intactas de la atmósfera marciana antigua, permitiendo calcular la tasa de pérdida de atmósfera al espacio.',
    astrobiologicalSignificanceEn: 'Shock glass melt veins encapsulated pristine pockets of Mars atmosphere, providing isotopic ratios confirming volcanic magma differentiation.',
    scientificFactEs: 'La firma isotópica de xenón y argón atrapada en las shergottitas coincidió al 100% con los datos de las sondas Viking 1 y 2, confirmando su origen marciano.',
    scientificFactEn: 'Noble gas ratios in shergottite shock melt matched NASA Viking lander atmospheric telemetry, confirming meteorites arrived from Mars.',
    stackingBonus: {
      scienceBonusPct: 8,
      moraleBonus: 3,
      shieldBonusPct: 10,
    },
    visuals: {
      geometryType: 'polyhedron',
      primaryColor: '#7f1d1d',
      secondaryColor: '#991b1b',
      accentColor: '#fca5a5',
      roughness: 0.8,
      metalness: 0.4,
      icon: '🌋',
    },
  },

  sulfate_hydrate: {
    id: 'sulfate_hydrate',
    nameEs: 'Sulfatos Hidratados y Yeso Evaporítico',
    nameEn: 'Hydrated Sulfate Evaporite Mineral',
    subnameEs: 'Estratos de Monte Sharp · Curiosity CheMin',
    subnameEn: 'Mount Sharp Strata · MSL Curiosity CheMin',
    location: 'mars',
    nasaMissionRef: 'NASA Mars Science Laboratory Curiosity Rover (Cráter Gale)',
    sampleCatalogId: 'MSL Curiosity Drill Core "Cumberland" / "Duluth"',
    discoveryDate: '6 de agosto de 2012 (Aterrizaje) / Sol 279',
    geologicalAge: '3.40 ± 0.10 Ga (Transición Hespérica a Amazónica)',
    chemicalFormula: 'CaSO₄·2H₂O (Yeso) + MgSO₄·7H₂O (Epsomita)',
    mineralCompositionEs: 'Sulfato de calcio dihidratado (yeso puro cristalizado en vetas), bassanita, sulfatos polihidratados de magnesio y hematita.',
    mineralCompositionEn: 'Calcium sulfate dihydrate (gypsum fracture veins), bassanite, polyhydrated magnesium sulfate, and hematite.',
    astrobiologicalSignificanceEs: 'Registro geológico directo del momento en que Marte pasó de ser un mundo cálido y húmedo a un desierto frío. Las redes cristalinas encierran agua químicamente ligada capaz de ser extraída por desorción térmica a 300 °C.',
    astrobiologicalSignificanceEn: 'Direct geological fingerprint of the desiccation of Mars; crystal lattices trap molecular water accessible by thermal extraction.',
    scientificFactEs: 'El difractómetro de rayos X CheMin de Curiosity demostró que los sulfatos precipitaron a partir de salmueras subterráneas tardías enriquecidas en azufre.',
    scientificFactEn: 'Curiosity’s CheMin instrument identified pure veins of gypsum crystallizing from ancient evaporating groundwater systems.',
    stackingBonus: {
      scienceBonusPct: 7,
      moraleBonus: 3,
      waterEfficiencyBonusPct: 15,
    },
    visuals: {
      geometryType: 'prism',
      primaryColor: '#c2410c',
      secondaryColor: '#ea580c',
      accentColor: '#fed7aa',
      roughness: 0.35,
      metalness: 0.15,
      icon: '🧂',
    },
  },
};

// ============================================================================
// LEGACY BACKWARD COMPATIBILITY ALIASES
// Maps prototype sprintHarness keys to authentic astromaterials catalog
// ============================================================================
export const LEGACY_SAMPLE_ALIASES: Record<string, string> = {
  polar_ice_cores: 'polar_ice_core',
  lunar_basalts: 'lunar_basalt',
  jezero_clays_biofirmas: 'jezero_clay',
};

/**
 * Resolves a sample ID to its canonical entry, supporting aliases
 */
export function getGeologicalSample(id: string): GeologicalSpecimen | undefined {
  if (!id) return undefined;
  const canonicalId = LEGACY_SAMPLE_ALIASES[id] || id;
  return GEOLOGICAL_SAMPLES[canonicalId];
}

/**
 * Checks whether a given string is a valid sample ID or recognized alias
 */
export function isValidGeologicalSampleId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  const canonicalId = LEGACY_SAMPLE_ALIASES[id] || id;
  return canonicalId in GEOLOGICAL_SAMPLES;
}

/**
 * Returns all cataloged specimens for a specific celestial body
 */
export function getSamplesByLocation(location: BaseLocation): GeologicalSpecimen[] {
  return Object.values(GEOLOGICAL_SAMPLES).filter(s => s.location === location);
}

/**
 * Calculates total cumulative stacking bonuses for an array of sample IDs
 */
export function calculateCabinetBonuses(sampleIds: string[]): CabinetBonuses {
  let totalScienceBonusPct = 0;
  let totalMoraleBonus = 0;
  let totalShieldBonusPct = 0;
  let totalWaterEfficiencyBonusPct = 0;

  if (!Array.isArray(sampleIds) || sampleIds.length === 0) {
    return {
      totalScienceBonusPct: 0,
      scienceMultiplier: 1.0,
      totalMoraleBonus: 0,
      totalShieldBonusPct: 0,
      totalWaterEfficiencyBonusPct: 0,
      discoveredCount: 0,
    };
  }

  // Iterate over each sample in cabinet (supports both unique and stacking)
  let validCount = 0;
  for (const id of sampleIds) {
    const sample = getGeologicalSample(id);
    if (!sample) continue;
    validCount++;
    totalScienceBonusPct += sample.stackingBonus.scienceBonusPct;
    totalMoraleBonus += sample.stackingBonus.moraleBonus;
    if (sample.stackingBonus.shieldBonusPct) {
      totalShieldBonusPct += sample.stackingBonus.shieldBonusPct;
    }
    if (sample.stackingBonus.waterEfficiencyBonusPct) {
      totalWaterEfficiencyBonusPct += sample.stackingBonus.waterEfficiencyBonusPct;
    }
  }

  return {
    totalScienceBonusPct,
    scienceMultiplier: 1.0 + (totalScienceBonusPct / 100),
    totalMoraleBonus,
    totalShieldBonusPct,
    totalWaterEfficiencyBonusPct,
    discoveredCount: validCount,
  };
}

/**
 * Probabilistic roll trigger for rover mining or expedition returns
 * @param location 'moon' | 'mars'
 * @param targetId optional sortie target or node identifier
 * @param rollRandom deterministic number [0, 1) for testing, defaults to Math.random()
 */
export function rollGeologicalSample(
  location: BaseLocation,
  targetId?: string,
  rollRandom: number = Math.random()
): GeologicalSpecimen | null {
  // 40% probability threshold for rare NASA specimen discovery
  if (rollRandom > 0.40) {
    return null;
  }

  if (location === 'moon') {
    if (targetId === 'shackleton_ice' || targetId === 'shackleton_rim' || targetId === 'water') {
      return GEOLOGICAL_SAMPLES['polar_ice_core'];
    }
    if (targetId === 'lava_tube_cave' || targetId === 'shield') {
      return GEOLOGICAL_SAMPLES['lunar_basalt'];
    }
    if (targetId === 'eternal_light_ridge' || targetId === 'science') {
      return GEOLOGICAL_SAMPLES['anorthosite_genesis'];
    }

    // Default distribution based on normalized roll [0, 0.40]
    const subRoll = rollRandom / 0.40;
    if (subRoll < 0.35) return GEOLOGICAL_SAMPLES['polar_ice_core'];
    if (subRoll < 0.70) return GEOLOGICAL_SAMPLES['lunar_basalt'];
    return GEOLOGICAL_SAMPLES['anorthosite_genesis'];
  } else {
    // Mars
    if (targetId === 'jezero_delta' || targetId === 'science') {
      return GEOLOGICAL_SAMPLES['jezero_clay'];
    }
    if (targetId === 'dune_field_clean' || targetId === 'shield') {
      return GEOLOGICAL_SAMPLES['basaltic_shergottite'];
    }
    if (targetId === 'hydrated_sulfates' || targetId === 'water') {
      return GEOLOGICAL_SAMPLES['sulfate_hydrate'];
    }

    // Default distribution based on normalized roll [0, 0.40]
    const subRoll = rollRandom / 0.40;
    if (subRoll < 0.35) return GEOLOGICAL_SAMPLES['jezero_clay'];
    if (subRoll < 0.70) return GEOLOGICAL_SAMPLES['basaltic_shergottite'];
    return GEOLOGICAL_SAMPLES['sulfate_hydrate'];
  }
}
