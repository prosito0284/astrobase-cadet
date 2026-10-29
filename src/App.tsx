import React, { useState, useEffect } from 'react';
import { 
  BaseLocation, 
  GameDifficulty, 
  ResourceState, 
  BaseModule, 
  MissionEvent, 
  MissionEventOption, 
  Astronaut 
} from './types/game';
import { SCENARIOS } from './data/scenarios';
import { INITIAL_MODULES } from './data/modules';
import { INITIAL_CREW } from './data/crew';
import { MISSION_EVENTS } from './data/events';
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
import { soundFx } from './utils/audio';
import confetti from 'canvas-confetti';
import { AlertTriangle, Sparkles, CheckCircle2, ChevronRight, Info } from 'lucide-react';

export function App() {
  const [lang, setLang] = useState<'es' | 'en'>('es');
  const [location, setLocation] = useState<BaseLocation>('moon');
  const [difficulty, setDifficulty] = useState<GameDifficulty>('cadet');
  const [currentDay, setCurrentDay] = useState(1);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>('life_support');

  // Load Scenario
  const currentScenario = SCENARIOS.find(s => s.location === location) || SCENARIOS[0];

  // Game state
  const [resources, setResources] = useState<ResourceState>(currentScenario.initialResources);
  const [modules, setModules] = useState<BaseModule[]>(INITIAL_MODULES);
  const [crew, setCrew] = useState<Astronaut[]>(INITIAL_CREW);
  const [currentEvent, setCurrentEvent] = useState<MissionEvent | null>(null);

  // Environmental conditions
  const [radiationActive, setRadiationActive] = useState(false);
  const [dustStormActive, setDustStormActive] = useState(false);
  const [isLunarNight, setIsLunarNight] = useState(false);

  // Modals & UI
  const [isMuted, setIsMuted] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Show Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Switch location handler
  const handleChangeLocation = (newLoc: BaseLocation) => {
    setLocation(newLoc);
    const scen = SCENARIOS.find(s => s.location === newLoc) || SCENARIOS[0];
    setCurrentDay(1);
    setResources(scen.initialResources);
    setModules(INITIAL_MODULES);
    setRadiationActive(false);
    setDustStormActive(false);
    setIsLunarNight(false);
    showToast(
      lang === 'es' 
        ? `Iniciando misión en ${scen.titleEs}` 
        : `Launching mission to ${scen.titleEn}`
    );
  };

  // Toggle Module Power
  const handleToggleModule = (id: string) => {
    setModules(prev =>
      prev.map(mod => {
        if (mod.id === id) {
          return { ...mod, isActive: !mod.isActive };
        }
        return mod;
      })
    );
  };

  // Upgrade Module Level
  const handleUpgradeModule = (id: string) => {
    const mod = modules.find(m => m.id === id);
    if (!mod || mod.level >= mod.maxLevel) return;

    if (resources.sciencePoints < 10) {
      showToast(lang === 'es' ? '¡Necesitas al menos 10 puntos de Ciencia para investigar la mejora!' : 'Need at least 10 Science points to upgrade!');
      return;
    }

    setResources(r => ({
      ...r,
      sciencePoints: r.sciencePoints - 10,
    }));

    setModules(prev =>
      prev.map(m => {
        if (m.id === id) {
          return { ...m, level: m.level + 1 };
        }
        return m;
      })
    );

    showToast(lang === 'es' ? `¡Módulo ${mod.nameEs} mejorado al Nivel ${mod.level + 1}!` : `${mod.name} upgraded to Level ${mod.level + 1}!`);
  };

  // Advance Day / Sol simulation loop
  const handleAdvanceDay = () => {
    if (currentDay >= currentScenario.targetDays) {
      soundFx.playVictory();
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
      setIsReportOpen(true);
      return;
    }

    const nextDay = currentDay + 1;
    setCurrentDay(nextDay);

    // Weather cycles:
    // Moon: days 10-18 are lunar night
    const isNightNow = location === 'moon' && nextDay >= 10 && nextDay <= 18;
    setIsLunarNight(isNightNow);

    // Mars: days 5-8 have dust storm
    const isDustNow = location === 'mars' && nextDay >= 5 && nextDay <= 8;
    setDustStormActive(isDustNow);

    // Calculate energy production & consumption
    let totalProd = 0;
    let totalCons = 0;
    let deltaO2 = 0;
    let deltaH2O = 0;
    let deltaFood = 0;
    let deltaShield = 0;
    let deltaScience = 0;

    modules.forEach(mod => {
      if (!mod.isActive) return;

      // Power calculation
      if (mod.id === 'solar_farm') {
        if (isNightNow) {
          // Lunar night: 0 solar power
          totalProd += 0;
        } else if (isDustNow) {
          // Martian dust storm: 75% reduction
          totalProd += Math.abs(mod.powerRequired * mod.level * 0.25);
        } else {
          totalProd += Math.abs(mod.powerRequired * mod.level);
        }
      } else if (mod.powerRequired > 0) {
        totalCons += mod.powerRequired * mod.level;
      }

      // Resources deltas
      deltaO2 += mod.oxygenDelta * mod.level;
      deltaH2O += mod.waterDelta * mod.level;
      deltaFood += mod.foodDelta * mod.level;
      deltaShield += mod.shieldDelta;
      deltaScience += mod.scienceDelta * mod.level;
    });

    // Human consumption (4 crew members)
    deltaO2 -= 10;   // Crew breathing
    deltaH2O -= 8;   // Drinking & hygiene
    deltaFood -= 8;  // Nutrition

    const netPower = totalProd - totalCons;

    setResources(prev => {
      let newEnergy = prev.energy + netPower * 0.4;
      let newOxygen = prev.oxygen + deltaO2;
      let newWater = prev.water + deltaH2O;
      let newFood = prev.food + deltaFood;
      let newShield = Math.min(100, Math.max(20, deltaShield));
      let newRad = prev.radiationExposure + (radiationActive ? 6 : 0.5);
      let newScience = prev.sciencePoints + Math.max(1, deltaScience);

      // Clamp values
      newEnergy = Math.max(0, Math.min(prev.maxEnergy, newEnergy));
      newOxygen = Math.max(0, Math.min(prev.maxOxygen, newOxygen));
      newWater = Math.max(0, Math.min(prev.maxWater, newWater));
      newFood = Math.max(0, Math.min(prev.maxFood, newFood));

      return {
        ...prev,
        energy: newEnergy,
        energyProduction: Math.round(totalProd),
        energyConsumption: Math.round(totalCons),
        oxygen: newOxygen,
        water: newWater,
        food: newFood,
        shieldIntegrity: newShield,
        radiationExposure: parseFloat(newRad.toFixed(1)),
        sciencePoints: newScience,
      };
    });

    // Crew health update
    setCrew(prevCrew =>
      prevCrew.map(c => {
        let healthMod = 0;
        let moraleMod = 0;

        if (resources.oxygen < 30) healthMod -= 10;
        if (resources.water < 20) healthMod -= 8;
        if (resources.energy === 0) healthMod -= 12; // Freezing!
        if (radiationActive && resources.shieldIntegrity < 50) healthMod -= 10;

        if (resources.food > 60) moraleMod += 2;
        if (resources.oxygen > 60) moraleMod += 1;
        if (resources.energy < 20) moraleMod -= 5;

        return {
          ...c,
          health: Math.max(10, Math.min(100, c.health + healthMod)),
          morale: Math.max(10, Math.min(100, c.morale + moraleMod)),
        };
      })
    );

    // Trigger Mission Events on specific days
    if (nextDay === 3) {
      setRadiationActive(true);
      soundFx.playAlert();
      const ev = MISSION_EVENTS.find(e => e.id === 'donki_xflare') || MISSION_EVENTS[0];
      setCurrentEvent(ev);
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
    } else if (nextDay === 12) {
      soundFx.playAlert();
      const ev = MISSION_EVENTS.find(e => e.id === 'comm_delay_emergency') || MISSION_EVENTS[4];
      setCurrentEvent(ev);
    } else if (nextDay === 15) {
      soundFx.playAlert();
      const ev = MISSION_EVENTS.find(e => e.id === 'osdr_bone_density_loss') || MISSION_EVENTS[5];
      setCurrentEvent(ev);
    } else {
      showToast(
        lang === 'es'
          ? `Avanzaste al ${location === 'mars' ? 'Sol' : 'Día Lunar'} ${nextDay}. Los subsistemas completaron su ciclo diario.`
          : `Advanced to ${location === 'mars' ? 'Sol' : 'Lunar Day'} ${nextDay}. Systems completed diurnal cycle.`
      );
    }
  };

  // Handle Event Option chosen
  const handleSelectEventOption = (opt: MissionEventOption) => {
    // Apply resource changes
    setResources(prev => {
      const next = { ...prev };
      if (opt.resourceDeltas.energy !== undefined) next.energy = Math.max(0, Math.min(100, next.energy + opt.resourceDeltas.energy));
      if (opt.resourceDeltas.oxygen !== undefined) next.oxygen = Math.max(0, Math.min(100, next.oxygen + opt.resourceDeltas.oxygen));
      if (opt.resourceDeltas.water !== undefined) next.water = Math.max(0, Math.min(100, next.water + opt.resourceDeltas.water));
      if (opt.resourceDeltas.food !== undefined) next.food = Math.max(0, Math.min(100, next.food + opt.resourceDeltas.food));
      if (opt.resourceDeltas.radiationExposure !== undefined) next.radiationExposure += opt.resourceDeltas.radiationExposure;
      if (opt.resourceDeltas.shieldIntegrity !== undefined) next.shieldIntegrity = Math.max(0, Math.min(100, next.shieldIntegrity + opt.resourceDeltas.shieldIntegrity));
      if (opt.resourceDeltas.sciencePoints !== undefined) next.sciencePoints = Math.max(0, next.sciencePoints + opt.resourceDeltas.sciencePoints);
      return next;
    });

    // Apply crew health & morale
    if (opt.crewHealthDelta || opt.crewMoraleDelta) {
      setCrew(prev =>
        prev.map(c => ({
          ...c,
          health: Math.max(10, Math.min(100, c.health + (opt.crewHealthDelta || 0))),
          morale: Math.max(10, Math.min(100, c.morale + (opt.crewMoraleDelta || 0))),
        }))
      );
    }

    // Dismiss event modal
    setCurrentEvent(null);
    setRadiationActive(false);

    showToast(
      lang === 'es'
        ? `Decisión ejecutada: ${opt.educationalTakeawayEs}`
        : `Order executed: ${opt.educationalTakeawayEn}`
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Navbar */}
      <Navbar
        currentDay={currentDay}
        totalDays={currentScenario.targetDays}
        location={location}
        difficulty={difficulty}
        isMuted={isMuted}
        onAdvanceDay={handleAdvanceDay}
        onOpenDossier={() => setIsDossierOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenReport={() => setIsReportOpen(true)}
        onToggleMute={() => setIsMuted(soundFx.toggleMute())}
        onChangeLocation={handleChangeLocation}
        onChangeDifficulty={setDifficulty}
        lang={lang}
        onToggleLang={() => setLang(l => (l === 'es' ? 'en' : 'es'))}
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-cyan-900 to-indigo-900 border border-cyan-400 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-cyan-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 space-y-4">
        {/* Scenario Banner / Subtitle */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-xl">{location === 'moon' ? '🌕' : '🔴'}</span>
            <div>
              <span className="font-black text-cyan-300">
                {lang === 'es' ? currentScenario.titleEs : currentScenario.titleEn}
              </span>
              <span className="text-slate-400 ml-2 hidden sm:inline">
                ({lang === 'es' ? currentScenario.subtitleEs : currentScenario.subtitleEn})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span>Latencia DSN:</span>
            <span className="font-mono font-bold text-amber-300">
              {lang === 'es' ? currentScenario.commDelayTextEs : currentScenario.commDelayTextEn}
            </span>
          </div>
        </div>

        {/* 1. RESOURCE TELEMETRY GAUGES */}
        <ResourceDashboard resources={resources} lang={lang} />

        {/* 2. BASE VIEW (Interactive Visual Simulation) */}
        <BaseView
          location={location}
          modules={modules}
          currentDay={currentDay}
          totalDays={currentScenario.targetDays}
          radiationActive={radiationActive}
          dustStormActive={dustStormActive}
          isLunarNight={isLunarNight}
          onSelectModule={(id) => setSelectedModuleId(id)}
          selectedModuleId={selectedModuleId}
          lang={lang}
        />

        {/* 3. MODULE POWER & SYSTEM CONTROL */}
        <ModuleControl
          modules={modules}
          selectedModuleId={selectedModuleId}
          onSelectModule={(id) => setSelectedModuleId(id)}
          onToggleModule={handleToggleModule}
          onUpgradeModule={handleUpgradeModule}
          onRepairModule={() => {}}
          lang={lang}
        />

        {/* 4. CREW ROSTER & HEALTH (NASA OSDR / Biological telemetry) */}
        <CrewPanel crew={crew} lang={lang} />

        {/* 5. DEEP SPACE COMMUNICATIONS TERMINAL (Speed-of-light delay & autonomy) */}
        <CommCenter
          location={location}
          currentDay={currentDay}
          oxygenLevel={resources.oxygen}
          energyLevel={resources.energy}
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
        currentDay={currentDay}
        totalDays={currentScenario.targetDays}
        difficulty={difficulty}
        resources={resources}
        crew={crew}
        lang={lang}
      />

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>
            {lang === 'es' 
              ? 'Desarrollado para el Desafío: Simulador de misiones para astronautas jóvenes' 
              : 'Built for the Youth Astronaut Mission Simulator Challenge'}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-cyan-400 font-bold">NASA Open Data (DONKI • OSDR • Artemis • Perseverance MEDA)</span>
            <span>•</span>
            <button 
              onClick={() => setIsDossierOpen(true)}
              className="text-amber-400 hover:underline font-bold"
            >
              {lang === 'es' ? 'Ver Referencias Científicas' : 'View Science References'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
