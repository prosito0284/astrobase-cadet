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
  ColonySaveData,
  Achievement,
  FlightLogEntry,
  CommanderProfile
} from './types/game';
import { SCENARIOS } from './data/scenarios';
import { INITIAL_MODULES } from './data/modules';
import { INITIAL_CREW, EXPANDED_CREW_MEMBERS } from './data/crew';
import { MISSION_EVENTS } from './data/events';
import { HISTORICAL_CRISES, HistoricalCrisis } from './data/historicalCrises';
import { INITIAL_ACHIEVEMENTS } from './data/achievements';
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
import { WiringMiniGameModal } from './components/WiringMiniGameModal';
import { IceMineModal } from './components/IceMineModal';
import { PopulationExpansionModal } from './components/PopulationExpansionModal';
import { AchievementsModal } from './components/AchievementsModal';
import { CommanderProfileModal } from './components/CommanderProfileModal';
import { FlightLogModal } from './components/FlightLogModal';
import { soundFx, spaceAmbient } from './utils/audio';
import { spaceVoice } from './utils/speech';
import confetti from 'canvas-confetti';
import { Sparkles, Thermometer, AlertTriangle, WifiOff, Zap } from 'lucide-react';

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
};

export function App() {
  const [lang, setLang] = useState<'es' | 'en'>('es');
  const [location, setLocation] = useState<BaseLocation>('moon');
  const [difficulty, setDifficulty] = useState<GameDifficulty>('normal');
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>('life_support');

  // INDEPENDENT PERSISTENT COLONY STATE (MOON & MARS MAINTAIN SEPARATE PROGRESS)
  const [colonies, setColonies] = useState<{ moon: ColonySaveData; mars: ColonySaveData }>(() => {
    try {
      const saved = localStorage.getItem('astrobase_dual_save_v5');
      if (saved) {
        const parsed = JSON.parse(saved);
        const mergeColony = (c: any, loc: BaseLocation): ColonySaveData => {
          const init = createInitialColonyData(loc);
          return {
            ...init,
            ...c,
            resources: { ...init.resources, ...(c?.resources || {}) },
            batteryFaultCount: c?.batteryFaultCount ?? 0,
            batteryLockoutSeconds: c?.batteryLockoutSeconds ?? 0,
            wiringErrorActive: c?.wiringErrorActive ?? false,
            sandstormEnergyHaltDays: c?.sandstormEnergyHaltDays ?? 0,
            plantsNeedDoubleWaterOnce: c?.plantsNeedDoubleWaterOnce ?? false,
            plantsWipedGrowth: c?.plantsWipedGrowth ?? false,
            empStunSeconds: c?.empStunSeconds ?? 0,
            populationExpanded: c?.populationExpanded ?? false,
            assignedToMine: c?.assignedToMine || [],
          };
        };
        return {
          moon: mergeColony(parsed.moon, 'moon'),
          mars: mergeColony(parsed.mars, 'mars'),
        };
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
  const [isWiringOpen, setIsWiringOpen] = useState(false);
  const [isIceMineOpen, setIsIceMineOpen] = useState(false);
  const [isPopulationExpansionOpen, setIsPopulationExpansionOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isCommanderProfileOpen, setIsCommanderProfileOpen] = useState(false);
  const [isFlightLogOpen, setIsFlightLogOpen] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Commander Profile State (Persisted)
  const [commanderProfile, setCommanderProfile] = useState<CommanderProfile>(() => {
    try {
      const saved = localStorage.getItem('astrobase_commander_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      name: 'Checo Valdés',
      callsign: 'Tronco Alfa',
      patch: '🌲 Troncos Intergalácticos (Oficial)',
    };
  });

  // NASA Achievements State (Persisted)
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    try {
      const saved = localStorage.getItem('astrobase_achievements_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_ACHIEVEMENTS;
  });

  // Flight Log & Telemetry Timeline (Persisted)
  const [flightLog, setFlightLog] = useState<FlightLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('astrobase_flightlog_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'init_moon',
        day: 1,
        timestamp: '00:00 UTC',
        location: 'moon',
        type: 'info',
        messageEs: 'Base Artemis III presurizada en el Cráter Shackleton. Telecomunicaciones DSN en línea.',
        messageEn: 'Artemis III base pressurized at Shackleton Crater. DSN comms online.',
      },
    ];
  });

  // Save persistent state
  useEffect(() => {
    try {
      localStorage.setItem('astrobase_commander_v1', JSON.stringify(commanderProfile));
    } catch {}
  }, [commanderProfile]);

  useEffect(() => {
    try {
      localStorage.setItem('astrobase_achievements_v1', JSON.stringify(achievements));
    } catch {}
  }, [achievements]);

  useEffect(() => {
    try {
      localStorage.setItem('astrobase_flightlog_v1', JSON.stringify(flightLog));
    } catch {}
  }, [flightLog]);

  // Helper to append a flight log entry
  const addFlightLog = (type: FlightLogEntry['type'], msgEs: string, msgEn: string) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} UTC`;
    const entry: FlightLogEntry = {
      id: `log_${Date.now()}_${Math.random()}`,
      day: currentColony.currentDay,
      timestamp: timeStr,
      location,
      type,
      messageEs: msgEs,
      messageEn: msgEn,
    };
    setFlightLog(prev => [entry, ...prev].slice(0, 60));
  };

  // Helper to unlock an achievement
  const unlockAchievement = (id: string) => {
    setAchievements(prev => {
      const target = prev.find(a => a.id === id);
      if (!target || target.unlocked) return prev;

      soundFx.playAchievement();
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.4 } });
      const msg = `🏅 ¡LOGRO DESBLOQUEADO! ${lang === 'es' ? target.titleEs : target.titleEn}`;
      showToast(msg);
      spaceVoice.speak(`Condecoración de la NASA obtenida: ${target.titleEs}`);

      addFlightLog(
        'success',
        `Medalla NASA obtenida: ${target.titleEs}`,
        `NASA Badge awarded: ${target.titleEn}`
      );

      return prev.map(a => a.id === id ? { ...a, unlocked: true, unlockedAtDay: currentColony.currentDay } : a);
    });
  };

  // Toggle ambient music
  const handleToggleMusic = () => {
    const next = spaceAmbient.toggle();
    setIsMusicPlaying(next);
    if (next) {
      showToast('🎵 Música espacial ambiental iniciada.');
    } else {
      showToast('Música ambiental pausada.');
    }
  };

  // Save to localStorage whenever colonies state changes
  useEffect(() => {
    try {
      localStorage.setItem('astrobase_dual_save_v5', JSON.stringify(colonies));
    } catch {
      // LocalStorage quota fallback
    }
  }, [colonies]);

  // Battery lockout ticker: decrements batteryLockoutSeconds and drains 4% energy per second during overload
  useEffect(() => {
    if (currentColony.batteryLockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      updateCurrentColony(prev => {
        if (prev.batteryLockoutSeconds <= 0) return prev;
        const nextLock = Math.max(0, prev.batteryLockoutSeconds - 1);
        const drain = prev.resources.maxEnergy * 0.04;
        const nextEnergy = Math.max(0, prev.resources.energy - drain);
        return {
          ...prev,
          batteryLockoutSeconds: nextLock,
          resources: {
            ...prev.resources,
            energy: nextEnergy,
          },
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentColony.batteryLockoutSeconds]);

  // EMP stun ticker: 1-second task freeze
  useEffect(() => {
    if (currentColony.empStunSeconds <= 0) return;
    const timer = setTimeout(() => {
      updateCurrentColony(prev => ({
        ...prev,
        empStunSeconds: 0,
      }));
    }, 1000);
    return () => clearTimeout(timer);
  }, [currentColony.empStunSeconds]);

  // Initial greeting
  useEffect(() => {
    const timer = setTimeout(() => {
      spaceVoice.speak(
        `¡Saludos, Comandante ${commanderProfile.name}! Capcom NOVA en línea, desarrollado por el equipo Troncos Intergalácticos. Todos los sistemas de telemetría de la NASA están listos para la misión.`
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

  // Upgrade Module Level (Hard Mode requires 20 science points for Storm Bunker!)
  const handleUpgradeModule = (id: string) => {
    const mod = currentColony.modules.find(m => m.id === id);
    if (!mod || mod.level >= mod.maxLevel) return;

    const isBunker = mod.id === 'storm_bunker';
    const requiredCost = (difficulty === 'dificil' && isBunker) ? 20 : 10;

    if (currentColony.resources.sciencePoints < requiredCost) {
      const msg = lang === 'es' 
        ? `¡Necesitas al menos ${requiredCost} puntos de Ciencia para investigar la mejora${isBunker && difficulty === 'dificil' ? ' del búnker en Modo Difícil' : ''}!` 
        : `Need at least ${requiredCost} Science points to upgrade!`;
      showToast(msg);
      spaceVoice.speak(msg);
      return;
    }

    updateCurrentColony(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        sciencePoints: prev.resources.sciencePoints - requiredCost,
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

  // Day 15 Population Expansion Confirmation (4 -> 6 astronauts with -25% resources)
  const handleConfirmPopulationExpansion = () => {
    updateCurrentColony(prev => {
      if (prev.populationExpanded) return prev;
      const nextO2 = Math.max(0, Math.round(prev.resources.oxygen * 0.75));
      const nextH2O = Math.max(0, Math.round(prev.resources.water * 0.75));
      const nextEnergy = Math.max(0, Math.round(prev.resources.energy * 0.75));
      const nextFood = Math.max(0, Math.round(prev.resources.food * 0.75));

      const newCrewList = [
        ...prev.crew,
        ...JSON.parse(JSON.stringify(EXPANDED_CREW_MEMBERS)),
      ];

      return {
        ...prev,
        resources: {
          ...prev.resources,
          oxygen: nextO2,
          water: nextH2O,
          energy: nextEnergy,
          food: nextFood,
        },
        crew: newCrewList,
        populationExpanded: true,
      };
    });

    const msg = '🎉 ¡Expansión exitosa! Cadete Santi Gomez y Dra. Elena Ruiz se han acoplado a la tripulación (6 astronautas).';
    showToast(msg);
    spaceVoice.speak('Personal de relevo acoplado con éxito. Tripulación expandida a seis miembros.');
    unlockAchievement('crew_expansion');
    addFlightLog('success', 'Transbordador acoplado: Tripulación expandida a 6 astronautas sacrificando 25% de recursos.', 'Shuttle docked: Crew expanded to 6 astronauts sacrificing 25% supplies.');
  };

  // Shock active crew if attempting repair during battery overload lockout
  const handleShockCrew = () => {
    soundFx.playAlert();
    updateCurrentColony(prev => {
      const livingCrew = prev.crew.filter(c => c.status !== 'deceased');
      const shockedIds = livingCrew.slice(0, 2).map(c => c.id);
      const nextCrew = prev.crew.map(c => {
        if (!shockedIds.includes(c.id)) return c;
        const newHealth = Math.max(1, Math.round(c.health * 0.5));
        return {
          ...c,
          health: newHealth,
          isShockDisabledDays: 1,
        };
      });
      return {
        ...prev,
        crew: nextCrew,
      };
    });
    const msg = '⚡ ¡DESCARGA ELÉCTRICA SEVERA! Los astronautas sufrieron 50% de daño y quedan incapacitados durante 1 día.';
    showToast(msg);
    spaceVoice.speak('¡Descarga de alta tensión! Personal médico requerido en bahía eléctrica.');
    addFlightLog('alert', 'Descarga eléctrica de alta tensión en banco de baterías: técnicos heridos.', 'High-voltage electric shock in battery bay: technicians injured.');
  };

  // Ice Mine toggle assignment handler
  const handleToggleAssignAstronaut = (astronautId: string) => {
    if (currentColony.isCommBlackout) {
      soundFx.playAlert();
      showToast('⚠️ ¡Blackout de comunicaciones! La telemetría con la mina de hielo está inhabilitada.');
      spaceVoice.speak('Extracción en cráter polar bloqueada por pérdida de señal DSN.');
      return;
    }

    const livingCrew = currentColony.crew.filter(c => c.status !== 'deceased');
    const isCurrentlyAssigned = currentColony.assignedToMine.includes(astronautId);

    if (isCurrentlyAssigned) {
      // Unassign
      updateCurrentColony(prev => ({
        ...prev,
        assignedToMine: prev.assignedToMine.filter(id => id !== astronautId),
        crew: prev.crew.map(c => c.id === astronautId ? { ...c, isAssignedToMine: false } : c),
      }));
      showToast('Astronauta regresado al hábitat.');
      addFlightLog('info', 'Astronauta retirado de la mina de hielo criogénico.', 'Astronaut rotated out of cryogenic ice mine.');
    } else {
      // Trying to assign
      const maxAllowed = (difficulty === 'dificil' && !currentColony.populationExpanded) ? 1 : 2;
      if (currentColony.assignedToMine.length >= maxAllowed) {
        showToast(`La mina ya tiene el cupo de ${maxAllowed} minero(s) asignado(s).`);
        return;
      }

      // Check if astronaut is shock-disabled
      const member = currentColony.crew.find(c => c.id === astronautId);
      if ((member?.isShockDisabledDays ?? 0) > 0) {
        soundFx.playAlert();
        showToast('⚠️ Este astronauta está incapacitado por electrocución y no puede salir a minar.');
        return;
      }

      // Rule: Base cannot be left with fewer than 1 person!
      const remainingInBase = livingCrew.length - currentColony.assignedToMine.length;
      if (remainingInBase <= 1) {
        soundFx.playAlert();
        showToast('¡Regla de Seguridad! No puedes dejar la base desatendida. Al menos 1 astronauta debe quedarse.');
        spaceVoice.speak('Atención. La base requiere al menos un tripulante en el hábitat.');
        return;
      }

      updateCurrentColony(prev => ({
        ...prev,
        assignedToMine: [...prev.assignedToMine, astronautId],
        crew: prev.crew.map(c => c.id === astronautId ? { ...c, isAssignedToMine: true } : c),
      }));
      showToast('Astronauta asignado a la mina de hielo criogénico.');
      unlockAchievement('ice_miner');
      addFlightLog('info', 'Mina de hielo criogénico ISRU activada con nuevo personal.', 'ISRU cryogenic ice mine activated with assigned personnel.');
    }
  };

  // Advance Day / Sol simulation loop with all requested mechanics
  const handleAdvanceDay = () => {
    const maxDays = activeCrisis ? activeCrisis.targetDays : currentScenario.targetDays;

    if (currentColony.currentDay >= maxDays) {
      soundFx.playVictory();
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
      if (difficulty === 'dificil') {
        unlockAchievement('supreme_commander');
      }
      setIsReportOpen(true);
      spaceVoice.speak('¡Misión cumplida con éxito rotundo! Certificado de comandante emitido por la NASA.');
      return;
    }

    const nextDay = currentColony.currentDay + 1;
    const marsMultiplier = (location === 'mars' && difficulty === 'dificil') ? 1.5 : 1.0;

    // Weather & Lunar cycles
    const isNightNow = location === 'moon' && (difficulty === 'dificil' ? (nextDay >= 8 && nextDay <= 19) : (nextDay >= 10 && nextDay <= 18));
    const isDustNow = location === 'mars' && (nextDay >= 5 && nextDay <= 8 || activeCrisis?.specialCondition === 'solar_blackout');

    // 1. TEMPERATURE CYCLE
    let currentTemp = 0;
    let isExtreme = false;
    if (location === 'moon') {
      currentTemp = isNightNow ? -180 : 120;
      isExtreme = isNightNow || currentTemp > 100;
    } else {
      currentTemp = (nextDay % 2 === 0) ? -85 : 20;
      isExtreme = currentTemp < -50;
    }

    // 2. SANDSTORM ENERGY HALT (MARS HARD MODE)
    let newSandstormHalt = Math.max(0, (currentColony.sandstormEnergyHaltDays ?? 0) - 1);
    if (location === 'mars' && difficulty === 'dificil' && isDustNow && newSandstormHalt === 0 && Math.random() < 0.35) {
      newSandstormHalt = 1;
      soundFx.playAlert();
      spaceVoice.speak('¡Ráfagas de arena marcianas! Paneles solares cubiertos por polvo. Generación eléctrica suspendida por 1 día.');
      showToast('🌪️ ¡RÁFAGA DE ARENA MARCIANA! Energía fotovoltaica inhabilitada durante 1 día.');
    }

    // 3. SUDDEN LIGHT DROP / WIRING ERROR (HARD MODE)
    let newWiringError = currentColony.wiringErrorActive;
    if (difficulty === 'dificil' && !newWiringError && nextDay > 2 && Math.random() < 0.20) {
      newWiringError = true;
      soundFx.playAlert();
      spaceVoice.speak('¡Alerta de cableado! Caída repentina de iluminación y fuga de oxígeno en el hábitat.');
      showToast('💡 ¡FALLO DE CABLEADO! Iluminación caída y fuga de O2. Se requieren 2 astronautas para reparar.');
      setIsWiringOpen(true);
    }

    // 4. BATTERY FAULT & COMM BLACKOUT PROBABILITIES
    let newBatteryFault = currentColony.batteryFault;
    let newBatteryFaultCount = currentColony.batteryFaultCount;
    let newBatteryLockoutSeconds = currentColony.batteryLockoutSeconds;
    let hasSolarFluctuation = false;
    let hasCommBlackout = currentColony.isCommBlackout;

    if (difficulty === 'normal') {
      if (!newBatteryFault && Math.random() < 0.15 && nextDay > 2) {
        newBatteryFault = true;
        soundFx.playAlert();
        spaceVoice.speak('¡Alerta en bancos de energía! Cortocircuito detectado en el cableado de baterías.');
        setIsWiringOpen(true);
      }

      hasSolarFluctuation = Math.random() < 0.25;

      if (!hasCommBlackout && Math.random() < 0.20 && nextDay > 3) {
        hasCommBlackout = true;
        soundFx.playAlert();
        spaceVoice.speak('¡Alerta! Pérdida de señal con la Red de Espacio Profundo. Se requiere sintonizar la antena.');
      }
    } else if (difficulty === 'dificil') {
      // Hard mode: battery faults increase
      if (Math.random() < 0.28 && nextDay > 2) {
        newBatteryFault = true;
        newBatteryFaultCount += 1;
        soundFx.playAlert();
        if (newBatteryFaultCount >= 2) {
          newBatteryLockoutSeconds = 5; // 5s critical lockout with -4%/sec drain!
          spaceVoice.speak('¡Sobrecarga doble en baterías! Banco bloqueado por 5 segundos con fuga eléctrica.');
          showToast('⚡ ¡2 FALLOS DE BATERÍA! Bloqueo crítico de 5s: fuga de -4% energía/segundo.');
        } else {
          spaceVoice.speak('¡Alerta eléctrica crítica! Cortocircuito en baterías. Se requieren dos astronautas para reparar.');
          showToast('⚡ ¡FALLO DE BATERÍA! Requiere 2 astronautas para reparar.');
        }
        setIsWiringOpen(true);
      }

      hasSolarFluctuation = Math.random() < 0.35;

      // Antenna fails more frequently and blocks ice mine and flare alerts
      if (!hasCommBlackout && Math.random() < 0.30 && nextDay > 2) {
        hasCommBlackout = true;
        soundFx.playAlert();
        spaceVoice.speak('¡Pérdida de comunicaciones DSN! Extracción de mina de hielo bloqueada y advertencias de llamaradas solares ocultas.');
        showToast('📡 ¡BLACKOUT DSN! Antena desalineada: mina de hielo bloqueada.');
      }
    }

    // 5. LIVING CREW & OXYGEN/WATER/FOOD CONSUMPTION
    const livingCrew = currentColony.crew.filter(c => c.status !== 'deceased');
    const livingCount = livingCrew.length;
    const assignedMinersCount = currentColony.assignedToMine.filter(id => livingCrew.some(c => c.id === id)).length;

    let crewO2Consumption = 0;
    let crewWaterConsumption = 0;
    let crewFoodConsumption = 0;

    if (difficulty === 'facil') {
      crewO2Consumption = livingCount * 1.0;
      crewWaterConsumption = 0;
      crewFoodConsumption = 0;
    } else if (difficulty === 'normal') {
      const regularCrewCount = livingCount - assignedMinersCount;
      crewO2Consumption = (regularCrewCount * 2.5) + (assignedMinersCount * 2.5 * 1.015);
      crewWaterConsumption = livingCount * 3.5;
      crewFoodConsumption = livingCount * 2.5;
    } else {
      // Hard mode:
      // Water consumption +15% over normal
      // Overall consumption scaled by 1.5 in Mars
      const regularCrewCount = livingCount - assignedMinersCount;
      crewO2Consumption = ((regularCrewCount * 3.0) + (assignedMinersCount * 3.0 * 1.015)) * marsMultiplier;
      crewWaterConsumption = (livingCount * 3.5 * 1.15) * marsMultiplier;
      crewFoodConsumption = (livingCount * 3.0) * marsMultiplier;
    }

    // 6. MODULE EFFICIENCY & PRODUCTION
    let totalProd = 0;
    let totalCons = 0;
    let deltaO2 = 0;
    let deltaH2O = 0;
    let deltaFood = 0;
    let deltaShield = 0;
    let deltaScience = 0;

    // Cryogenic Ice Mine Production
    if (!hasCommBlackout) {
      if (difficulty === 'facil' || difficulty === 'normal') {
        if (assignedMinersCount === 2) {
          deltaH2O += 22;
        }
      } else {
        // Hard mode:
        if (!currentColony.populationExpanded && assignedMinersCount >= 1) {
          // 1 miner, 70% less water
          deltaH2O += Math.round(22 * 0.30); // ~7 L
        } else if (currentColony.populationExpanded && assignedMinersCount >= 2) {
          // 2 miners, 40% penalty
          deltaH2O += Math.round(22 * 0.60); // ~13 L
        }
      }
    }

    let clearedDoubleWater = false;

    currentColony.modules.forEach(mod => {
      if (!mod.isActive) return;

      // Energy systems
      if (mod.id === 'solar_farm') {
        let efficiency = 1.0;
        if (hasSolarFluctuation) efficiency *= 0.6;
        if (newBatteryFault) efficiency *= 0.1;
        if (newSandstormHalt > 0) efficiency = 0; // Sandstorm shutoff

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

      // Thermal efficiency (5% extra penalty in Hard mode)
      const systemThermalEfficiency = isExtreme && mod.category !== 'power' 
        ? (difficulty === 'dificil' ? 0.70 : 0.75) 
        : 1.0;

      // Plant cultivation / Greenhouse
      if (mod.id === 'greenhouse') {
        let waterMultiplier = 1.0;
        if (currentColony.plantsNeedDoubleWaterOnce) {
          waterMultiplier = 2.0; // Needs 2x water once
          clearedDoubleWater = true;
        }

        if (difficulty !== 'facil' && isNightNow) {
          deltaO2 += -2 * mod.level;
        } else {
          deltaO2 += (difficulty === 'facil' ? 8 : mod.oxygenDelta) * mod.level * systemThermalEfficiency;
        }
        deltaFood += (difficulty === 'facil' ? 18 : mod.foodDelta) * mod.level * systemThermalEfficiency;
        deltaH2O += (mod.waterDelta * waterMultiplier) * mod.level * systemThermalEfficiency;
      } else {
        deltaO2 += mod.oxygenDelta * mod.level * systemThermalEfficiency;
        deltaFood += mod.foodDelta * mod.level * systemThermalEfficiency;
        deltaH2O += mod.waterDelta * mod.level * systemThermalEfficiency;
      }

      deltaShield += mod.shieldDelta;
      deltaScience += mod.scienceDelta * mod.level * systemThermalEfficiency;
    });

    // O2 leak from sudden light drop wiring error
    if (newWiringError) {
      deltaO2 -= 8;
    }

    deltaO2 -= crewO2Consumption;
    deltaH2O -= crewWaterConsumption;
    deltaFood -= crewFoodConsumption;

    const netPower = totalProd - totalCons;

    let newEnergy = currentColony.resources.energy + (netPower * 0.4);
    let newOxygen = currentColony.resources.oxygen + deltaO2;
    let newWater = currentColony.resources.water + deltaH2O;
    let newFood = currentColony.resources.food + deltaFood;
    let newShield = Math.min(100, Math.max(20, deltaShield));
    let newRad = currentColony.resources.radiationExposure + (currentColony.radiationActive ? 6 : 0.5);

    // Hard mode Pros: +50% science multiplier
    const scienceBonusMultiplier = difficulty === 'dificil' ? 1.5 : 1.0;
    let newScience = currentColony.resources.sciencePoints + Math.round(Math.max(1, deltaScience) * scienceBonusMultiplier);

    // 7. SPACE DEBRIS CHECK
    let isSpaceDebrisImpact = false;
    let debrisDamagesCrew = false;

    if (difficulty === 'dificil') {
      if (location === 'moon') {
        isSpaceDebrisImpact = Math.random() < (1 / 2500);
        if (isSpaceDebrisImpact && Math.random() < 0.25) {
          debrisDamagesCrew = true;
        }
      } else {
        isSpaceDebrisImpact = Math.random() < (1 / 6000);
      }
    } else {
      isSpaceDebrisImpact = Math.random() < (1 / 5000);
    }

    if (isSpaceDebrisImpact) {
      newOxygen *= 0.5;
      newWater *= 0.5;
      newEnergy *= 0.5;
      newFood *= 0.5;
      newShield *= 0.5;
      soundFx.playAlert();
      const debrisText = debrisDamagesCrew 
        ? '💥 ¡COLISIÓN DE BASURA ESPACIAL! Depósitos dañados al 50% y esquirlas orbitales hirieron al personal (-20 HP).'
        : '💥 ¡COLISIÓN DE BASURA ESPACIAL! Todos los depósitos de recursos se han reducido a la mitad.';
      showToast(debrisText);
      spaceVoice.speak('¡Impacto orbital severo! Depósitos comprometidos. Recursos reducidos a la mitad.');
      addFlightLog(
        'alert',
        debrisText,
        debrisDamagesCrew ? 'Space debris impact: supplies halved and crew injured (-20 HP).' : 'Space debris impact: all supplies halved.'
      );
    }

    newEnergy = Math.max(0, Math.min(currentColony.resources.maxEnergy, newEnergy));
    newWater = Math.max(0, Math.min(currentColony.resources.maxWater, newWater));
    newFood = Math.max(0, Math.min(currentColony.resources.maxFood, newFood));

    // 8. OXYGEN 0 DEATH GRACE PERIOD (1-SECOND DELAY)
    let isZeroOxygenGraceTriggered = false;
    if (newOxygen <= 0) {
      newOxygen = 0;
      isZeroOxygenGraceTriggered = true;
    }

    let anyDeathOccurred = false;
    let latestDeathName = '';
    let latestDeathCause = '';

    const updatedCrew = currentColony.crew.map(c => {
      if (c.status === 'deceased') return c;

      const shockDaysRemaining = Math.max(0, (c.isShockDisabledDays ?? 0) - 1);
      let healthDelta = 0;
      let moraleDelta = 0;
      let primaryFatalCause = '';

      if (debrisDamagesCrew) {
        healthDelta -= 20;
      }

      if (newWiringError) {
        healthDelta -= 10;
        moraleDelta -= 5;
      }

      if (difficulty === 'facil') {
        if (newOxygen < 20) healthDelta -= 5;
        if (newEnergy === 0) healthDelta -= 5;
        moraleDelta += 1;
      } else if (difficulty === 'normal') {
        if (newOxygen < 25) {
          healthDelta -= 15;
          primaryFatalCause = 'Hipoxia severa por baja presión de O₂';
        }
        if (newWater <= 0) {
          healthDelta -= 20;
          primaryFatalCause = 'Deshidratación crítica en ambiente espacial';
        }
        if (newEnergy <= 0) {
          healthDelta -= 25;
          primaryFatalCause = isNightNow ? 'Hipotermia letal durante la noche polar' : 'Fallo térmico del hábitat';
        }
        if (currentColony.radiationActive && newShield < 40) {
          healthDelta -= 20;
          primaryFatalCause = 'Dosis letal de radiación ionizante solar (DONKI)';
        }

        if (newFood > 60 && newOxygen > 50) moraleDelta += 3;
        if (newFood < 20) moraleDelta -= 8;
        if (newOxygen < 30) moraleDelta -= 10;
        if (isExtreme) moraleDelta -= 4;
      } else {
        // Hard mode:
        if (newOxygen < 25) {
          healthDelta -= 20;
          primaryFatalCause = 'Hipoxia fulminante por descompresión de soporte vital';
        }
        if (newWater <= 0) {
          healthDelta -= 25;
          primaryFatalCause = 'Deshidratación crítica en ambiente hostil';
        }
        if (newEnergy <= 0) {
          healthDelta -= 30;
          primaryFatalCause = isNightNow ? 'Hipotermia letal extrema' : 'Fallo térmico total del hábitat';
        }
        if (currentColony.radiationActive && newShield < 40) {
          healthDelta -= 25;
          primaryFatalCause = 'Dosis letal de radiación solar extrema (DONKI)';
        }

        // Morale drops 25% faster in Hard mode
        if (newFood > 60 && newOxygen > 50) moraleDelta += 2;
        if (newFood < 25) moraleDelta -= Math.round(10 * 1.25);
        if (newOxygen < 35) moraleDelta -= Math.round(12 * 1.25);
        if (isExtreme) moraleDelta -= Math.round(6 * 1.25);
      }

      const calculatedHealth = Math.max(0, Math.min(100, c.health + healthDelta));
      const calculatedMorale = Math.max(0, Math.min(100, c.morale + moraleDelta));

      if (calculatedHealth <= 0 && (difficulty === 'normal' || difficulty === 'dificil')) {
        anyDeathOccurred = true;
        latestDeathName = c.name;
        latestDeathCause = primaryFatalCause || 'Fallo general de soporte vital';
        return {
          ...c,
          health: 0,
          morale: 0,
          status: 'deceased' as CrewStatus,
          causeOfDeath: latestDeathCause,
          isShockDisabledDays: 0,
        };
      }

      return {
        ...c,
        health: calculatedHealth,
        morale: calculatedMorale,
        status: (calculatedHealth < 25 ? 'critical' : 'alive') as CrewStatus,
        isShockDisabledDays: shockDaysRemaining,
      };
    });

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
      batteryFault: newBatteryFault,
      batteryFaultCount: newBatteryFaultCount,
      batteryLockoutSeconds: newBatteryLockoutSeconds,
      wiringErrorActive: newWiringError,
      sandstormEnergyHaltDays: newSandstormHalt,
      plantsNeedDoubleWaterOnce: clearedDoubleWater ? false : prev.plantsNeedDoubleWaterOnce,
    }));

    // Check Day 15 Population Expansion
    if (nextDay === 15 && difficulty === 'dificil' && !currentColony.populationExpanded) {
      soundFx.playAlert();
      setIsPopulationExpansionOpen(true);
      spaceVoice.speak('¡Día quince de misión alcanzado! Protocolo de acoplamiento de dos nuevos especialistas disponible.');
    }

    // 1-second grace period on 0% Oxygen asphyxiation
    if (isZeroOxygenGraceTriggered) {
      soundFx.playAlert();
      showToast('⚠️ ¡OXÍGENO AL 0%! 1 segundo de reserva en esclusas antes de asfixia fatal...');
      spaceVoice.speak('¡Peligro letal! Oxígeno al cero por ciento. Asfixia de la tripulación en un segundo.');

      setTimeout(() => {
        setColonies(all => {
          const current = all[location];
          if (current.resources.oxygen <= 0) {
            const deceasedAll = current.crew.map(c => ({
              ...c,
              health: 0,
              morale: 0,
              status: 'deceased' as CrewStatus,
              causeOfDeath: 'Muerte por asfixia en el vacío (0% O₂)',
            }));
            setGameOverCause('¡MUERTE DE LA TRIPULACIÓN POR ASFIXIA AL AGOTARSE EL OXÍGENO EN EL HÁBITAT (0% O₂)!');
            setIsGameOverOpen(true);
            spaceVoice.speak('Asfixia confirmada. Todos los signos vitales han cesado. Misión terminada.');
            return {
              ...all,
              [location]: {
                ...current,
                crew: deceasedAll,
              },
            };
          }
          return all;
        });
      }, 1000);
      return;
    }

    // Voice & Sound alerts for casualties
    if (totalLivingRemaining === 0) {
      soundFx.playAlert();
      setGameOverCause(latestDeathCause || 'Agotamiento de recursos vitales');
      setIsGameOverOpen(true);
      spaceVoice.speak('Alerta catastrófica. Muerte de toda la tripulación. Misión terminada.');
      return;
    } else if (anyDeathOccurred) {
      soundFx.playAlert();
      showToast(`¡BAJA FATAL EN LA TRIPULACIÓN! ${latestDeathName} ha fallecido. Causa: ${latestDeathCause}`);
      spaceVoice.speak(`Alerta médica fatal. El astronauta ${latestDeathName} ha fallecido.`);
    }

    // Trigger Mission Events (Solar flare on Day 3 with Hard mode penalties)
    if (nextDay === 3) {
      updateCurrentColony(p => {
        let bunkerUpdatedModules = p.modules;
        if (difficulty === 'dificil') {
          // Solar flare decreases bunker by 1 if level >= 2
          bunkerUpdatedModules = p.modules.map(m => {
            if (m.id === 'storm_bunker' && m.level >= 2) {
              return { ...m, level: m.level - 1 };
            }
            return m;
          });
        }
        return {
          ...p,
          radiationActive: true,
          modules: bunkerUpdatedModules,
          plantsWipedGrowth: difficulty === 'dificil' ? true : p.plantsWipedGrowth,
          plantsNeedDoubleWaterOnce: difficulty === 'dificil' ? true : p.plantsNeedDoubleWaterOnce,
          empStunSeconds: difficulty === 'dificil' ? 1 : 0,
          isCommBlackout: difficulty === 'dificil' ? (Math.random() < 0.5 ? true : p.isCommBlackout) : p.isCommBlackout,
        };
      });
      soundFx.playAlert();
      const ev = MISSION_EVENTS.find(e => e.id === 'donki_xflare') || MISSION_EVENTS[0];
      setCurrentEvent(ev);
      spaceVoice.speak('¡Alerta de emergencia DONKI! Fulguración solar clase X detectada.');
    } else if (nextDay === 5 && location === 'mars') {
      soundFx.playAlert();
      const ev = MISSION_EVENTS.find(e => e.id === 'mars_dust_storm_meda') || MISSION_EVENTS[1];
      setCurrentEvent(ev);
    } else if (nextDay === 7) {
      soundFx.playAlert();
      const ev = MISSION_EVENTS.find(e => e.id === 'osdr_veggie_crisis') || MISSION_EVENTS[2];
      setCurrentEvent(ev);
    } else if (nextDay === 10 && location === 'moon') {
      soundFx.playAlert();
      const ev = MISSION_EVENTS.find(e => e.id === 'lunar_night_approaching') || MISSION_EVENTS[3];
      setCurrentEvent(ev);
    } else {
      const advText = lang === 'es'
        ? `Avanzaste al ${location === 'mars' ? 'Sol' : 'Día Lunar'} ${nextDay}. Ciclo completado.`
        : `Advanced to ${location === 'mars' ? 'Sol' : 'Lunar Day'} ${nextDay}.`;
      showToast(advText);
    }

    unlockAchievement('first_sol');
    if (newScience >= 50) {
      unlockAchievement('science_breakthrough');
    }
    addFlightLog(
      'info',
      `Transición al ${location === 'mars' ? 'Sol' : 'Día Lunar'} ${nextDay} completada. Telemetría de soporte vital actualizada.`,
      `Transition to ${location === 'mars' ? 'Sol' : 'Lunar Day'} ${nextDay} complete. Life support telemetry updated.`
    );
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
    unlockAchievement('veggie_harvest');
    addFlightLog('success', `Cosecha fresca servida: +${actualFood} comida Veggie, +${scienceGain} pts Ciencia.`, `Fresh harvest served: +${actualFood} Veggie food, +${scienceGain} Science.`);
  };

  // Rover Sortie completed callback
  const handleRoverSortieComplete = (reward: { water?: number; shield?: number; science?: number; energyBonus?: number }) => {
    const penalty = difficulty === 'dificil' ? 0.6 : 1.0; // 40% less collected in Hard mode
    const scienceMultiplier = difficulty === 'dificil' ? 1.5 : 1.0;
    updateCurrentColony(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        water: reward.water ? Math.min(100, prev.resources.water + Math.round(reward.water * penalty)) : prev.resources.water,
        shieldIntegrity: reward.shield ? Math.min(100, prev.resources.shieldIntegrity + Math.round(reward.shield * penalty)) : prev.resources.shieldIntegrity,
        sciencePoints: reward.science ? prev.resources.sciencePoints + Math.round(reward.science * scienceMultiplier) : prev.resources.sciencePoints,
        energy: reward.energyBonus ? Math.min(100, prev.resources.energy + reward.energyBonus) : prev.resources.energy,
      },
    }));
    const msg = difficulty === 'dificil'
      ? '¡Expedición robótica ISRU completada! Recolección ajustada a terreno hostil (-40% volumen, +50% ciencia).'
      : '¡Expedición robótica ISRU completada con éxito! Recursos integrados a la base.';
    showToast(msg);
    spaceVoice.speak('El rover ha regresado al muelle con las muestras recolectadas.');
    unlockAchievement('rover_sortie');
    addFlightLog('success', 'Expedición robótica ISRU completada con muestras del terreno.', 'ISRU robotic rover sortie completed with surface samples.');
  };

  // Quiz completed callback with +20 Science bonus & +20% Morale!
  // "que al completar al quiz se den un bonus de 20 puntos de ciencia y que se suva el animo en un 20%"
  const handleQuizBonus = (scienceBonus: number, moraleBonus: number) => {
    updateCurrentColony(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        sciencePoints: prev.resources.sciencePoints + scienceBonus,
      },
      crew: prev.crew.map(c => {
        if (c.status === 'deceased') return c;
        return {
          ...c,
          morale: Math.min(100, c.morale + moraleBonus),
        };
      }),
    }));
    soundFx.playVictory();
    const msg = `🎉 ¡Desafío Quiz Superado! +${scienceBonus} Puntos de Ciencia Bonus y +${moraleBonus}% de Ánimo para toda la tripulación.`;
    showToast(msg);
    spaceVoice.speak('Excelente trabajo en el desafío STEM. Bono de ciencia acreditado y moral de la tripulación aumentada al máximo.');
    unlockAchievement('stem_genius');
    addFlightLog('success', `Desafío STEM completado: +${scienceBonus} pts Ciencia NASA y +${moraleBonus}% Ánimo.`, `STEM challenge passed: +${scienceBonus} NASA Science and +${moraleBonus}% Morale.`);
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
    addFlightLog('warning', 'Presurización manual de emergencia activada (+35% O₂).', 'Manual emergency pressurization activated (+35% O₂).');
  };

  // Wiring repair success callback
  const handleWiringSuccess = () => {
    updateCurrentColony(prev => ({
      ...prev,
      batteryFault: false,
      batteryFaultCount: 0,
      batteryLockoutSeconds: 0,
      wiringErrorActive: false,
    }));
    setIsWiringOpen(false);
    showToast('¡Cortocircuito y cableado reparados! Sistemas eléctricos e iluminación al 100%.');
    spaceVoice.speak('Cableado de batería e iluminación restaurados. Carga eléctrica normalizada.');
    unlockAchievement('wire_master');
    addFlightLog('success', 'Cableado de baterías e iluminación restaurado al 100%.', 'Battery wiring and illumination restored 100%.');
  };

  // Restart after Game Over or manually
  const handleRestartMission = (newDiff?: GameDifficulty) => {
    const diff = newDiff || difficulty;
    setDifficulty(diff);
    setIsGameOverOpen(false);

    setColonies(all => ({
      ...all,
      [location]: createInitialColonyData(location),
    }));

    showToast(`Misión reiniciada en ${location === 'moon' ? 'la Luna' : 'Marte'} (Dificultad: ${diff.toUpperCase()}).`);
    spaceVoice.speak('Misión reiniciada. Telemetría lista en plataforma de lanzamiento.');
    addFlightLog('info', `Misión reiniciada en ${location === 'moon' ? 'la Luna' : 'Marte'} (${diff.toUpperCase()}).`, `Mission restarted at ${location === 'moon' ? 'Moon' : 'Mars'} (${diff.toUpperCase()}).`);
  };

  // Restore comms from mini-game
  const handleRestoreCommunications = () => {
    updateCurrentColony(prev => ({
      ...prev,
      isCommBlackout: false,
    }));
    showToast('¡Enlace con Houston y la Red DSN restablecido con éxito!');
    spaceVoice.speak('Enlace de radio de espacio profundo restablecido.');
    unlockAchievement('dsn_restored');
    addFlightLog('success', 'Enlace de radio DSN restablecido con éxito.', 'DSN radio link successfully restored.');
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
        isBatteryFault={currentColony.batteryFault}
        wiringErrorActive={currentColony.wiringErrorActive}
        canExpandPopulation={difficulty === 'dificil' && currentColony.currentDay >= 15 && !currentColony.populationExpanded}
        commanderName={commanderProfile.name}
        isMusicPlaying={isMusicPlaying}
        unlockedAchievementsCount={achievements.filter(a => a.unlocked).length}
        onOpenCommanderProfile={() => setIsCommanderProfileOpen(true)}
        onToggleMusic={handleToggleMusic}
        onOpenAchievements={() => setIsAchievementsOpen(true)}
        onOpenFlightLog={() => setIsFlightLogOpen(true)}
        onOpenPopulationExpansion={() => setIsPopulationExpansionOpen(true)}
        onAdvanceDay={handleAdvanceDay}
        onOpenDossier={() => setIsDossierOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenBotanicalLab={() => setIsBotanicalLabOpen(true)}
        onOpenRoverMission={() => setIsRoverMissionOpen(true)}
        onOpenHistoricalCrises={() => setIsHistoricalCrisesOpen(true)}
        onOpenNasaQuiz={() => setIsNasaQuizOpen(true)}
        onOpenWiring={() => setIsWiringOpen(true)}
        onOpenIceMine={() => setIsIceMineOpen(true)}
        onToggleMute={() => setIsMuted(soundFx.toggleMute())}
        onToggleVoice={handleToggleVoice}
        onChangeLocation={handleChangeLocation}
        onChangeDifficulty={(d) => {
          setDifficulty(d);
          const diffLabels = {
            facil: 'FÁCIL (Sin Hambre/Sed)',
            normal: 'NORMAL (O₂ por persona & Letal)',
            dificil: 'DIFÍCIL (Supervivencia Extrema & Desafío Hardcore)',
          };
          showToast(`Dificultad cambiada a: ${diffLabels[d]}`);
          spaceVoice.speak(`Dificultad de simulación ajustada a ${d}.`);
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
              <div
                className="flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-lg bg-red-950 border border-red-500 text-red-300 animate-bounce"
              >
                <WifiOff className="w-3.5 h-3.5 text-red-400" />
                <span>BLACKOUT DSN</span>
              </div>
            )}

            {/* Battery Fault Indicator */}
            {currentColony.batteryFault && (
              <button
                onClick={() => setIsWiringOpen(true)}
                className="flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-lg bg-amber-950 border border-amber-500 text-amber-300 animate-pulse cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>FALLO BATERÍA (CABLEAR)</span>
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

        {/* ⚡ EMP STUN 1-SECOND FREEZE BANNER */}
        {currentColony.empStunSeconds > 0 && (
          <div className="bg-red-950/90 border-2 border-red-500 text-red-200 text-center py-2 px-4 rounded-xl font-black animate-pulse flex items-center justify-center gap-2 shadow-lg shadow-red-950">
            <Zap className="w-5 h-5 text-amber-400 animate-spin" />
            <span>⚡ ¡PULSO ELECTROMAGNÉTICO SOLAR: TODOS LOS SISTEMAS INHABILITADOS TEMPORALMENTE (1s)!</span>
          </div>
        )}

        {/* 🌪️ MARTIAN SANDSTORM ENERGY HALT BANNER */}
        {currentColony.sandstormEnergyHaltDays > 0 && (
          <div className="bg-amber-950/90 border border-amber-500 text-amber-200 text-center py-2 px-4 rounded-xl font-bold flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400 animate-bounce" />
            <span>🌪️ ¡RÁFAGA DE ARENA MARCIANA! La generación eléctrica fotovoltaica está suspendida durante 1 día.</span>
          </div>
        )}

        {/* 💡 SUDDEN LIGHT DROP / WIRING ERROR BANNER */}
        {currentColony.wiringErrorActive && (
          <div className="bg-yellow-950/90 border border-yellow-500 text-yellow-200 py-2.5 px-4 rounded-xl font-bold flex flex-wrap items-center justify-between gap-2 shadow-lg shadow-yellow-950/50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400 animate-pulse flex-shrink-0" />
              <span className="text-xs">💡 ¡FALLO DE CABLEADO Y CAÍDA DE ILUMINACIÓN! Fuga activa de O₂ y daño médico al hábitat. Requiere 2 astronautas para reparar.</span>
            </div>
            <button 
              onClick={() => setIsWiringOpen(true)}
              className="px-3 py-1 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs whitespace-nowrap"
            >
              Reparar Cableado (2 Técnicos)
            </button>
          </div>
        )}

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
          wiringErrorActive={currentColony.wiringErrorActive}
          emergencyO2Active={currentColony.emergencyO2Active}
          assignedToMineCount={currentColony.assignedToMine.length}
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
          difficulty={difficulty}
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
        commanderName={commanderProfile.name}
        commanderPatch={commanderProfile.patch}
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
        onAddSciencePoints={(pts) => {
          updateCurrentColony(prev => ({
            ...prev,
            resources: { ...prev.resources, sciencePoints: prev.resources.sciencePoints + pts }
          }));
        }}
        onQuizBonus={handleQuizBonus}
        lang={lang}
      />

      {/* Game Over Modal on Crew Extinction or Insta-Kill */}
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

      {/* Wiring Mini-Game Modal (Battery Short-Circuit & Sudden Light Drop) */}
      <WiringMiniGameModal
        isOpen={isWiringOpen}
        onSuccess={handleWiringSuccess}
        onClose={() => setIsWiringOpen(false)}
        lang={lang}
        difficulty={difficulty}
        batteryLockoutSeconds={currentColony.batteryLockoutSeconds}
        availableCrewCount={currentColony.crew.filter(c => c.status !== 'deceased' && !currentColony.assignedToMine.includes(c.id) && (c.isShockDisabledDays ?? 0) <= 0).length}
        onShockCrew={handleShockCrew}
      />

      {/* Cryogenic Ice Mine Assignment Modal */}
      <IceMineModal
        isOpen={isIceMineOpen}
        onClose={() => setIsIceMineOpen(false)}
        crew={currentColony.crew}
        assignedToMine={currentColony.assignedToMine}
        difficulty={difficulty}
        isCommBlackout={currentColony.isCommBlackout}
        populationExpanded={currentColony.populationExpanded}
        onToggleAssignAstronaut={handleToggleAssignAstronaut}
        lang={lang}
      />

      {/* Day 15 Population Expansion Modal */}
      <PopulationExpansionModal
        isOpen={isPopulationExpansionOpen}
        onClose={() => setIsPopulationExpansionOpen(false)}
        onConfirmExpansion={handleConfirmPopulationExpansion}
        currentResources={currentColony.resources}
        lang={lang}
      />

      {/* NASA Badges & Achievements Showcase Modal */}
      <AchievementsModal
        isOpen={isAchievementsOpen}
        onClose={() => setIsAchievementsOpen(false)}
        achievements={achievements}
        lang={lang}
      />

      {/* Commander Profile & Mission Patch Customization Modal */}
      <CommanderProfileModal
        isOpen={isCommanderProfileOpen}
        onClose={() => setIsCommanderProfileOpen(false)}
        profile={commanderProfile}
        onSaveProfile={(p) => setCommanderProfile(p)}
        lang={lang}
      />

      {/* Flight Log & NASA Telemetry Modal */}
      <FlightLogModal
        isOpen={isFlightLogOpen}
        onClose={() => setIsFlightLogOpen(false)}
        entries={flightLog}
        currentLocation={location}
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
              onClick={() => setIsIceMineOpen(true)}
              className="text-blue-400 hover:underline font-bold"
            >
              {lang === 'es' ? 'Mina Hielo Criogénica' : 'Ice Mine'}
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
