import React, { useState, useEffect } from 'react';
import { 
  BaseLocation, 
  GameDifficulty, 
  ResourceState, 
  BaseModule, 
  MissionEvent, 
  MissionEventOption, 
  Astronaut,
  CrewStatus,
  ColonySaveData 
} from './types/game';
import { SCENARIOS } from './data/scenarios';
import { INITIAL_MODULES } from './data/modules';
import { INITIAL_CREW } from './data/crew';
import { MISSION_EVENTS } from './data/events';
import { HISTORICAL_CRISES, HistoricalCrisis } from './data/historicalCrises';
import { Navbar } from './components/Navbar';
import { ResourceDashboard } from './components/ResourceDashboard';
import { BaseView } from './components/BaseView';
import { ModuleControl } from './components/ModuleControl';
import { CommCenter } from './components/CommCenter';
import { CrewPanel } from './components/CrewPanel';
import { EventModal } from './components/EventModal';
import { ScienceDossierModal } from './components/ScienceDossierModal';
import { TutorialGuide } from './components/TutorialGuide';
import { MissionReportModal } from './components/MissionReportModal';
import { BotanicalLabModal } from './components/BotanicalLabModal';
import { RoverMissionModal } from './components/RoverMissionModal';
import { HistoricalCrisesModal } from './components/HistoricalCrisesModal';
import { NasaQuizModal } from './components/NasaQuizModal';
import { GameOverModal } from './components/GameOverModal';
import { CommMiniGameModal } from './components/CommMiniGameModal';
import { OxygenEmergencyBanner } from './components/OxygenEmergencyBanner';
import { soundFx } from './utils/audio';
import { spaceVoice } from './utils/speech';
import confetti from 'canvas-confetti';
import { Sparkles, Thermometer, AlertTriangle, WifiOff } from 'lucide-react';

const createInitialColonyData = (loc: BaseLocation): ColonySaveData => {
  const scen = SCENARIOS.find(s => s.location === loc) || SCENARIOS[0];
  return {
    currentDay: 1,
    resources: { ...scen.initialResources },
    modules: JSON.parse(JSON.stringify(INITIAL_MODULES)),
    crew: JSON.parse(JSON.stringify(INITIAL_CREW)),
    radiationActive: false,
    dustStormActive: false,
    isLunarNight: false,
    currentTemperatureCelsius: loc === 'moon' ? 120 : 15,
    isTemperatureExtreme: false,
    isCommBlackout: false,
    solarFluctuation: false,
    emergencyO2Active: false,
  };
};

