import React, { useState, useEffect, useRef } from 'react';
import { 
  BaseLocation, 
  GameDifficulty, 
  ResourceState, 
  MissionEvent, 
  MissionEventOption, 
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
import { HistoricalCrisis } from './data/historicalCrises';
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

const MAX_SCIENCE_POINTS = 500;

export const safeNum = (v: any, fallback: number, min: number, max: number): number => {
  if (v === undefined || v === null) return fallback;
  const n = Number(v);
  if (isNaN(n)) return fallback;
  if (n === -Infinity || n < min) return min;
  if (n === Infinity || n > max) return max;
  return Math.max(min, Math.min(max, n));
};

// oxlint-disable-next-line react/only-export-components
export const clampResources = (
  res: Partial<ResourceState> | undefined,
  baseMax?: Partial<ResourceState>
): ResourceState => {
  const maxO2 = Number(res?.maxOxygen ?? baseMax?.maxOxygen ?? 100);
  const maxH2O = Number(res?.maxWater ?? baseMax?.maxWater ?? 100);
  const maxE = Number(res?.maxEnergy ?? baseMax?.maxEnergy ?? 100);
  const maxF = Number(res?.maxFood ?? baseMax?.maxFood ?? 100);
  const maxSci = Number(res?.maxSciencePoints ?? baseMax?.maxSciencePoints ?? MAX_SCIENCE_POINTS);

  return {
    oxygen: safeNum(res?.oxygen, baseMax?.oxygen ?? 0, 0, maxO2),
    maxOxygen: maxO2 > 0 ? maxO2 : 100,
    water: safeNum(res?.water, baseMax?.water ?? 0, 0, maxH2O),
    maxWater: maxH2O > 0 ? maxH2O : 100,
    energy: safeNum(res?.energy, baseMax?.energy ?? 0, 0, maxE),
    maxEnergy: maxE > 0 ? maxE : 100,
    energyProduction: safeNum(res?.energyProduction, baseMax?.energyProduction ?? 30, 0, 9999),
    energyConsumption: safeNum(res?.energyConsumption, baseMax?.energyConsumption ?? 25, 0, 9999),
    food: safeNum(res?.food, baseMax?.food ?? 0, 0, maxF),
    maxFood: maxF > 0 ? maxF : 100,
    radiationExposure: safeNum(res?.radiationExposure, baseMax?.radiationExposure ?? 0, 0, 9999),
    shieldIntegrity: safeNum(res?.shieldIntegrity, baseMax?.shieldIntegrity ?? 80, 0, 100),
    sciencePoints: safeNum(res?.sciencePoints, baseMax?.sciencePoints ?? 0, 0, maxSci),
    maxSciencePoints: maxSci,
  };
};

const createInitialColonyData = (loc: BaseLocation, diff: GameDifficulty = 'normal'): ColonySaveData => {
  const scen = SCENARIOS.find(s => s.location === loc) || SCENARIOS[0];
  return {
    currentDay: 1,
    difficulty: diff,
    missionCompleted: false,
    resources: clampResources(scen.initialResources),
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
    lastEventDay: 1,
    lastSolarFlareDay: 1,
    lastEventId: undefined,
  };
};

export function App() {
  const [lang, setLang] = useState<'es' | 'en'>('es');
  
  // Persisted Location (Strictly independent between Moon and Mars)
  const [location, setLocation] = useState<BaseLocation>(() => {
    try {
      const saved = localStorage.getItem('astrobase_location_v2');
      if (saved === 'moon' || saved === 'mars') return saved;
    } catch {}
    return 'moon';
  });

  // Persisted Game Difficulty
  const [difficulty, setDifficulty] = useState<GameDifficulty>(() => {
    try {
      const saved = localStorage.getItem('astrobase_difficulty_v2');
      if (saved === 'facil' || saved === 'normal' || saved === 'dificil') return saved;
    } catch {}
    return 'normal';
  });

  const [selectedModuleId, setSelectedModuleId] = useState<string | null>('life_support');

  // INDEPENDENT PERSISTENT COLONY STATE (MOON & MARS MAINTAIN SEPARATE PROGRESS)
  const [colonies, setColonies] = useState<{ moon: ColonySaveData; mars: ColonySaveData }>(() => {
    try {
      const saved = localStorage.getItem('astrobase_dual_save_v7') || localStorage.getItem('astrobase_dual_save_v6') || localStorage.getItem('astrobase_dual_save_v5');
      if (saved) {
        const parsed = JSON.parse(saved);
        const mergeColony = (c: any, loc: BaseLocation): ColonySaveData => {
          const init = createInitialColonyData(loc, c?.difficulty || 'normal');
          const maxAllowed = loc === 'moon' ? 28 : 30;
          let safeDay = c?.currentDay ? Number(c.currentDay) : 1;
          if (isNaN(safeDay) || safeDay < 1) safeDay = 1;
          if (safeDay > maxAllowed) safeDay = maxAllowed;

          // Anti-leak protection: if Mars was corrupted with Moon's max days from legacy version
          if (loc === 'mars' && parsed?.moon?.currentDay >= 28 && c?.currentDay >= 28 && !c?.missionCompleted) {
            safeDay = 1;
          }

          const sanitizedResources = clampResources(c?.resources, init.resources);

          const sanitizedCrew = Array.isArray(c?.crew) && c.crew.length > 0
            ? c.crew.map((member: any) => {
                const health = Math.max(0, Math.min(100, Number(member?.health) || 0));
                const morale = Math.max(0, Math.min(100, Number(member?.morale) || 0));
                const status = (health <= 0 ? 'deceased' : health < 25 ? 'critical' : 'alive') as CrewStatus;
                return {
                  ...member,
                  health,
                  morale,
                  status: member?.status === 'deceased' ? 'deceased' : status,
                };
              })
            : init.crew;

          const livingCrewIds = new Set(sanitizedCrew.filter((m: any) => m.status !== 'deceased').map((m: any) => m.id));
          const sanitizedAssignedToMine = Array.isArray(c?.assignedToMine)
            ? Array.from(new Set(c.assignedToMine.filter((id: any) => typeof id === 'string' && livingCrewIds.has(id))))
            : [];

          return {
            ...init,
            ...c,
            currentDay: safeDay,
            difficulty: c?.difficulty || 'normal',
            missionCompleted: Boolean(c?.missionCompleted),
            resources: sanitizedResources,
            crew: sanitizedCrew,
            emergencyO2Charges: Math.max(0, Math.min(2, c?.emergencyO2Charges !== undefined ? Number(c.emergencyO2Charges) : 2)),
            roverSortiesToday: Math.max(0, Math.min(2, Number(c?.roverSortiesToday) || 0)),
            hasHarvestedToday: Boolean(c?.hasHarvestedToday),
            hasQuizCompletedToday: Boolean(c?.hasQuizCompletedToday),
            batteryFaultCount: Math.max(0, Math.min(10, Number(c?.batteryFaultCount) || 0)),
            batteryLockoutSeconds: Math.max(0, Math.min(10, Number(c?.batteryLockoutSeconds) || 0)),
            wiringErrorActive: Boolean(c?.wiringErrorActive),
            sandstormEnergyHaltDays: Math.max(0, Math.min(5, Number(c?.sandstormEnergyHaltDays) || 0)),
            plantsNeedDoubleWaterOnce: Boolean(c?.plantsNeedDoubleWaterOnce),
            plantsWipedGrowth: Boolean(c?.plantsWipedGrowth),
            empStunSeconds: Math.max(0, Math.min(5, Number(c?.empStunSeconds) || 0)),
            populationExpanded: Boolean(c?.populationExpanded),
            assignedToMine: sanitizedAssignedToMine as string[],
            lastEventDay: safeNum(c?.lastEventDay, 1, 1, 100),
            lastSolarFlareDay: safeNum(c?.lastSolarFlareDay, 1, 1, 100),
            lastEventId: typeof c?.lastEventId === 'string' ? c.lastEventId : undefined,
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
      moon: createInitialColonyData('moon', 'normal'),
      mars: createInitialColonyData('mars', 'normal'),
    };
  });

  // Current active colony state & Scenario
  const currentColony = colonies[location];
  const currentScenario = SCENARIOS.find(s => s.location === location) || SCENARIOS[0];

  // Active crisis state (Strictly scoped to the active location)
  const [activeCrisis, setActiveCrisis] = useState<HistoricalCrisis | null>(null);
  const activeCrisisForCurrentLocation = activeCrisis && activeCrisis.location === location ? activeCrisis : null;
  const effectiveTotalDays = activeCrisisForCurrentLocation ? activeCrisisForCurrentLocation.targetDays : currentScenario.targetDays;

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
  const [wiringSessionId, setWiringSessionId] = useState(0);

  const openWiringModal = () => {
    setWiringSessionId(prev => prev + 1);
    setIsWiringOpen(true);
  };
  const [isIceMineOpen, setIsIceMineOpen] = useState(false);
  const [isPopulationExpansionOpen, setIsPopulationExpansionOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isCommanderProfileOpen, setIsCommanderProfileOpen] = useState(false);
  const [isFlightLogOpen, setIsFlightLogOpen] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Debouncing & Re-entrancy guards
  const isUpgradingRef = useRef(false);
  const isAssigningMinerRef = useRef(false);
  const isAdvancingRef = useRef(false);
  const zeroOxygenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHarvestingRef = useRef(false);
  const isSortieSubmittingRef = useRef(false);
  const isWiringSubmittingRef = useRef(false);
  const isCommRestoringRef = useRef(false);
  const isQuizBonusSubmittingRef = useRef(false);

  // Show Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

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

  const unlockedAchievementIdsRef = useRef<Set<string>>(
    new Set(INITIAL_ACHIEVEMENTS.filter(a => a.unlocked).map(a => a.id))
  );

  useEffect(() => {
    achievements.forEach(a => {
      if (a.unlocked) unlockedAchievementIdsRef.current.add(a.id);
    });
  }, [achievements]);

  // Helper to unlock an achievement (side-effects extracted outside updater closure)
  const unlockAchievement = (id: string) => {
    if (unlockedAchievementIdsRef.current.has(id)) return;
    const target = achievements.find(a => a.id === id);
    if (!target || target.unlocked) return;

    unlockedAchievementIdsRef.current.add(id);

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

    setAchievements(prev =>
      prev.map(a => a.id === id ? { ...a, unlocked: true, unlockedAtDay: currentColony.currentDay } : a)
    );
  };

  // Active Sol/second tick loop for battery lockout and solar EMP stun countdown
  useEffect(() => {
    const hasLockout = colonies.moon.batteryLockoutSeconds > 0 || colonies.mars.batteryLockoutSeconds > 0;
    const hasEmp = colonies.moon.empStunSeconds > 0 || colonies.mars.empStunSeconds > 0;

    if (!hasLockout && !hasEmp) return;

    const timer = setInterval(() => {
      setColonies(all => {
        let changed = false;
        const nextColonies = { ...all };

        (['moon', 'mars'] as BaseLocation[]).forEach(loc => {
          const c = all[loc];
          if (c.batteryLockoutSeconds > 0 || c.empStunSeconds > 0) {
            changed = true;
            const nextLockout = Math.max(0, c.batteryLockoutSeconds - 1);
            const nextEmp = Math.max(0, c.empStunSeconds - 1);

            // Fuga de -4% energía/segundo durante el bloqueo crítico de batería
            let nextEnergy = c.resources.energy;
            if (c.batteryLockoutSeconds > 0) {
              nextEnergy = Math.max(0, nextEnergy - 4);
            }

            nextColonies[loc] = {
              ...c,
              batteryLockoutSeconds: nextLockout,
              empStunSeconds: nextEmp,
              resources: {
                ...c.resources,
                energy: nextEnergy,
              },
            };
          }
        });

        return changed ? nextColonies : all;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    colonies.moon.batteryLockoutSeconds,
    colonies.mars.batteryLockoutSeconds,
    colonies.moon.empStunSeconds,
    colonies.mars.empStunSeconds
  ]);

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

  // Save persistent state
  useEffect(() => {
    try {
      localStorage.setItem('astrobase_location_v2', location);
    } catch {}
  }, [location]);

  useEffect(() => {
    try {
      localStorage.setItem('astrobase_difficulty_v2', difficulty);
    } catch {}
  }, [difficulty]);

  useEffect(() => {
    try {
      localStorage.setItem('astrobase_dual_save_v7', JSON.stringify(colonies));
    } catch {}
  }, [colonies]);

  // Helper to mutate current active colony safely with strict resource clamping
  const updateCurrentColony = (updater: (prev: ColonySaveData) => ColonySaveData) => {
    setColonies(all => {
      const prevForLoc = all[location] || createInitialColonyData(location, difficulty);
      const nextColony = updater(prevForLoc);
      return {
        ...all,
        [location]: {
          ...nextColony,
          resources: clampResources(nextColony.resources, prevForLoc.resources),
        },
      };
    });
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

  // Switch location handler WITHOUT LOSING DATA & STRICT INDEPENDENCE!
  const handleChangeLocation = (newLoc: BaseLocation) => {
    if (newLoc === location) return;
    setLocation(newLoc);
    // Clear active historical crisis if it belongs to the other location
    if (activeCrisis && activeCrisis.location !== newLoc) {
      setActiveCrisis(null);
    }

    const destColony = colonies[newLoc];
    // Sync current active difficulty to the destination colony's difficulty
    if (destColony?.difficulty) {
      setDifficulty(destColony.difficulty);
    }

    const maxDays = newLoc === 'moon' ? 28 : 30;
    const announce = lang === 'es' 
      ? `Cambiando a base en ${newLoc === 'moon' ? 'la Luna (Día ' + destColony.currentDay + '/' + maxDays + ')' : 'Marte (Sol ' + destColony.currentDay + '/' + maxDays + ')'}. Datos conservados.` 
      : `Switched to ${newLoc === 'moon' ? 'Moon' : 'Mars'}. Session preserved.`;
    showToast(announce);
    spaceVoice.speak(announce);
  };

  // Anti-Cheat Difficulty Switcher:
  // Changing difficulty resets the active base to Day 1 with fresh stats for that difficulty.
  // This completely eliminates the bug where players play on Easy to max days, switch to Hard, and win!
  const handleChangeDifficulty = (newDiff: GameDifficulty) => {
    if (newDiff === difficulty && currentColony.difficulty === newDiff) return;

    setDifficulty(newDiff);
    setCurrentEvent(null);
    setIsWiringOpen(false);
    setActiveCrisis(null);
    setColonies(all => ({
      ...all,
      [location]: createInitialColonyData(location, newDiff),
    }));

    const diffLabels: Record<GameDifficulty, string> = {
      facil: 'FÁCIL (Sin Hambre/Sed & Con Eventos Aleatorios)',
      normal: 'NORMAL (O₂ por persona & Desafío Estándar)',
      dificil: 'DIFÍCIL (Supervivencia Extrema & Desafío Hardcore)',
    };
    showToast(`Dificultad cambiada a: ${diffLabels[newDiff]}. Misión reiniciada al Sol 1.`);
    spaceVoice.speak(`Dificultad ajustada a ${newDiff}. Misión reiniciada al Sol 1.`);
    addFlightLog(
      'info',
      `Dificultad cambiada a ${newDiff.toUpperCase()}. Misión reiniciada al Sol 1 en ${location === 'moon' ? 'la Luna' : 'Marte'}.`,
      `Difficulty changed to ${newDiff.toUpperCase()}. Mission restarted at Sol 1 in ${location === 'moon' ? 'Moon' : 'Mars'}.`
    );
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
    if (isUpgradingRef.current) return;

    const currentMod = currentColony.modules.find(m => m.id === id);
    if (!currentMod) return;

    if (currentMod.level >= currentMod.maxLevel) {
      showToast(lang === 'es' ? 'Este módulo ya ha alcanzado el nivel máximo de investigación.' : 'Module already at max level.');
      return;
    }

    const isBunker = currentMod.id === 'storm_bunker';
    const requiredCost = (difficulty === 'dificil' && isBunker) ? 20 : 10;

    if (currentColony.resources.sciencePoints < requiredCost) {
      const msg = lang === 'es' 
        ? `¡Necesitas al menos ${requiredCost} puntos de Ciencia para investigar la mejora${isBunker && difficulty === 'dificil' ? ' del búnker en Modo Difícil' : ''}!` 
        : `Need at least ${requiredCost} Science points to upgrade!`;
      showToast(msg);
      spaceVoice.speak(msg);
      return;
    }

    isUpgradingRef.current = true;
    setTimeout(() => { isUpgradingRef.current = false; }, 300);

    let upgradedSuccessfully = false;
    let upgradedModName = '';
    let newLevel = 0;

    updateCurrentColony(prev => {
      const mod = prev.modules.find(m => m.id === id);
      if (!mod || mod.level >= mod.maxLevel) return prev;
      const bunker = mod.id === 'storm_bunker';
      const cost = (prev.difficulty === 'dificil' && bunker) ? 20 : 10;
      if (prev.resources.sciencePoints < cost) return prev;

      upgradedSuccessfully = true;
      upgradedModName = lang === 'es' ? mod.nameEs : mod.name;
      newLevel = mod.level + 1;

      return {
        ...prev,
        resources: {
          ...prev.resources,
          sciencePoints: Math.max(0, prev.resources.sciencePoints - cost),
        },
        modules: prev.modules.map(m => {
          if (m.id === id) {
            return { ...m, level: m.level + 1 };
          }
          return m;
        }),
      };
    });

    if (upgradedSuccessfully) {
      soundFx.playAchievement();
      const upgradeMsg = lang === 'es' ? `¡Módulo ${upgradedModName} mejorado al Nivel ${newLevel}!` : `${upgradedModName} upgraded to Level ${newLevel}!`;
      showToast(upgradeMsg);
      spaceVoice.speak(upgradeMsg);
    }
  };

  // Day 15 Population Expansion Confirmation (4 -> 6 astronauts with -25% resources)
  const handleConfirmPopulationExpansion = () => {
    if (difficulty !== 'dificil') {
      showToast('La expansión de tripulación solo está autorizada en Modo Difícil.');
      return;
    }
    if (currentColony.currentDay < 15) {
      showToast('El transbordador de relevo solo se acopla a partir del Día 15.');
      return;
    }
    if (currentColony.populationExpanded) {
      showToast('La tripulación ya ha sido expandida.');
      return;
    }

    const minRequired = 15;
    const res = currentColony.resources;
    if (res.oxygen < minRequired || res.water < minRequired || res.energy < minRequired || res.food < minRequired) {
      soundFx.playAlert();
      showToast('Recursos insuficientes en la base para soportar la expansión (mínimo 15 en cada suministro).');
      return;
    }

    let expansionApplied = false;
    updateCurrentColony(prev => {
      if (prev.populationExpanded || prev.difficulty !== 'dificil' || prev.currentDay < 15) return prev;
      if (prev.resources.oxygen < minRequired || prev.resources.water < minRequired ||
          prev.resources.energy < minRequired || prev.resources.food < minRequired) {
        return prev;
      }

      expansionApplied = true;
      const nextO2 = Math.max(0, Math.round(prev.resources.oxygen * 0.75));
      const nextH2O = Math.max(0, Math.round(prev.resources.water * 0.75));
      const nextEnergy = Math.max(0, Math.round(prev.resources.energy * 0.75));
      const nextFood = Math.max(0, Math.round(prev.resources.food * 0.75));

      const existingIds = new Set(prev.crew.map(c => c.id));
      const addedCrew = EXPANDED_CREW_MEMBERS.filter(c => !existingIds.has(c.id));
      const newCrewList = [
        ...prev.crew,
        ...JSON.parse(JSON.stringify(addedCrew)),
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

    if (expansionApplied) {
      soundFx.playVictory();
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      const msg = '🎉 ¡Expansión exitosa! Cadete Santi Gomez y Dra. Elena Ruiz se han acoplado a la tripulación (6 astronautas).';
      showToast(msg);
      spaceVoice.speak('Personal de relevo acoplado con éxito. Tripulación expandida a seis miembros.');
      unlockAchievement('crew_expansion');
      addFlightLog('success', 'Transbordador acoplado: Tripulación expandida a 6 astronautas sacrificando 25% de recursos.', 'Shuttle docked: Crew expanded to 6 astronauts sacrificing 25% supplies.');
    }
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

    if (isAssigningMinerRef.current) return;
    isAssigningMinerRef.current = true;
    setTimeout(() => { isAssigningMinerRef.current = false; }, 200);

    let actionTaken: 'unassigned' | 'assigned' | 'error_quota' | 'error_shock' | 'error_min_crew' | 'error_dead' | null = null;
    let quotaLimit = 2;
    let minCrewRequired = 1;

    updateCurrentColony(prev => {
      const livingCrew = prev.crew.filter(c => c.status !== 'deceased');
      const livingIds = new Set(livingCrew.map(c => c.id));
      const sanitizedAssigned = Array.from(new Set(prev.assignedToMine.filter(id => livingIds.has(id))));

      const member = prev.crew.find(c => c.id === astronautId);
      if (!member || member.status === 'deceased') {
        actionTaken = 'error_dead';
        return {
          ...prev,
          assignedToMine: sanitizedAssigned,
          crew: prev.crew.map(c => !livingIds.has(c.id) ? { ...c, isAssignedToMine: false } : c),
        };
      }

      const isCurrentlyAssigned = sanitizedAssigned.includes(astronautId);

      if (isCurrentlyAssigned) {
        actionTaken = 'unassigned';
        const nextAssigned = sanitizedAssigned.filter(id => id !== astronautId);
        return {
          ...prev,
          assignedToMine: nextAssigned,
          crew: prev.crew.map(c => c.id === astronautId ? { ...c, isAssignedToMine: false } : c),
        };
      } else {
        const maxAllowed = (prev.difficulty === 'dificil' && !prev.populationExpanded) ? 1 : 2;
        quotaLimit = maxAllowed;
        if (sanitizedAssigned.length >= maxAllowed) {
          actionTaken = 'error_quota';
          return {
            ...prev,
            assignedToMine: sanitizedAssigned,
          };
        }

        if ((member.isShockDisabledDays ?? 0) > 0) {
          actionTaken = 'error_shock';
          return {
            ...prev,
            assignedToMine: sanitizedAssigned,
          };
        }

        const minInBase = prev.difficulty === 'dificil' ? 1 : 2;
        minCrewRequired = minInBase;
        const remainingInBase = livingCrew.length - (sanitizedAssigned.length + 1);
        if (remainingInBase < minInBase) {
          actionTaken = 'error_min_crew';
          return {
            ...prev,
            assignedToMine: sanitizedAssigned,
          };
        }

        actionTaken = 'assigned';
        const nextAssigned = Array.from(new Set([...sanitizedAssigned, astronautId]));
        return {
          ...prev,
          assignedToMine: nextAssigned,
          crew: prev.crew.map(c => c.id === astronautId ? { ...c, isAssignedToMine: true } : c),
        };
      }
    });

    if (actionTaken === 'unassigned') {
      soundFx.playClick();
      showToast('Astronauta regresado al hábitat.');
      addFlightLog('info', 'Astronauta retirado de la mina de hielo criogénico.', 'Astronaut rotated out of cryogenic ice mine.');
    } else if (actionTaken === 'assigned') {
      soundFx.playClick();
      showToast('Astronauta asignado a la mina de hielo criogénico.');
      unlockAchievement('ice_miner');
      addFlightLog('info', 'Mina de hielo criogénico ISRU activada con nuevo personal.', 'ISRU cryogenic ice mine activated with assigned personnel.');
    } else if (actionTaken === 'error_quota') {
      showToast(`La mina ya tiene el cupo de ${quotaLimit} minero(s) asignado(s).`);
    } else if (actionTaken === 'error_shock') {
      soundFx.playAlert();
      showToast('⚠️ Este astronauta está incapacitado por electrocución y no puede salir a minar.');
    } else if (actionTaken === 'error_min_crew') {
      soundFx.playAlert();
      showToast(`¡Regla de Seguridad! No puedes dejar la base desatendida. Al menos ${minCrewRequired} astronauta(s) deben quedarse en el hábitat.`);
      spaceVoice.speak(`Atención. La base requiere al menos ${minCrewRequired} tripulante en el hábitat.`);
    }
  };

  // Advance Day / Sol simulation loop with all requested mechanics
  const handleAdvanceDay = () => {
    if (isAdvancingRef.current) return;
    isAdvancingRef.current = true;

    const maxDays = effectiveTotalDays;

    // If mission already finished, open report and prevent repeated triggers
    if (currentColony.currentDay >= maxDays || currentColony.missionCompleted) {
      soundFx.playVictory();
      setIsReportOpen(true);
      showToast(lang === 'es' ? '¡Misión ya completada! Revisa el certificado oficial de la NASA o reinicia la base.' : 'Mission already completed! Inspect report or restart base.');
      setTimeout(() => { isAdvancingRef.current = false; }, 400);
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
      openWiringModal();
    }

    // 4. BATTERY FAULT & COMM BLACKOUT PROBABILITIES
    let newBatteryFault = currentColony.batteryFault;
    let newBatteryFaultCount = currentColony.batteryFaultCount;
    let newBatteryLockoutSeconds = currentColony.batteryLockoutSeconds;
    let hasSolarFluctuation = false;
    let hasCommBlackout = currentColony.isCommBlackout;

    if (difficulty === 'facil') {
      hasSolarFluctuation = Math.random() < 0.20;
      if (hasSolarFluctuation) {
        showToast('☀️ Fluctuación solar menor detectada. Rendimiento fotovoltaico con variación leve (-15%).');
      }

      if (!newBatteryFault && Math.random() < 0.10 && nextDay > 3) {
        newBatteryFault = true;
        soundFx.playAlert();
        spaceVoice.speak('Calibración preventiva de baterías requerida. Conecta los terminales.');
        showToast('⚡ ¡Calibración preventiva de baterías! Abre el panel de cableado para practicar sin riesgo.');
        openWiringModal();
      }

      if (!hasCommBlackout && Math.random() < 0.12 && nextDay > 4) {
        hasCommBlackout = true;
        soundFx.playAlert();
        spaceVoice.speak('Desfase menor con la Red de Espacio Profundo. Sintoniza la antena.');
        showToast('📡 ¡Desfase en la Red DSN! Sintoniza la frecuencia para ganar +15 pts de Ciencia.');
      }

      if (Math.random() < 0.25) {
        soundFx.playHarvest();
        showToast('🔬 ¡Descubrimiento Científico! Sensores del rover hallaron minerales hidratados (+10 pts Ciencia).');
        addFlightLog('info', 'Anomalía geológica superficial descubierta: +10 pts de Ciencia.', 'Surface geological anomaly detected: +10 Science pts.');
      }

      if (Math.random() < 0.20) {
        showToast('🥬 ¡Brote Excepcional en Veggie OSDR! Cultivo de lechugas espaciales acelerado (+15 Alimentos).');
        addFlightLog('info', 'Brote de nutrientes en invernadero Veggie: +15 raciones de comida fresca.', 'Nutrient surge in Veggie space lab: +15 fresh rations.');
      }

      if (Math.random() < 0.15) {
        showToast('☄️ ¡Espectáculo astronómico! Lluvia de micrometeoritos visible en el horizonte.');
      }
    } else if (difficulty === 'normal') {
      if (!newBatteryFault && Math.random() < 0.15 && nextDay > 2) {
        newBatteryFault = true;
        soundFx.playAlert();
        spaceVoice.speak('¡Alerta en bancos de energía! Cortocircuito detectado en el cableado de baterías.');
        openWiringModal();
      }

      hasSolarFluctuation = Math.random() < 0.25;

      if (!hasCommBlackout && Math.random() < 0.20 && nextDay > 3) {
        hasCommBlackout = true;
        soundFx.playAlert();
        spaceVoice.speak('¡Alerta! Pérdida de señal con la Red de Espacio Profundo. Se requiere sintonizar la antena.');
      }
    } else if (difficulty === 'dificil') {
      if (Math.random() < 0.28 && nextDay > 2) {
        newBatteryFault = true;
        newBatteryFaultCount += 1;
        soundFx.playAlert();
        if (newBatteryFaultCount >= 2) {
          newBatteryLockoutSeconds = 5;
          spaceVoice.speak('¡Sobrecarga doble en baterías! Banco bloqueado por 5 segundos con fuga eléctrica.');
          showToast('⚡ ¡2 FALLOS DE BATERÍA! Bloqueo crítico de 5s: fuga de -4% energía/segundo.');
        } else {
          spaceVoice.speak('¡Alerta eléctrica crítica! Cortocircuito en baterías. Se requieren dos astronautas para reparar.');
          showToast('⚡ ¡FALLO DE BATERÍA! Requiere 2 astronautas para reparar.');
        }
        openWiringModal();
      }

      hasSolarFluctuation = Math.random() < 0.35;

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
        if (!currentColony.populationExpanded && assignedMinersCount >= 1) {
          deltaH2O += Math.round(22 * 0.30);
        } else if (currentColony.populationExpanded && assignedMinersCount >= 2) {
          deltaH2O += Math.round(22 * 0.60);
        }
      }
    }

    let clearedDoubleWater = false;

    currentColony.modules.forEach(mod => {
      if (!mod.isActive) return;

      if (mod.id === 'solar_farm') {
        let efficiency = 1.0;
        if (hasSolarFluctuation) efficiency *= 0.6;
        if (newBatteryFault) efficiency *= 0.1;
        if (newSandstormHalt > 0) efficiency = 0;

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

      const systemThermalEfficiency = isExtreme && mod.category !== 'power' 
        ? (difficulty === 'dificil' ? 0.70 : 0.75) 
        : 1.0;

      if (mod.id === 'greenhouse') {
        let waterMultiplier = 1.0;
        if (currentColony.plantsNeedDoubleWaterOnce) {
          waterMultiplier = 2.0;
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

    const scienceBonusMultiplier = difficulty === 'dificil' ? 1.5 : 1.0;
    let newScience = Math.min(
      MAX_SCIENCE_POINTS,
      currentColony.resources.sciencePoints + Math.round(Math.max(1, deltaScience) * scienceBonusMultiplier)
    );

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

    // 8. OXYGEN 0 DEATH GRACE PERIOD (3-SECOND HARMONIZED DELAY)
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

    // Purge any dead miners from assignedToMine
    const livingCrewIds = new Set(updatedCrew.filter(c => c.status !== 'deceased').map(c => c.id));
    const sanitizedAssignedToMine = Array.from(new Set(currentColony.assignedToMine.filter(id => livingCrewIds.has(id))));

    // Apply colony update with reset daily limits and resource clamping
    updateCurrentColony(prev => ({
      ...prev,
      currentDay: nextDay,
      resources: clampResources({
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
      }, prev.resources),
      hasHarvestedToday: false,
      roverSortiesToday: 0,
      hasQuizCompletedToday: false,
      assignedToMine: sanitizedAssignedToMine,
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

    // 3-second harmonized grace period on 0% Oxygen asphyxiation (locks day advance)
    if (isZeroOxygenGraceTriggered) {
      soundFx.playAlert();
      showToast('⚠️ ¡OXÍGENO AL 0%! 3 segundos de reserva de emergencia antes de asfixia fatal...');
      spaceVoice.speak('¡Peligro letal! Oxígeno al cero por ciento. Asfixia de la tripulación en tres segundos.');

      if (zeroOxygenTimeoutRef.current) {
        clearTimeout(zeroOxygenTimeoutRef.current);
      }

      // isAdvancingRef.current remains true during grace period
      zeroOxygenTimeoutRef.current = setTimeout(() => {
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
            setTimeout(() => {
              setGameOverCause('¡MUERTE DE LA TRIPULACIÓN POR ASFIXIA AL AGOTARSE EL OXÍGENO EN EL HÁBITAT (0% O₂)!');
              setIsGameOverOpen(true);
              spaceVoice.speak('Asfixia confirmada. Todos los signos vitales han cesado. Misión terminada.');
            }, 0);
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
        isAdvancingRef.current = false;
        zeroOxygenTimeoutRef.current = null;
      }, 3000);
      return;
    }

    // Voice & Sound alerts for casualties
    if (totalLivingRemaining === 0) {
      soundFx.playAlert();
      setGameOverCause(latestDeathCause || 'Agotamiento de recursos vitales');
      setIsGameOverOpen(true);
      spaceVoice.speak('Alerta catastrófica. Muerte de toda la tripulación. Misión terminada.');
      setTimeout(() => { isAdvancingRef.current = false; }, 400);
      return;
    } else if (anyDeathOccurred) {
      soundFx.playAlert();
      showToast(`¡BAJA FATAL EN LA TRIPULACIÓN! ${latestDeathName} ha fallecido. Causa: ${latestDeathCause}`);
      spaceVoice.speak(`Alerta médica fatal. El astronauta ${latestDeathName} ha fallecido.`);
    }

    // 6. DYNAMIC MISSION EVENT & SPACE WEATHER SYSTEM (DONKI, MEDA, OSDR, ARTEMIS)
    // DONKI Solar Flare (Class X & CME) is a SUPER RARE RANDOM COSMIC HAZARD, decoupled from regular events.
    // Sols 1 to 5 are strictly 100% IMMUNE to any solar flares across ALL difficulties (Day 3 NEVER triggers solar flare).
    let triggeredEventId: string | null = null;
    const lastEventDay = safeNum(currentColony.lastEventDay, 1, 1, 100);
    const lastSolarFlareDay = safeNum(currentColony.lastSolarFlareDay, 1, 1, 100);
    const daysSinceLastEvent = nextDay - lastEventDay;
    const daysSinceLastSolarFlare = nextDay - lastSolarFlareDay;

    // A. INDEPENDENT SUPER-RARE DONKI SOLAR FLARE (Class X & CME)
    // Real NASA Space Weather: extreme coronal mass ejections are very rare occurrences during a solar cycle.
    // Early Sols (1-5) are 100% IMMUNE across ALL difficulties.
    if (!activeCrisis && nextDay > 5) {
      let isFlareEligible = false;
      let flareChance = 0;

      if (difficulty === 'facil' && nextDay > 15 && daysSinceLastSolarFlare >= 10) {
        isFlareEligible = true;
        flareChance = 0.008; // ~0.8% rare chance per Sol after Day 15
      } else if (difficulty === 'normal' && nextDay > 8 && daysSinceLastSolarFlare >= 8) {
        isFlareEligible = true;
        flareChance = 0.025; // ~2.5% rare chance per Sol after Day 8
      } else if (difficulty === 'dificil' && nextDay > 6 && daysSinceLastSolarFlare >= 7) {
        isFlareEligible = true;
        flareChance = 0.045; // ~4.5% rare chance per Sol after Day 6
      }

      if (isFlareEligible && Math.random() < flareChance) {
        triggeredEventId = 'donki_xflare';
      }
    }

    // B. REGULAR DYNAMIC MISSION EVENTS (OSDR, MEDA, ARTEMIS, COMMS)
    // Only evaluated if no solar flare occurred and not running a dedicated historical crisis scenario.
    // Days 1-3 are protected by launch grace period (nextDay > 3 and daysSinceLastEvent >= 4).
    if (!triggeredEventId && !activeCrisis && nextDay > 3 && daysSinceLastEvent >= 4) {
      const baseChance = difficulty === 'facil' ? 0.15 : difficulty === 'normal' ? 0.22 : 0.30;
      const triggerRoll = Math.random();
      const shouldTrigger = triggerRoll < baseChance || daysSinceLastEvent >= 6;

      if (shouldTrigger) {
        interface EventCandidate {
          id: string;
          weight: number;
        }
        const candidates: EventCandidate[] = [];

        // 1. Martian Dust Storm (MEDA Atmospheric Station):
        if (location === 'mars' && nextDay >= 5) {
          candidates.push({ id: 'mars_dust_storm_meda', weight: 25 });
        }

        // 2. Artemis Lunar Night Approaching:
        if (location === 'moon' && nextDay >= 7 && nextDay <= 16) {
          candidates.push({ id: 'lunar_night_approaching', weight: 30 });
        }

        // 3. OSDR Veggie Chamber Nutrient Imbalance:
        if (nextDay >= 4) {
          candidates.push({ id: 'osdr_veggie_crisis', weight: 25 });
        }

        // 4. Deep Space Comms Latency & ECLSS Pump Anomaly:
        if (nextDay >= 4) {
          candidates.push({ id: 'comm_delay_emergency', weight: location === 'mars' ? 25 : 15 });
        }

        // Filter out the immediate previous event to guarantee variety
        const filtered = candidates.filter(c => c.id !== currentColony.lastEventId);
        const finalPool = filtered.length > 0 ? filtered : candidates;

        if (finalPool.length > 0) {
          const totalWeight = finalPool.reduce((acc, c) => acc + c.weight, 0);
          let rand = Math.random() * totalWeight;
          for (const cand of finalPool) {
            if (rand < cand.weight) {
              triggeredEventId = cand.id;
              break;
            }
            rand -= cand.weight;
          }
          if (!triggeredEventId) {
            triggeredEventId = finalPool[Math.floor(Math.random() * finalPool.length)].id;
          }
        }
      }
    }

    if (triggeredEventId === 'donki_xflare') {
      updateCurrentColony(p => {
        let bunkerUpdatedModules = p.modules;
        if (difficulty === 'dificil') {
          bunkerUpdatedModules = p.modules.map(m => {
            if (m.id === 'storm_bunker' && m.level >= 2) {
              return { ...m, level: m.level - 1 };
            }
            return m;
          });
        }

        let updatedCrew = p.crew;
        if (difficulty === 'dificil') {
          const bunker = p.modules.find(m => m.id === 'storm_bunker');
          const bunkerLvl = bunker?.level || 0;
          const crewDmg = bunkerLvl >= 2 ? 5 : 12;
          updatedCrew = p.crew.map(c => {
            if (c.status === 'deceased') return c;
            const newH = Math.max(1, c.health - crewDmg);
            return {
              ...c,
              health: newH,
              status: newH < 25 ? 'critical' : 'alive',
            };
          });
        }

        return {
          ...p,
          radiationActive: true,
          modules: bunkerUpdatedModules,
          crew: updatedCrew,
          plantsWipedGrowth: difficulty === 'dificil' ? true : p.plantsWipedGrowth,
          plantsNeedDoubleWaterOnce: difficulty === 'dificil' ? true : p.plantsNeedDoubleWaterOnce,
          empStunSeconds: difficulty === 'dificil' ? 1 : 0,
          isCommBlackout: difficulty === 'dificil' ? (Math.random() < 0.5 ? true : p.isCommBlackout) : p.isCommBlackout,
          lastEventDay: nextDay,
          lastSolarFlareDay: nextDay,
          lastEventId: 'donki_xflare',
        };
      });
      soundFx.playAlert();
      const ev = MISSION_EVENTS.find(e => e.id === 'donki_xflare') || MISSION_EVENTS[0];
      setCurrentEvent(ev);
      spaceVoice.speak('¡Alerta de emergencia DONKI! Fulguración solar clase X detectada.');
      addFlightLog(
        'alert',
        `☀️ ALERTA DONKI: Fulguración Solar Clase X y eyección coronal en ${location === 'mars' ? 'Sol' : 'Día'} ${nextDay}. Radiación ionizante elevada.`,
        `☀️ DONKI ALERT: Class X Solar Flare & CME in ${location === 'mars' ? 'Sol' : 'Day'} ${nextDay}. Critical radiation surge.`
      );
    } else if (triggeredEventId === 'mars_dust_storm_meda') {
      updateCurrentColony(p => ({
        ...p,
        lastEventDay: nextDay,
        lastEventId: 'mars_dust_storm_meda',
      }));
      soundFx.playAlert();
      const ev = MISSION_EVENTS.find(e => e.id === 'mars_dust_storm_meda') || MISSION_EVENTS[1];
      setCurrentEvent(ev);
      spaceVoice.speak('¡Alerta de Perseverance MEDA! Tormenta de polvo severa en aproximación.');
      addFlightLog(
        'alert',
        `🌪️ Tormenta de polvo marciana registrada por MEDA en Sol ${nextDay}.`,
        `🌪️ Martian dust storm logged by MEDA on Sol ${nextDay}.`
      );
    } else if (triggeredEventId === 'osdr_veggie_crisis') {
      updateCurrentColony(p => ({
        ...p,
        lastEventDay: nextDay,
        lastEventId: 'osdr_veggie_crisis',
      }));
      soundFx.playAlert();
      const ev = MISSION_EVENTS.find(e => e.id === 'osdr_veggie_crisis') || MISSION_EVENTS[2];
      setCurrentEvent(ev);
      spaceVoice.speak('Alerta biológica OSDR. Desbalance de nutrientes en el invernadero Veggie.');
      addFlightLog(
        'warning',
        `🥬 Anomalía biológica OSDR en cultivo hidropónico (${location === 'mars' ? 'Sol' : 'Día'} ${nextDay}).`,
        `🥬 OSDR biological anomaly in hydroponic chamber (${location === 'mars' ? 'Sol' : 'Day'} ${nextDay}).`
      );
    } else if (triggeredEventId === 'lunar_night_approaching') {
      updateCurrentColony(p => ({
        ...p,
        lastEventDay: nextDay,
        lastEventId: 'lunar_night_approaching',
      }));
      soundFx.playAlert();
      const ev = MISSION_EVENTS.find(e => e.id === 'lunar_night_approaching') || MISSION_EVENTS[3];
      setCurrentEvent(ev);
      spaceVoice.speak('Alerta Artemis. Gran noche lunar aproximándose.');
      addFlightLog(
        'warning',
        `🌑 Aproximación de la noche polar lunar registrada por sensor LRO Diviner (Día ${nextDay}).`,
        `🌑 Approaching polar lunar night recorded by LRO Diviner sensor (Day ${nextDay}).`
      );
    } else if (triggeredEventId === 'comm_delay_emergency') {
      updateCurrentColony(p => ({
        ...p,
        lastEventDay: nextDay,
        lastEventId: 'comm_delay_emergency',
      }));
      soundFx.playAlert();
      const ev = MISSION_EVENTS.find(e => e.id === 'comm_delay_emergency') || MISSION_EVENTS[4];
      setCurrentEvent(ev);
      spaceVoice.speak('Alerta en bomba de electrólisis y latencia en red de espacio profundo.');
      addFlightLog(
        'warning',
        `📡 Desfase de telecomunicaciones DSN y anomalía en bomba de soporte vital (${location === 'mars' ? 'Sol' : 'Día'} ${nextDay}).`,
        `📡 Deep space comms latency & life support pump alert (${location === 'mars' ? 'Sol' : 'Day'} ${nextDay}).`
      );
    } else {
      const advText = lang === 'es'
        ? `Avanzaste al ${location === 'mars' ? 'Sol' : 'Día Lunar'} ${nextDay}. Ciclo completado.`
        : `Advanced to ${location === 'mars' ? 'Sol' : 'Lunar Day'} ${nextDay}.`;
      showToast(advText);
    }

    // Victory check when completing target days for the current mission
    if (nextDay >= maxDays) {
      soundFx.playVictory();
      confetti({ particleCount: 160, spread: 85, origin: { y: 0.5 } });

      // Anti-cheat verification: Supreme commander badge ONLY unlocked if the entire campaign run
      // was strictly played in Hard Mode across full scenario days (not short historical crises!)
      const isFullCampaign = !activeCrisis && nextDay >= currentScenario.targetDays;
      if (difficulty === 'dificil' && currentColony.difficulty === 'dificil' && isFullCampaign) {
        unlockAchievement('supreme_commander');
      }

      updateCurrentColony(prev => ({
        ...prev,
        currentDay: maxDays,
        missionCompleted: true,
      }));

      setIsReportOpen(true);
      spaceVoice.speak('¡Misión cumplida con éxito rotundo! Certificado de comandante emitido por la NASA.');
      addFlightLog(
        'success',
        `¡MISIÓN COMPLETADA CON ÉXITO! Superados los ${maxDays} días en ${location === 'moon' ? 'la Luna' : 'Marte'} (${difficulty.toUpperCase()}).`,
        `MISSION ACCOMPLISHED! Survived ${maxDays} days in ${location === 'moon' ? 'Moon' : 'Mars'} (${difficulty.toUpperCase()}).`
      );
      setTimeout(() => { isAdvancingRef.current = false; }, 400);
      return;
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
    setTimeout(() => { isAdvancingRef.current = false; }, 400);
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
      if (opt.resourceDeltas.sciencePoints !== undefined) nextRes.sciencePoints = Math.max(0, Math.min(MAX_SCIENCE_POINTS, nextRes.sciencePoints + opt.resourceDeltas.sciencePoints));

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
        resources: clampResources(nextRes, prev.resources),
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

  // Botanical harvest callback with daily limit and clamping (water consumed during irrigation)
  const handleBotanicalHarvest = (foodGain: number, scienceGain: number, moraleGain: number, _waterCost: number = 0) => {
    if (isHarvestingRef.current) return;

    if (currentColony.hasHarvestedToday) {
      soundFx.playAlert();
      showToast('⚠️ Ya has realizado la cosecha de este Sol. Los cultivos necesitan tiempo para un nuevo ciclo.');
      return;
    }

    isHarvestingRef.current = true;
    setTimeout(() => { isHarvestingRef.current = false; }, 400);

    const multiplier = difficulty === 'facil' ? 1.5 : 1.0;
    const actualFood = Math.round(foodGain * multiplier);
    const clampedScienceGain = Math.max(0, Math.min(50, scienceGain));
    const clampedMoraleGain = Math.max(0, Math.min(25, moraleGain));

    let harvested = false;
    updateCurrentColony(prev => {
      if (prev.hasHarvestedToday) return prev;

      harvested = true;
      const nextResources = clampResources({
        ...prev.resources,
        food: prev.resources.food + actualFood,
        sciencePoints: prev.resources.sciencePoints + clampedScienceGain,
      }, prev.resources);

      return {
        ...prev,
        hasHarvestedToday: true,
        resources: nextResources,
        crew: prev.crew.map(c => {
          if (c.status === 'deceased') return c;
          return {
            ...c,
            health: Math.min(100, c.health + 5),
            morale: Math.min(100, c.morale + clampedMoraleGain),
          };
        }),
      };
    });

    if (harvested) {
      soundFx.playVictory();
      confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
      const msg = `¡Cosecha fresca servida! +${actualFood} Comida Veggie, +${clampedScienceGain} pts Ciencia OSDR.`;
      showToast(msg);
      spaceVoice.speak('Cosecha fresca servida en el comedor del hábitat. Moral y nutrición restauradas.');
      unlockAchievement('veggie_harvest');
      addFlightLog('success', `Cosecha fresca servida: +${actualFood} comida Veggie, +${clampedScienceGain} pts Ciencia.`, `Fresh harvest served: +${actualFood} Veggie food, +${clampedScienceGain} Science.`);
    }
  };

  // Rover Sortie completed callback with energy deduction, daily limit (max 2 per Sol), and clamping
  const handleRoverSortieComplete = (reward: { batteryCost?: number; water?: number; shield?: number; science?: number; energyBonus?: number }) => {
    if (isSortieSubmittingRef.current) return;

    const sortiesToday = currentColony.roverSortiesToday ?? 0;
    if (sortiesToday >= 2) {
      soundFx.playAlert();
      showToast('⚠️ Límite de expediciones alcanzado: El rover debe recargarse y calibrarse (máximo 2 por Sol).');
      return;
    }

    const cost = Math.max(0, reward.batteryCost ?? 12);
    if (currentColony.resources.energy < cost) {
      soundFx.playAlert();
      showToast(`⚡ Batería insuficiente para la expedición (se requieren ${cost} kWh de energía).`);
      return;
    }

    isSortieSubmittingRef.current = true;
    setTimeout(() => { isSortieSubmittingRef.current = false; }, 400);

    const penalty = difficulty === 'dificil' ? 0.6 : 1.0;
    const scienceMultiplier = difficulty === 'dificil' ? 1.5 : 1.0;

    let sortieSuccess = false;
    updateCurrentColony(prev => {
      const todayCount = prev.roverSortiesToday ?? 0;
      if (todayCount >= 2) return prev;
      if (prev.resources.energy < cost) return prev;

      sortieSuccess = true;
      const energyAfterCost = Math.max(0, prev.resources.energy - cost);
      const nextEnergy = reward.energyBonus 
        ? Math.min(prev.resources.maxEnergy, energyAfterCost + reward.energyBonus) 
        : energyAfterCost;

      const nextResources = clampResources({
        ...prev.resources,
        energy: nextEnergy,
        water: reward.water ? prev.resources.water + Math.round(reward.water * penalty) : prev.resources.water,
        shieldIntegrity: reward.shield ? prev.resources.shieldIntegrity + Math.round(reward.shield * penalty) : prev.resources.shieldIntegrity,
        sciencePoints: reward.science ? prev.resources.sciencePoints + Math.round(reward.science * scienceMultiplier) : prev.resources.sciencePoints,
      }, prev.resources);

      return {
        ...prev,
        roverSortiesToday: todayCount + 1,
        resources: nextResources,
      };
    });

    if (sortieSuccess) {
      soundFx.playVictory();
      confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
      const currentSortieNum = sortiesToday + 1;
      const msg = difficulty === 'dificil'
        ? `¡Expedición ${currentSortieNum}/2 completada! -${cost} kWh energía. Recolección ajustada a terreno hostil (-40% volumen, +50% ciencia).`
        : `¡Expedición ${currentSortieNum}/2 completada con éxito! -${cost} kWh energía. Recursos integrados a la base.`;
      showToast(msg);
      spaceVoice.speak('El rover ha regresado al muelle con las muestras recolectadas.');
      unlockAchievement('rover_sortie');
      addFlightLog('success', `Expedición robótica ISRU ${currentSortieNum}/2 completada (-${cost} kWh).`, `ISRU robotic rover sortie ${currentSortieNum}/2 completed (-${cost} kWh).`);
    }
  };

  // Quiz completed callback with +20 Science bonus & +20% Morale (enforcing score >= 3 and 1 bonus per Sol)
  const handleQuizBonus = (scienceBonus: number, moraleBonus: number, score?: number) => {
    if (isQuizBonusSubmittingRef.current) return;

    if (score !== undefined && score < 3) {
      soundFx.playAlert();
      showToast('Puntuación insuficiente para reclamar el bono NASA STEM (se requiere mínimo 3/5 aciertos).');
      return;
    }

    if (currentColony.hasQuizCompletedToday) {
      soundFx.playAlert();
      showToast('⚠️ Ya has reclamado el bono del Quiz de la NASA para este Sol.');
      return;
    }

    isQuizBonusSubmittingRef.current = true;
    setTimeout(() => { isQuizBonusSubmittingRef.current = false; }, 400);

    const clampedScienceBonus = Math.max(0, Math.min(30, scienceBonus));
    const clampedMoraleBonus = Math.max(0, Math.min(25, moraleBonus));

    let bonusAwarded = false;
    updateCurrentColony(prev => {
      if (prev.hasQuizCompletedToday) return prev;
      bonusAwarded = true;

      const nextResources = clampResources({
        ...prev.resources,
        sciencePoints: prev.resources.sciencePoints + clampedScienceBonus,
      }, prev.resources);

      return {
        ...prev,
        hasQuizCompletedToday: true,
        resources: nextResources,
        crew: prev.crew.map(c => {
          if (c.status === 'deceased') return c;
          return {
            ...c,
            morale: Math.min(100, c.morale + clampedMoraleBonus),
          };
        }),
      };
    });

    if (bonusAwarded) {
      soundFx.playVictory();
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      const msg = `🎉 ¡Desafío Quiz Superado! +${clampedScienceBonus} Puntos de Ciencia Bonus y +${clampedMoraleBonus}% de Ánimo para la tripulación.`;
      showToast(msg);
      spaceVoice.speak('Excelente trabajo en el desafío STEM. Bono de ciencia acreditado y moral de la tripulación aumentada.');
      unlockAchievement('stem_genius');
      addFlightLog('success', `Desafío STEM completado: +${clampedScienceBonus} pts Ciencia NASA y +${clampedMoraleBonus}% Ánimo.`, `STEM challenge passed: +${clampedScienceBonus} NASA Science and +${clampedMoraleBonus}% Morale.`);
    }
  };

  // Emergency Oxygen Deployment with canister charge limits and harmonized grace timer cancellation
  const handleEmergencyO2Injected = () => {
    const currentCharges = currentColony.emergencyO2Charges ?? 2;
    if (currentCharges <= 0) {
      soundFx.playAlert();
      showToast('⚠️ ¡Sin cartuchos de O₂! Se han agotado las 2 cargas de emergencia de la misión.');
      spaceVoice.speak('Cartuchos de oxígeno de emergencia agotados.');
      return;
    }

    // Cancel pending asphyxiation timeout if active!
    if (zeroOxygenTimeoutRef.current) {
      clearTimeout(zeroOxygenTimeoutRef.current);
      zeroOxygenTimeoutRef.current = null;
      isAdvancingRef.current = false;
    }

    let injected = false;
    updateCurrentColony(prev => {
      const charges = prev.emergencyO2Charges ?? 2;
      if (charges <= 0) return prev;
      injected = true;
      const newO2 = Math.min(prev.resources.maxOxygen, prev.resources.oxygen + 35);
      return {
        ...prev,
        resources: {
          ...prev.resources,
          oxygen: newO2,
        },
        emergencyO2Active: true,
        emergencyO2Charges: charges - 1,
      };
    });

    if (injected) {
      soundFx.playHarvest();
      const remainingCharges = currentCharges - 1;
      showToast(`¡Inyección de O₂ de emergencia presurizada (+35% O₂)! Cartuchos restantes: ${remainingCharges}/2.`);
      spaceVoice.speak('Presión de oxígeno normalizada en el hábitat.');
      addFlightLog('warning', `Presurización manual de emergencia activada (+35% O₂). Cartuchos restantes: ${remainingCharges}/2.`, `Emergency O2 pressurization activated (+35% O2). Canisters remaining: ${remainingCharges}/2.`);
    }
  };

  // Wiring repair success callback (requires active fault and is debounced)
  const handleWiringSuccess = () => {
    if (isWiringSubmittingRef.current) return;
    if (!currentColony.batteryFault && !currentColony.wiringErrorActive) {
      setIsWiringOpen(false);
      return;
    }

    isWiringSubmittingRef.current = true;
    setTimeout(() => { isWiringSubmittingRef.current = false; }, 500);

    let hadFault = false;
    updateCurrentColony(prev => {
      if (!prev.batteryFault && !prev.wiringErrorActive) return prev;
      hadFault = true;
      return {
        ...prev,
        batteryFault: false,
        batteryFaultCount: 0,
        batteryLockoutSeconds: 0,
        wiringErrorActive: false,
      };
    });

    if (hadFault) {
      setIsWiringOpen(false);
      soundFx.playVictory();
      showToast('¡Cortocircuito y cableado reparados! Sistemas eléctricos e iluminación al 100%.');
      spaceVoice.speak('Cableado de batería e iluminación restaurados. Carga eléctrica normalizada.');
      unlockAchievement('wire_master');
      addFlightLog('success', 'Cableado de baterías e iluminación restaurado al 100%.', 'Battery wiring and illumination restored 100%.');
    } else {
      setIsWiringOpen(false);
    }
  };

  // Restart after Game Over or manually
  const handleRestartMission = (newDiff?: GameDifficulty) => {
    const diff = newDiff || difficulty;
    setDifficulty(diff);
    setCurrentEvent(null);
    setIsWiringOpen(false);
    setIsGameOverOpen(false);
    setIsReportOpen(false);
    setActiveCrisis(null); // Clear active crisis so it doesn't leak into new games!

    if (zeroOxygenTimeoutRef.current) {
      clearTimeout(zeroOxygenTimeoutRef.current);
      zeroOxygenTimeoutRef.current = null;
    }
    isAdvancingRef.current = false;

    setColonies(all => ({
      ...all,
      [location]: createInitialColonyData(location, diff),
    }));

    const maxDays = location === 'moon' ? 28 : 30;
    showToast(`Misión reiniciada en ${location === 'moon' ? 'la Luna (Día 1/' + maxDays + ')' : 'Marte (Sol 1/' + maxDays + ')'} (Dificultad: ${diff.toUpperCase()}).`);
    spaceVoice.speak('Misión reiniciada. Telemetría lista en plataforma de lanzamiento.');
    addFlightLog('info', `Misión reiniciada en ${location === 'moon' ? 'la Luna' : 'Marte'} (${diff.toUpperCase()}).`, `Mission restarted at ${location === 'moon' ? 'Moon' : 'Mars'} (${diff.toUpperCase()}).`);
  };

  // Restore comms from mini-game (requires active blackout and is debounced)
  const handleRestoreCommunications = () => {
    if (isCommRestoringRef.current) return;
    if (!currentColony.isCommBlackout) return;

    isCommRestoringRef.current = true;
    setTimeout(() => { isCommRestoringRef.current = false; }, 500);

    let wasBlackout = false;
    updateCurrentColony(prev => {
      if (!prev.isCommBlackout) return prev;
      wasBlackout = true;
      return {
        ...prev,
        isCommBlackout: false,
      };
    });

    if (wasBlackout) {
      soundFx.playVictory();
      showToast('¡Enlace con Houston y la Red DSN restablecido con éxito!');
      spaceVoice.speak('Enlace de radio de espacio profundo restablecido.');
      unlockAchievement('dsn_restored');
      addFlightLog('success', 'Enlace de radio DSN restablecido con éxito.', 'DSN radio link successfully restored.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Navbar */}
      <Navbar
        currentDay={currentColony.currentDay}
        totalDays={effectiveTotalDays}
        location={location}
        difficulty={difficulty}
        isMuted={isMuted}
        isVoiceEnabled={isVoiceEnabled}
        activeCrisisTitle={activeCrisisForCurrentLocation ? activeCrisisForCurrentLocation.titleEs : null}
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
        onOpenWiring={openWiringModal}
        onOpenIceMine={() => setIsIceMineOpen(true)}
        onToggleMute={() => setIsMuted(soundFx.toggleMute())}
        onToggleVoice={handleToggleVoice}
        onChangeLocation={handleChangeLocation}
        onChangeDifficulty={handleChangeDifficulty}
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
                onClick={openWiringModal}
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
              onClick={openWiringModal}
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
          totalDays={effectiveTotalDays}
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
        totalDays={effectiveTotalDays}
        difficulty={difficulty}
        resources={currentColony.resources}
        crew={currentColony.crew}
        lang={lang}
        commanderName={commanderProfile.name}
        commanderPatch={commanderProfile.patch}
        onRestart={handleRestartMission}
      />

      <BotanicalLabModal
        isOpen={isBotanicalLabOpen}
        onClose={() => setIsBotanicalLabOpen(false)}
        onHarvest={handleBotanicalHarvest}
        currentWater={currentColony.resources.water}
        currentEnergy={currentColony.resources.energy}
        lang={lang}
        onDeductWater={(cost) => {
          updateCurrentColony(prev => ({
            ...prev,
            resources: clampResources({
              ...prev.resources,
              water: Math.max(0, prev.resources.water - cost),
            }, prev.resources),
          }));
        }}
        hasHarvestedToday={currentColony.hasHarvestedToday}
        plantsNeedDoubleWaterOnce={currentColony.plantsNeedDoubleWaterOnce}
        plantsWipedGrowth={currentColony.plantsWipedGrowth}
        currentDay={currentColony.currentDay}
      />

      <RoverMissionModal
        isOpen={isRoverMissionOpen}
        onClose={() => setIsRoverMissionOpen(false)}
        location={location}
        currentEnergy={currentColony.resources.energy}
        onCompleteSortie={handleRoverSortieComplete}
        lang={lang}
        sortiesToday={currentColony.roverSortiesToday ?? 0}
      />

      <HistoricalCrisesModal
        isOpen={isHistoricalCrisesOpen}
        onClose={() => setIsHistoricalCrisesOpen(false)}
        onSelectCrisis={(crisis) => {
          setActiveCrisis(crisis);
          setLocation(crisis.location);
          setColonies(all => {
            const baseColony = all[crisis.location] || createInitialColonyData(crisis.location, difficulty);
            return {
              ...all,
              [crisis.location]: {
                ...baseColony,
                currentDay: 1,
                missionCompleted: false,
                resources: { ...baseColony.resources, ...crisis.initialOverrides },
                radiationActive: crisis.specialCondition === 'extreme_radiation',
                dustStormActive: crisis.specialCondition === 'solar_blackout',
              },
            };
          });
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
          const clampedPts = Math.max(0, Math.min(50, pts));
          updateCurrentColony(prev => ({
            ...prev,
            resources: {
              ...prev.resources,
              sciencePoints: Math.min(MAX_SCIENCE_POINTS, prev.resources.sciencePoints + clampedPts),
            },
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
      {currentColony.isCommBlackout && (
        <CommMiniGameModal
          key={`comm_${location}_${currentColony.currentDay}`}
          isOpen={currentColony.isCommBlackout}
          onRestoreComm={handleRestoreCommunications}
          lang={lang}
        />
      )}

      {/* Wiring Mini-Game Modal (Battery Short-Circuit & Sudden Light Drop) */}
      {isWiringOpen && (
        <WiringMiniGameModal
          key={`wiring_${location}_${wiringSessionId}`}
          isOpen={isWiringOpen}
          onSuccess={handleWiringSuccess}
          onClose={() => setIsWiringOpen(false)}
          lang={lang}
          difficulty={difficulty}
          batteryLockoutSeconds={currentColony.batteryLockoutSeconds}
          availableCrewCount={currentColony.crew.filter(c => c.status !== 'deceased' && !currentColony.assignedToMine.includes(c.id) && (c.isShockDisabledDays ?? 0) <= 0).length}
          onShockCrew={handleShockCrew}
        />
      )}

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