export function App() {
  const [lang, setLang] = useState<'es' | 'en'>('es');
  const [location, setLocation] = useState<BaseLocation>('moon');
  const [difficulty, setDifficulty] = useState<GameDifficulty>('normal');
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>('life_support');

  // INDEPENDENT PERSISTENT COLONY STATE (MOON & MARS MAINTAIN SEPARATE PROGRESS)
  const [colonies, setColonies] = useState<{ moon: ColonySaveData; mars: ColonySaveData }>(() => {
    try {
      const saved = localStorage.getItem('astrobase_dual_save_v3');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return {
      moon: createInitialColonyData('moon'),
      mars: createInitialColonyData('mars'),
    };
  });

  // Current active colony state
  const currentColony = colonies[location];
  const currentScenario = SCENARIOS.find(s => s.location === location) || SCENARIOS[0];

  // Active crisis state
  const [activeCrisis, setActiveCrisis] = useState<HistoricalCrisis | null>(null);

  // Modals & UI
  const [currentEvent, setCurrentEvent] = useState<MissionEvent | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isBotanicalLabOpen, setIsBotanicalLabOpen] = useState(false);
  const [isRoverMissionOpen, setIsRoverMissionOpen] = useState(false);
  const [isHistoricalCrisesOpen, setIsHistoricalCrisesOpen] = useState(false);
  const [isNasaQuizOpen, setIsNasaQuizOpen] = useState(false);
  const [isGameOverOpen, setIsGameOverOpen] = useState(false);
  const [gameOverCause, setGameOverCause] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Save to localStorage whenever colonies state changes
  useEffect(() => {
    try {
      localStorage.setItem('astrobase_dual_save_v3', JSON.stringify(colonies));
    } catch {
      // LocalStorage quota fallback
    }
  }, [colonies]);

  // Initial greeting
  useEffect(() => {
    const timer = setTimeout(() => {
      spaceVoice.speak(
        '¡Saludos, Comandante! Capcom NOVA en línea, desarrollado por el equipo Troncos Intergalácticos. Todos los sistemas de telemetría de la NASA están listos para la misión.'
      );
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Show Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Helper to mutate current active colony
  const updateCurrentColony = (updater: (prev: ColonySaveData) => ColonySaveData) => {
    setColonies(all => ({
      ...all,
      [location]: updater(all[location]),
    }));
  };

  // Toggle Voice
  const handleToggleVoice = () => {
    const next = !isVoiceEnabled;
    setIsVoiceEnabled(next);
    spaceVoice.setEnabled(next);
    if (next) {
      spaceVoice.speak('Voz de Capcom NOVA activada.');
    }
  };

  // Switch location handler WITHOUT LOSING DATA!
  const handleChangeLocation = (newLoc: BaseLocation) => {
    if (newLoc === location) return;
    setLocation(newLoc);
    setActiveCrisis(null);

    const destColony = colonies[newLoc];
    const announce = lang === 'es' 
      ? `Cambiando a base en ${newLoc === 'moon' ? 'la Luna (Día ' + destColony.currentDay + ')' : 'Marte (Sol ' + destColony.currentDay + ')'}. Datos conservados.` 
      : `Switched to ${newLoc === 'moon' ? 'Moon' : 'Mars'}. Session preserved.`;
    showToast(announce);
    spaceVoice.speak(announce);
  };

  // Toggle Module Power
  const handleToggleModule = (id: string) => {
    updateCurrentColony(prev => ({
      ...prev,
      modules: prev.modules.map(mod => {
        if (mod.id === id) {
          return { ...mod, isActive: !mod.isActive };
        }
        return mod;
      }),
    }));
  };

  // Upgrade Module Level
  const handleUpgradeModule = (id: string) => {
    const mod = currentColony.modules.find(m => m.id === id);
    if (!mod || mod.level >= mod.maxLevel) return;

    if (currentColony.resources.sciencePoints < 10) {
      const msg = lang === 'es' ? '¡Necesitas al menos 10 puntos de Ciencia para investigar la mejora!' : 'Need at least 10 Science points to upgrade!';
      showToast(msg);
      spaceVoice.speak(msg);
      return;
    }

    updateCurrentColony(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        sciencePoints: prev.resources.sciencePoints - 10,
      },
      modules: prev.modules.map(m => {
        if (m.id === id) {
          return { ...m, level: m.level + 1 };
        }
        return m;
      }),
    }));

    const upgradeMsg = lang === 'es' ? `¡Módulo ${mod.nameEs} mejorado al Nivel ${mod.level + 1}!` : `${mod.name} upgraded to Level ${mod.level + 1}!`;
    showToast(upgradeMsg);
    spaceVoice.speak(upgradeMsg);
  };

  // Advance Day / Sol simulation loop with all requested mechanics
  const handleAdvanceDay = () => {
    const maxDays = activeCrisis ? activeCrisis.targetDays : currentScenario.targetDays;

    if (currentColony.currentDay >= maxDays) {
      soundFx.playVictory();
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
      setIsReportOpen(true);
      spaceVoice.speak('¡Misión cumplida con éxito rotundo! Certificado de comandante emitido por la NASA.');
      return;
    }

    const nextDay = currentColony.currentDay + 1;

    // Weather & Lunar cycles
    const isNightNow = location === 'moon' && nextDay >= 10 && nextDay <= 18;
    const isDustNow = location === 'mars' && (nextDay >= 5 && nextDay <= 8 || activeCrisis?.specialCondition === 'solar_blackout');

    // 1. TEMPERATURE CYCLE (Moon: +120°C day / -180°C night | Mars: +20°C day / -85°C night)
    let currentTemp = 0;
    let isExtreme = false;

    if (location === 'moon') {
      currentTemp = isNightNow ? -180 : 120;
      isExtreme = isNightNow || currentTemp > 100;
    } else {
      // Mars diurnal swing
      currentTemp = (nextDay % 2 === 0) ? -85 : 20;
      isExtreme = currentTemp < -50;
    }

    // 2. SOLAR FLUCTUATIONS & COMM BLACKOUT PROBABILITY (Only in Normal difficulty)
    let hasSolarFluctuation = false;
    let hasCommBlackout = currentColony.isCommBlackout;

    if (difficulty === 'normal') {
      // 25% chance of solar brownout fluctuation
      hasSolarFluctuation = Math.random() < 0.25;
      // 20% chance of radio communication blackout if not already in blackout
      if (!hasCommBlackout && Math.random() < 0.20 && nextDay > 3) {
        hasCommBlackout = true;
        soundFx.playAlert();
        spaceVoice.speak('¡Alerta! Pérdida de señal con la Red de Espacio Profundo. Se requiere sintonizar la antena.');
      }
    }

    // 3. LIVING CREW & O2 / FOOD / WATER CONSUMPTION
    const livingCrew = currentColony.crew.filter(c => c.status !== 'deceased');
    const livingCount = livingCrew.length;

    // In Fácil: humans do NOT consume food or water, minimal O2
    // In Normal: O2 consumed strictly per living human (2.5 per person), water 3.5L per person, food 2.5 per person
    let crewO2Consumption = 0;
    let crewWaterConsumption = 0;
    let crewFoodConsumption = 0;

    if (difficulty === 'facil') {
      crewO2Consumption = livingCount * 1.0;
      crewWaterConsumption = 0; // "los humanos no neseciten comida ni agua"
      crewFoodConsumption = 0;  // "los humanos no neseciten comida ni agua"
    } else {
      crewO2Consumption = livingCount * 2.5; // O2 per living person!
      crewWaterConsumption = livingCount * 3.5;
      crewFoodConsumption = livingCount * 2.5;
    }

    // 4. MODULE EFFICIENCY & TEMPERATURE CYCLE
    // "que aya un siclo que baja y alta temperatura que afecten a todos los sistemas eseptuando a los sistemas de energia"
    let totalProd = 0;
    let totalCons = 0;
    let deltaO2 = 0;
    let deltaH2O = 0;
    let deltaFood = 0;
    let deltaShield = 0;
    let deltaScience = 0;

    currentColony.modules.forEach(mod => {
      if (!mod.isActive) return;

      // Energy systems (Solar & Battery) are EXEMPT from extreme temperature degradation!
      if (mod.id === 'solar_farm') {
        let efficiency = 1.0;
        if (hasSolarFluctuation) efficiency *= 0.6; // Light scarcity in normal mode

        if (isNightNow) {
          totalProd += 0;
        } else if (isDustNow) {
          totalProd += Math.abs(mod.powerRequired * mod.level * 0.25 * efficiency);
        } else {
          totalProd += Math.abs(mod.powerRequired * mod.level * efficiency);
        }
      } else if (mod.powerRequired > 0) {
        totalCons += mod.powerRequired * mod.level;
      }

      // Non-energy systems: affected by extreme temperature (25% efficiency penalty if extreme)
      const systemThermalEfficiency = (isExtreme && mod.category !== 'power' && difficulty === 'normal') ? 0.75 : 1.0;

      // Day / Night Plant Oxygen Cycle in Normal:
      // "que las plantas generen oxigeno pero tambien lo consuman"
      if (mod.id === 'greenhouse') {
        if (difficulty === 'normal' && isNightNow) {
          // At night, plants consume O2 via cellular respiration!
          deltaO2 += -2 * mod.level;
        } else {
          // Daytime photosynthesis generates O2
          deltaO2 += (difficulty === 'facil' ? 8 : mod.oxygenDelta) * mod.level * systemThermalEfficiency;
        }
        // More loot in easy mode!
        deltaFood += (difficulty === 'facil' ? 18 : mod.foodDelta) * mod.level * systemThermalEfficiency;
      } else {
        deltaO2 += mod.oxygenDelta * mod.level * systemThermalEfficiency;
        deltaFood += mod.foodDelta * mod.level * systemThermalEfficiency;
      }

      deltaH2O += mod.waterDelta * mod.level * systemThermalEfficiency;
      deltaShield += mod.shieldDelta;
      deltaScience += mod.scienceDelta * mod.level * systemThermalEfficiency;
    });

    // Net resource balance
    deltaO2 -= crewO2Consumption;
    deltaH2O -= crewWaterConsumption;
    deltaFood -= crewFoodConsumption;

    const netPower = totalProd - totalCons;

    // Calculate new resources
    let newEnergy = currentColony.resources.energy + (netPower * 0.4);
    let newOxygen = currentColony.resources.oxygen + deltaO2;
    let newWater = currentColony.resources.water + deltaH2O;
    let newFood = currentColony.resources.food + deltaFood;
    let newShield = Math.min(100, Math.max(20, deltaShield));
    let newRad = currentColony.resources.radiationExposure + (currentColony.radiationActive ? 6 : 0.5);
    let newScience = currentColony.resources.sciencePoints + Math.max(1, deltaScience);

    newEnergy = Math.max(0, Math.min(currentColony.resources.maxEnergy, newEnergy));
    newOxygen = Math.max(0, Math.min(currentColony.resources.maxOxygen, newOxygen));
    newWater = Math.max(0, Math.min(currentColony.resources.maxWater, newWater));
    newFood = Math.max(0, Math.min(currentColony.resources.maxFood, newFood));

    // 5. CREW HEALTH, MORALE & ACTUAL MORTALITY! ("no se mueren" FIXED)
    let anyDeathOccurred = false;
    let latestDeathName = '';
    let latestDeathCause = '';

    const updatedCrew = currentColony.crew.map(c => {
      if (c.status === 'deceased') return c; // Already dead

      let healthDelta = 0;
      let moraleDelta = 0;
      let primaryFatalCause = '';

      if (difficulty === 'facil') {
        // Fácil: low penalty, moral stays high, no starvation
        if (newOxygen < 20) healthDelta -= 5;
        if (newEnergy === 0) healthDelta -= 5;
        moraleDelta += 1;
      } else {
        // Normal: realistic severe penalties and fatal risks!
        if (newOxygen <= 5) {
          healthDelta -= 35;
          primaryFatalCause = 'Asfixia por falta de oxígeno (O₂ agotado)';
        } else if (newOxygen < 25) {
          healthDelta -= 15;
          primaryFatalCause = 'Hipoxia severa por baja presión de O₂';
        }

        if (newWater <= 0) {
          healthDelta -= 20;
          primaryFatalCause = 'Deshidratación crítica en ambiente espacial';
        }

        if (newEnergy <= 0) {
          healthDelta -= 25; // Freezing to death (-180°C / -85°C)!
          primaryFatalCause = isNightNow 
            ? 'Hipotermia letal durante la noche espacial' 
            : 'Fallo total de presurización térmica';
        }

        if (currentColony.radiationActive && newShield < 40) {
          healthDelta -= 20;
          primaryFatalCause = 'Dosis letal de radiación ionizante solar (DONKI)';
        }

        // Morale swings
        if (newFood > 60 && newOxygen > 50) moraleDelta += 3;
        if (newFood < 20) moraleDelta -= 8;
        if (newOxygen < 30) moraleDelta -= 10;
        if (isExtreme) moraleDelta -= 4;
      }

      const calculatedHealth = Math.max(0, Math.min(100, c.health + healthDelta));
      const calculatedMorale = Math.max(0, Math.min(100, c.morale + moraleDelta));

      // MORTALITY CHECK!
      if (calculatedHealth <= 0 && difficulty === 'normal') {
        anyDeathOccurred = true;
        latestDeathName = c.name;
        latestDeathCause = primaryFatalCause || 'Fallo general de soporte vital';
        return {
          ...c,
          health: 0,
          morale: 0,
          status: 'deceased' as const,
          causeOfDeath: latestDeathCause,
        };
      }

      return {
        ...c,
        health: calculatedHealth,
        morale: calculatedMorale,
        status: (calculatedHealth < 25 ? 'critical' : 'alive') as CrewStatus,
      };
    });

    // Check if entire crew has perished!
    const totalLivingRemaining = updatedCrew.filter(c => c.status !== 'deceased').length;

    // Apply colony update
    updateCurrentColony(prev => ({
      ...prev,
      currentDay: nextDay,
      resources: {
        ...prev.resources,
        energy: newEnergy,
        energyProduction: Math.round(totalProd),
        energyConsumption: Math.round(totalCons),
        oxygen: newOxygen,
        water: newWater,
        food: newFood,
        shieldIntegrity: newShield,
        radiationExposure: parseFloat(newRad.toFixed(1)),
        sciencePoints: newScience,
      },
      crew: updatedCrew,
      isLunarNight: isNightNow,
      dustStormActive: isDustNow,
      currentTemperatureCelsius: currentTemp,
      isTemperatureExtreme: isExtreme,
      solarFluctuation: hasSolarFluctuation,
      isCommBlackout: hasCommBlackout,
    }));

    // Voice & Sound alerts for deaths or game over
    if (totalLivingRemaining === 0) {
      soundFx.playAlert();
      setGameOverCause(latestDeathCause || 'Agotamiento total de los recursos vitales de la colonia.');
      setIsGameOverOpen(true);
      spaceVoice.speak('Alerta fatal. La tripulación no ha sobrevivido. Misión fracasada.');
      return;
    } else if (anyDeathOccurred) {
      soundFx.playAlert();
      showToast(`¡BAJA FATAL EN LA TRIPULACIÓN! ${latestDeathName} ha fallecido. Causa: ${latestDeathCause}`);
      spaceVoice.speak(`Alerta médica fatal. El astronauta ${latestDeathName} ha fallecido.`);
    }

    // Trigger Mission Events on specific days
    if (nextDay === 3) {
      updateCurrentColony(p => ({ ...p, radiationActive: true }));
      soundFx.playAlert();
      const ev = MISSION_EVENTS.find(e => e.id === 'donki_xflare') || MISSION_EVENTS[0];
      setCurrentEvent(ev);
      spaceVoice.speak('¡Alerta de emergencia DONKI! Fulguración solar clase X detectada.');
    } else if (nextDay === 5 && location === 'mars') {
      soundFx.playAlert();
      const ev = MISSION_EVENTS.find(e => e.id === 'mars_dust_storm_meda') || MISSION_EVENTS[1];
      setCurrentEvent(ev);
      spaceVoice.speak('Alerta meteorológica MEDA. Tormenta de polvo aproximándose al cráter Jezero.');
    } else if (nextDay === 7) {
      soundFx.playAlert();
      const ev = MISSION_EVENTS.find(e => e.id === 'osdr_veggie_crisis') || MISSION_EVENTS[2];
      setCurrentEvent(ev);
      spaceVoice.speak('Alerta biológica en el invernadero espacial Veggie.');
    } else if (nextDay === 10 && location === 'moon') {
      soundFx.playAlert();
      const ev = MISSION_EVENTS.find(e => e.id === 'lunar_night_approaching') || MISSION_EVENTS[3];
      setCurrentEvent(ev);
      spaceVoice.speak('Iniciando aproximación de la noche polar lunar. Catorce días continuos de oscuridad.');
    } else if (nextDay === 12) {
      soundFx.playAlert();
      const ev = MISSION_EVENTS.find(e => e.id === 'comm_delay_emergency') || MISSION_EVENTS[4];
      setCurrentEvent(ev);
    } else if (nextDay === 15) {
      soundFx.playAlert();
      const ev = MISSION_EVENTS.find(e => e.id === 'osdr_bone_density_loss') || MISSION_EVENTS[5];
      setCurrentEvent(ev);
    } else {
      const advText = lang === 'es'
        ? `Avanzaste al ${location === 'mars' ? 'Sol' : 'Día Lunar'} ${nextDay}. Ciclo completado.`
        : `Advanced to ${location === 'mars' ? 'Sol' : 'Lunar Day'} ${nextDay}.`;
      showToast(advText);
    }
  };

  // Handle Event Option chosen
  const handleSelectEventOption = (opt: MissionEventOption) => {
    updateCurrentColony(prev => {
      const nextRes = { ...prev.resources };
      if (opt.resourceDeltas.energy !== undefined) nextRes.energy = Math.max(0, Math.min(100, nextRes.energy + opt.resourceDeltas.energy));
      if (opt.resourceDeltas.oxygen !== undefined) nextRes.oxygen = Math.max(0, Math.min(100, nextRes.oxygen + opt.resourceDeltas.oxygen));
      if (opt.resourceDeltas.water !== undefined) nextRes.water = Math.max(0, Math.min(100, nextRes.water + opt.resourceDeltas.water));
      if (opt.resourceDeltas.food !== undefined) nextRes.food = Math.max(0, Math.min(100, nextRes.food + opt.resourceDeltas.food));
      if (opt.resourceDeltas.radiationExposure !== undefined) nextRes.radiationExposure += opt.resourceDeltas.radiationExposure;
      if (opt.resourceDeltas.shieldIntegrity !== undefined) nextRes.shieldIntegrity = Math.max(0, Math.min(100, nextRes.shieldIntegrity + opt.resourceDeltas.shieldIntegrity));
      if (opt.resourceDeltas.sciencePoints !== undefined) nextRes.sciencePoints = Math.max(0, nextRes.sciencePoints + opt.resourceDeltas.sciencePoints);

      const nextCrew = prev.crew.map(c => {
        if (c.status === 'deceased') return c;
        const newH = Math.max(0, Math.min(100, c.health + (opt.crewHealthDelta || 0)));
        const newM = Math.max(0, Math.min(100, c.morale + (opt.crewMoraleDelta || 0)));
        return {
          ...c,
          health: newH,
          morale: newM,
          status: (newH <= 0 ? 'deceased' : newH < 25 ? 'critical' : 'alive') as CrewStatus,
          causeOfDeath: newH <= 0 ? 'Consecuencias de decisión crítica de misión' : c.causeOfDeath,
        };
      });

      return {
        ...prev,
        resources: nextRes,
        crew: nextCrew,
        radiationActive: false,
      };
    });

    setCurrentEvent(null);
    const doneMsg = lang === 'es'
      ? `Decisión ejecutada: ${opt.educationalTakeawayEs}`
      : `Order executed: ${opt.educationalTakeawayEn}`;
    showToast(doneMsg);
    spaceVoice.speak(doneMsg);
  };

  // Botanical harvest callback
  const handleBotanicalHarvest = (foodGain: number, scienceGain: number, moraleGain: number) => {
    // In easy mode: plant loot is multiplied!
    const multiplier = difficulty === 'facil' ? 1.5 : 1.0;
    const actualFood = Math.round(foodGain * multiplier);

    updateCurrentColony(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        food: Math.min(100, prev.resources.food + actualFood),
        sciencePoints: prev.resources.sciencePoints + scienceGain,
      },
      crew: prev.crew.map(c => {
        if (c.status === 'deceased') return c;
        return {
          ...c,
          health: Math.min(100, c.health + 5),
          morale: Math.min(100, c.morale + moraleGain),
        };
      }),
    }));

    const msg = `¡Cosecha fresca servida! +${actualFood} Comida Veggie, +${scienceGain} pts Ciencia OSDR.`;
    showToast(msg);
    spaceVoice.speak('Cosecha fresca servida en el comedor del hábitat. Moral y nutrición restauradas.');
  };

  // Rover Sortie completed callback
  const handleRoverSortieComplete = (reward: { water?: number; shield?: number; science?: number; energyBonus?: number }) => {
    updateCurrentColony(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        water: reward.water ? Math.min(100, prev.resources.water + reward.water) : prev.resources.water,
        shieldIntegrity: reward.shield ? Math.min(100, prev.resources.shieldIntegrity + reward.shield) : prev.resources.shieldIntegrity,
        sciencePoints: reward.science ? prev.resources.sciencePoints + reward.science : prev.resources.sciencePoints,
        energy: reward.energyBonus ? Math.min(100, prev.resources.energy + reward.energyBonus) : prev.resources.energy,
      },
    }));
    const msg = '¡Expedición robótica ISRU completada con éxito! Recursos integrados a la base.';
    showToast(msg);
    spaceVoice.speak('El rover ha regresado al muelle con las muestras recolectadas.');
  };

  // Add science points from quiz
  const handleAddScienceFromQuiz = (pts: number) => {
    updateCurrentColony(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        sciencePoints: prev.resources.sciencePoints + pts,
      },
    }));
    showToast(`¡Quiz completado! +${pts} Puntos de Ciencia agregados.`);
    spaceVoice.speak(`Felicitaciones, Cadete. Ganaste ${pts} puntos de ciencia en el desafío STEM.`);
  };

  // Emergency Oxygen Deployment with 2-second delay callback!
  const handleEmergencyO2Injected = () => {
    updateCurrentColony(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        oxygen: Math.min(100, prev.resources.oxygen + 35),
      },
      emergencyO2Active: true,
    }));
    showToast('¡Inyección de O₂ de emergencia presurizada! Soporte vital estabilizado (+35% O₂).');
    spaceVoice.speak('Presión de oxígeno normalizada en el hábitat.');
  };

  // Restart after Game Over or manually
  const handleRestartMission = (newDiff?: GameDifficulty) => {
    const diff = newDiff || difficulty;
    setDifficulty(diff);
    setIsGameOverOpen(false);

    // Reset current colony
    setColonies(all => ({
      ...all,
      [location]: createInitialColonyData(location),
    }));

    showToast(`Misión reiniciada en ${location === 'moon' ? 'la Luna' : 'Marte'} (Dificultad: ${diff.toUpperCase()}).`);
    spaceVoice.speak('Misión reiniciada. Telemetría lista en plataforma de lanzamiento.');
  };

  // Restore comms from mini-game
  const handleRestoreCommunications = () => {
    updateCurrentColony(prev => ({
      ...prev,
      isCommBlackout: false,
    }));
    showToast('¡Enlace con Houston y la Red DSN restablecido con éxito!');
    spaceVoice.speak('Enlace de radio de espacio profundo restablecido.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Navbar */}
      <Navbar
        currentDay={currentColony.currentDay}
        totalDays={activeCrisis ? activeCrisis.targetDays : currentScenario.targetDays}
        location={location}
        difficulty={difficulty}
        isMuted={isMuted}
        isVoiceEnabled={isVoiceEnabled}
        activeCrisisTitle={activeCrisis ? activeCrisis.titleEs : null}
        onAdvanceDay={handleAdvanceDay}
        onOpenDossier={() => setIsDossierOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenBotanicalLab={() => setIsBotanicalLabOpen(true)}
        onOpenRoverMission={() => setIsRoverMissionOpen(true)}
        onOpenHistoricalCrises={() => setIsHistoricalCrisesOpen(true)}
        onOpenNasaQuiz={() => setIsNasaQuizOpen(true)}
        onToggleMute={() => setIsMuted(soundFx.toggleMute())}
        onToggleVoice={handleToggleVoice}
        onChangeLocation={handleChangeLocation}
        onChangeDifficulty={(d) => {
          setDifficulty(d);
          showToast(`Dificultad cambiada a: ${d === 'facil' ? 'FÁCIL (Sin Hambre/Sed)' : 'NORMAL (O₂ por persona & Letal)'}`);
        }}
        lang={lang}
        onToggleLang={() => setLang(l => (l === 'es' ? 'en' : 'es'))}
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-cyan-900 to-indigo-900 border border-cyan-400 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce max-w-lg text-center">
          <Sparkles className="w-4 h-4 text-cyan-300 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 space-y-4">
        {/* Scenario Banner with Temperature Cycle & Independent State Info */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-xl">{location === 'moon' ? '🌕' : '🔴'}</span>
            <div>
              <span className="font-black text-cyan-300">
                {activeCrisis ? `CRISIS HISTÓRICA: ${activeCrisis.titleEs}` : (lang === 'es' ? currentScenario.titleEs : currentScenario.titleEn)}
              </span>
              <span className="text-slate-400 ml-2 hidden sm:inline">
                {activeCrisis ? `(${activeCrisis.missionName})` : (lang === 'es' ? currentScenario.subtitleEs : currentScenario.subtitleEn)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            {/* Temperature Cycle Readout */}
            <div className={`flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-lg border ${
              currentColony.isTemperatureExtreme 
                ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse' 
                : 'bg-slate-950 border-slate-800 text-cyan-300'
            }`}>
              <Thermometer className="w-3.5 h-3.5 text-amber-400" />
              <span>Temp: {currentColony.currentTemperatureCelsius}°C</span>
              {currentColony.isTemperatureExtreme && (
                <span className="text-[9px] uppercase font-black bg-red-600 text-white px-1 rounded ml-1">
                  ESTRÉS TÉRMICO
                </span>
              )}
            </div>

            {/* Comm Blackout Alert Indicator */}
            {currentColony.isCommBlackout && (
              <button
                onClick={() => setIsRoverMissionOpen(false)}
                className="flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-lg bg-red-950 border border-red-500 text-red-300 animate-bounce cursor-pointer"
                title="Haz clic para abrir el minijuego de radio y calibrar la antena"
              >
                <WifiOff className="w-3.5 h-3.5 text-red-400" />
                <span>BLACKOUT DSN</span>
              </button>
            )}

            <div className="hidden md:flex items-center gap-1 text-[11px]">
              <span>Latencia DSN:</span>
              <span className="font-mono font-bold text-amber-300">
                {lang === 'es' ? currentScenario.commDelayTextEs : currentScenario.commDelayTextEn}
              </span>
            </div>
          </div>
        </div>

        {/* 🚨 OXYGEN EMERGENCY BANNER WITH 2-SECOND DELAY */}
        <OxygenEmergencyBanner
          oxygenLevel={currentColony.resources.oxygen}
          onEmergencyO2Injected={handleEmergencyO2Injected}
          lang={lang}
        />

        {/* 1. RESOURCE TELEMETRY GAUGES */}
        <ResourceDashboard resources={currentColony.resources} lang={lang} />

        {/* 2. BASE VIEW (Interactive Visual Simulation) */}
        <BaseView
          location={location}
          modules={currentColony.modules}
          currentDay={currentColony.currentDay}
          totalDays={activeCrisis ? activeCrisis.targetDays : currentScenario.targetDays}
          radiationActive={currentColony.radiationActive}
          dustStormActive={currentColony.dustStormActive}
          isLunarNight={currentColony.isLunarNight}
          onSelectModule={(id) => setSelectedModuleId(id)}
          selectedModuleId={selectedModuleId}
          lang={lang}
        />

        {/* 3. MODULE POWER & SYSTEM CONTROL */}
        <ModuleControl
          modules={currentColony.modules}
          selectedModuleId={selectedModuleId}
          onSelectModule={(id) => setSelectedModuleId(id)}
          onToggleModule={handleToggleModule}
          onUpgradeModule={handleUpgradeModule}
          onRepairModule={() => {}}
          lang={lang}
        />

        {/* 4. CREW ROSTER & HEALTH (NASA OSDR / Real Casualties on Health=0) */}
        <CrewPanel 
          crew={currentColony.crew} 
          difficulty={difficulty} 
          lang={lang} 
        />

        {/* 5. DEEP SPACE COMMUNICATIONS TERMINAL (Speed-of-light delay & autonomy) */}
        <CommCenter
          location={location}
          currentDay={currentColony.currentDay}
          oxygenLevel={currentColony.resources.oxygen}
          energyLevel={currentColony.resources.energy}
          lang={lang}
        />
      </main>

      {/* Modals */}
      <EventModal
        event={currentEvent}
        onSelectOption={handleSelectEventOption}
        lang={lang}
      />

      <ScienceDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        lang={lang}
      />

      <TutorialGuide
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        lang={lang}
      />

      <MissionReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        location={location}
        currentDay={currentColony.currentDay}
        totalDays={activeCrisis ? activeCrisis.targetDays : currentScenario.targetDays}
        difficulty={difficulty}
        resources={currentColony.resources}
        crew={currentColony.crew}
        lang={lang}
      />

      <BotanicalLabModal
        isOpen={isBotanicalLabOpen}
        onClose={() => setIsBotanicalLabOpen(false)}
        onHarvest={handleBotanicalHarvest}
        currentWater={currentColony.resources.water}
        currentEnergy={currentColony.resources.energy}
        lang={lang}
      />

      <RoverMissionModal
        isOpen={isRoverMissionOpen}
        onClose={() => setIsRoverMissionOpen(false)}
        location={location}
        currentEnergy={currentColony.resources.energy}
        onCompleteSortie={handleRoverSortieComplete}
        lang={lang}
      />

      <HistoricalCrisesModal
        isOpen={isHistoricalCrisesOpen}
        onClose={() => setIsHistoricalCrisesOpen(false)}
        onSelectCrisis={(crisis) => {
          setActiveCrisis(crisis);
          setLocation(crisis.location);
          updateCurrentColony(p => ({
            ...p,
            currentDay: 1,
            resources: { ...p.resources, ...crisis.initialOverrides },
            radiationActive: crisis.specialCondition === 'extreme_radiation',
            dustStormActive: crisis.specialCondition === 'solar_blackout',
          }));
          const text = `Crisis histórica activada: ${crisis.titleEs}. Año ${crisis.year}.`;
          showToast(text);
          spaceVoice.speak(text);
        }}
        activeCrisisId={activeCrisis ? activeCrisis.id : null}
        lang={lang}
      />

      <NasaQuizModal
        isOpen={isNasaQuizOpen}
        onClose={() => setIsNasaQuizOpen(false)}
        onAddSciencePoints={handleAddScienceFromQuiz}
        lang={lang}
      />

      {/* Game Over Modal on Crew Extinction */}
      <GameOverModal
        isOpen={isGameOverOpen}
        location={location}
        currentDay={currentColony.currentDay}
        crew={currentColony.crew}
        primaryCause={gameOverCause}
        onRestart={handleRestartMission}
        lang={lang}
      />

      {/* Comm Blackout Mini-Game Modal */}
      <CommMiniGameModal
        isOpen={currentColony.isCommBlackout}
        onRestoreComm={handleRestoreCommunications}
        lang={lang}
      />

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-3 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-medium">
            <span>🚀</span>
            <span className="text-slate-400">
              {lang === 'es' ? 'Desarrollado con orgullo por el equipo' : 'Proudly developed by team'}
            </span>
            <span className="text-emerald-400 font-black">
              Troncos Intergalácticos
            </span>
            <span className="text-slate-500">• NASA STEM Challenge</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsHistoricalCrisesOpen(true)}
              className="text-red-400 hover:underline font-bold"
            >
              {lang === 'es' ? 'Crisis Históricas' : 'Historical Crises'}
            </button>
            <span>•</span>
            <button 
              onClick={() => setIsBotanicalLabOpen(true)}
              className="text-emerald-400 hover:underline font-bold"
            >
              {lang === 'es' ? 'Invernadero Veggie' : 'Veggie Lab'}
            </button>
            <span>•</span>
            <button 
              onClick={() => setIsRoverMissionOpen(true)}
              className="text-cyan-400 hover:underline font-bold"
            >
              {lang === 'es' ? 'Rover ISRU' : 'Rover ISRU'}
            </button>
            <span>•</span>
            <button 
              onClick={() => setIsNasaQuizOpen(true)}
              className="text-amber-400 hover:underline font-bold"
            >
              {lang === 'es' ? 'Quiz NASA' : 'NASA Quiz'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
