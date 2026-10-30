# Handoff Report: Core Architecture, State Progression & Exploit Audit

**Agent**: Explorer 1 (`teamwork_explorer`)  
**Scope**: Core application architecture, state management, main game loops, and resource progression in *Astrobase Cadet* (`src/App.tsx`, `src/data/`, minigame/feature modals, state stores, and utilities).  
**Date**: 2026-10-30  
**Target File**: `c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\explorer_survey_1\handoff.md`

---

## 1. Observation

### 1.1 Architectural Overview of Astrobase Cadet
- **Framework & Runtime**: React 19 (`react: ^19.3.1`, `react-dom: ^19.3.1`), Vite 8 (`vite: ^8.3.5`), TypeScript 7 (`typescript: ~7.0.2`), Tailwind CSS 4.
- **State Architecture**: Client-side monolithic state centered in `src/App.tsx`.
  - State stores: `colonies` (`{ moon: ColonySaveData; mars: ColonySaveData }`), `location` (`moon` | `mars`), `difficulty` (`facil` | `normal` | `dificil`), `commanderProfile`, `achievements`, `flightLog`.
  - Persistence: Browser `localStorage` via keys `astrobase_dual_save_v6`, `astrobase_location_v2`, `astrobase_difficulty_v2`, `astrobase_commander_v1`, `astrobase_achievements_v1`, `astrobase_flightlog_v1`.
  - Minigame & Modal interaction: Stateless sub-modals (`BotanicalLabModal`, `RoverMissionModal`, `NasaQuizModal`, `WiringMiniGameModal`, `IceMineModal`, `PopulationExpansionModal`, `CommMiniGameModal`, `EventModal`, `MissionReportModal`) communicate with parent state via callback props (`onHarvest`, `onCompleteSortie`, `onAddSciencePoints`, `onQuizBonus`, `onSuccess`, `onConfirmExpansion`, etc.).

---

### 1.2 Vulnerability & Exploit Catalog

#### Vulnerability 1: Botanical Lab — Unmetered Irrigation & Infinite Resource Harvest Loop
- **File**: `src/components/BotanicalLabModal.tsx` (Lines 124–139, 363–379) and `src/App.tsx` (Lines 1186–1212)
- **Code Snippet**:
  ```tsx
  // src/components/BotanicalLabModal.tsx:124-132
  const handleWaterCrop = () => {
    if (currentWater < 5) return;
    soundFx.playHarvest();
    setIsWatering(true);
    setTimeout(() => {
      setIsWatering(false);
      setGrowthProgress(prev => Math.min(100, prev + 25));
    }, 600);
  };

  // src/components/BotanicalLabModal.tsx:134-139
  const handleHarvestClick = () => {
    soundFx.playVictory();
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    onHarvest(25, 15, 12);
    setGrowthProgress(15);
  };
  ```
- **Observed Behavior**:
  1. `handleWaterCrop` verifies `if (currentWater < 5) return;`, but **never deducts water**. There is no callback or state mutator passed to consume water.
  2. Each water click grants +25% crop progress. Reaching $\ge 80\%$ unlocks `¡Cosechar y Servir!`.
  3. `onHarvest(25, 15, 12)` awards $+25$ food (multiplied to $+37$ in Easy mode), $+15$ science points, $+5$ health to all living crew, and $+12$ morale.
  4. After harvest, `growthProgress` resets to $15\%$. The player can immediately click "Regar" 3 times for $0$ water cost and harvest again without advancing a single Sol.
  5. There is no daily harvest limit, no cooldown, and no concurrency lockout on `handleHarvestClick`.
- **Reproduction Vector**: Open the Botanical Lab on Day 1. Click "Regar con Agua (-5L)" (observe water does not decrease). Once at $90\%$, click "¡Cosechar y Servir!". Repeat 20 times. Within 30 seconds on Day 1, food hits 100, crew health hits 100%, morale hits 100%, and science points reach $300+$.

---

#### Vulnerability 2: Rover Mission Sorties — Free Expeditions (Zero Battery Cost & Uncapped Spawning)
- **File**: `src/components/RoverMissionModal.tsx` (Lines 157–179) and `src/App.tsx` (Lines 1215–1235)
- **Code Snippet**:
  ```tsx
  // src/components/RoverMissionModal.tsx:157-178
  const handleLaunchSortie = () => {
    if (currentEnergy < activeTarget.batteryCost) return;
    soundFx.playHarvest();
    setIsDeploying(true);

    setTimeout(() => {
      setIsDeploying(false);
      soundFx.playVictory();
      confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });

      if (activeTarget.rewardType === 'water') {
        onCompleteSortie({ water: activeTarget.rewardAmount });
      } else if (activeTarget.rewardType === 'shield') {
        onCompleteSortie({ shield: activeTarget.rewardAmount });
      } else if (activeTarget.rewardType === 'science') {
        onCompleteSortie({ science: activeTarget.rewardAmount });
      } else if (activeTarget.rewardType === 'energy') {
        onCompleteSortie({ energyBonus: activeTarget.rewardAmount });
      }

      onClose();
    }, 1200);
  };
  ```
- **Observed Behavior**:
  1. `handleLaunchSortie` checks `if (currentEnergy < activeTarget.batteryCost) return;`, but **never deducts the battery cost**.
  2. In `src/App.tsx`, `handleRoverSortieComplete` only adds rewards (`prev.resources.water + ...`, `sciencePoints + ...`, `energy + ...`). It never subtracts `activeTarget.batteryCost`.
  3. No cooldown, daily limit, or sortie capacity exists.
  4. Selecting energy targets (e.g. *Malapert Mountain* $+15$ energy, or *Séítah* $+18$ energy) actually generates free power.
  5. Race condition: If a player selects target A, clicks launch, and quickly selects target B within the 1200ms `setTimeout`, `activeTarget` evaluates to target B when resolving the callback.
- **Reproduction Vector**: On Sol 1, open Rover Sortie Command. Click "¡Despachar Expedición!". Reopen immediately after the modal closes. Launch again. Collect unlimited water, max shield, and unbounded science points for zero energy consumption.

---

#### Vulnerability 3: NASA Quiz — Double Science Reward Stacking & Infinite Retry Loop
- **File**: `src/components/NasaQuizModal.tsx` (Lines 174–183, 328–333) and `src/App.tsx` (Lines 1239–1260, 1604–1610)
- **Code Snippet**:
  ```tsx
  // src/components/NasaQuizModal.tsx:174-182
  // Finished quiz!
  setIsCompleted(true);
  soundFx.playVictory();
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
  const scienceEarned = score * 10;
  onAddSciencePoints(scienceEarned);
  // Give the requested +20 science bonus and +20% crew morale!
  onQuizBonus(20, 20);
  ```
- **Observed Behavior**:
  1. Double payout: `onAddSciencePoints(scienceEarned)` awards $10 \times \text{score}$ (up to $+50$ science), and `onQuizBonus(20, 20)` immediately awards ANOTHER $+20$ science and $+20\%$ crew morale. Total payout is $+70$ science points instead of the designed $+20$.
  2. Infinite Retry Farm: The completion screen renders `handleRestart`:
     ```tsx
     const handleRestart = () => {
       setCurrentQuestionIndex(0);
       setSelectedAnswer(null);
       setIsAnswered(false);
       setScore(0);
       setIsCompleted(false);
     };
     ```
     The player can immediately click "Reintentar Quiz" on the same day, answer the questions, and receive another $+70$ science points and $+20\%$ morale without limit.
- **Reproduction Vector**: Open Quiz modal on Sol 1. Answer 5 questions correctly. View results ($+70$ science, $+20\%$ morale awarded). Click "Reintentar Quiz". Repeat 5 times to acquire $350+$ science points on Sol 1.

---

#### Vulnerability 4: Module Upgrade — React Functional Updater Race Condition & Underflow
- **File**: `src/App.tsx` (Lines 405–438)
- **Code Snippet**:
  ```tsx
  const handleUpgradeModule = (id: string) => {
    const mod = currentColony.modules.find(m => m.id === id);
    if (!mod || mod.level >= mod.maxLevel) return;

    const isBunker = mod.id === 'storm_bunker';
    const requiredCost = (difficulty === 'dificil' && isBunker) ? 20 : 10;

    if (currentColony.resources.sciencePoints < requiredCost) {
      // toast...
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
  ```
- **Observed Behavior**:
  1. The checks `currentColony.resources.sciencePoints < requiredCost` and `mod.level >= mod.maxLevel` occur outside the updater against stale closure state.
  2. Rapidly clicking the upgrade button enqueues multiple update transactions before React triggers a render pass with the updated resource count.
  3. Every transaction deducts `requiredCost` and increments `level`.
  4. If a user with 10 science points clicks "Upgrade" 4 times rapidly, science points drop to $10 - 40 = -30$ (underflow into negative science), and the module upgrades beyond its cap ($4 / 3$).
- **Reproduction Vector**: Obtain 10 science points. Rapidly double/triple-click "Mejorar (10 pts)". Notice science points become negative and module level exceeds `maxLevel`.

---

#### Vulnerability 5: Historical Crisis Achievement Skip — "Supreme Commander" Unlocked in 5 Sols
- **File**: `src/App.tsx` (Lines 160–162, 1108–1130, 1574–1598) and `src/data/historicalCrises.ts` (Lines 108–133)
- **Code Snippet**:
  ```tsx
  // src/App.tsx:160-161
  const activeCrisisForCurrentLocation = activeCrisis && activeCrisis.location === location ? activeCrisis : null;
  const effectiveTotalDays = activeCrisisForCurrentLocation ? activeCrisisForCurrentLocation.targetDays : currentScenario.targetDays;

  // src/App.tsx:560, 1108-1115
  const maxDays = effectiveTotalDays;
  ...
  if (nextDay >= maxDays) {
    soundFx.playVictory();
    confetti({ particleCount: 160, spread: 85, origin: { y: 0.5 } });

    // Anti-cheat verification: Supreme commander badge ONLY unlocked if the entire run was strictly played in Hard Mode
    if (difficulty === 'dificil' && currentColony.difficulty === 'dificil') {
      unlockAchievement('supreme_commander');
    }
  ```
- **Observed Behavior**:
  1. "Supreme Commander" (`supreme_commander`) is intended for surviving the full 28/30-day campaign on Hard Mode ("Supervivencia Extrema").
  2. Selecting the Apollo 13 crisis (`apollo_13_scrubber`) sets `effectiveTotalDays = 5`.
  3. Reaching Day 5 evaluates `nextDay >= maxDays` as true, triggering full victory and granting `supreme_commander` in only 5 days instead of 28/30 days.
- **Reproduction Vector**: Switch difficulty to Hard. Open "Crisis Históricas" -> select "Apolo 13: La Crisis de CO2" (5 days). Advance Day 5 times. The mission completes and awards the Supreme Commander medal.

---

#### Vulnerability 6: Permanent Battery Lockout & Shock Loop (Missing Countdown Timer)
- **File**: `src/App.tsx` (Lines 676–680, 1001) and `src/components/WiringMiniGameModal.tsx` (Lines 63–70, 163)
- **Code Snippet**:
  ```tsx
  // src/App.tsx:676-680
  if (newBatteryFaultCount >= 2) {
    newBatteryLockoutSeconds = 5; // 5s critical lockout with -4%/sec drain!
    spaceVoice.speak('¡Sobrecarga doble en baterías! Banco bloqueado por 5 segundos con fuga eléctrica.');
    showToast('⚡ ¡2 FALLOS DE BATERÍA! Bloqueo crítico de 5s: fuga de -4% energía/segundo.');
  }

  // src/components/WiringMiniGameModal.tsx:63-69
  const isLockedOut = batteryLockoutSeconds > 0;
  const handleSelectLeft = (id: string) => {
    if (isLockedOut) {
      soundFx.playAlert();
      onShockCrew?.();
      return;
    }
  ```
- **Observed Behavior**:
  1. When 2 battery faults occur in Hard mode, `batteryLockoutSeconds` is initialized to 5.
  2. **No timer ticker, countdown interval, or day decrement exists** for `batteryLockoutSeconds`.
  3. `batteryLockoutSeconds` remains 5 permanently.
  4. `isLockedOut` is permanently `true`. Any click inside the wiring minigame triggers `onShockCrew`, dealing $50\%$ health damage and incapacitating the crew.
  5. The claimed "-4%/sec energy drain" is not implemented in any game loop.
- **Reproduction Vector**: Enter Hard mode. Trigger battery faults on consecutive days until count $\ge 2$. Open the wiring panel. Notice the lockout never expires. Any interaction shocks and wipes out the crew.

---

#### Vulnerability 7: Permanent Solar EMP Stun Freeze Banner
- **File**: `src/App.tsx` (Lines 1080, 1441–1446)
- **Code Snippet**:
  ```tsx
  // src/App.tsx:1080
  empStunSeconds: difficulty === 'dificil' ? 1 : 0,

  // src/App.tsx:1441-1446
  {currentColony.empStunSeconds > 0 && (
    <div className="bg-red-950/90 border-2 border-red-500 text-red-200 text-center py-2 px-4 rounded-xl font-black animate-pulse flex items-center justify-center gap-2 shadow-lg shadow-red-950">
      <Zap className="w-5 h-5 text-amber-400 animate-spin" />
      <span>⚡ ¡PULSO ELECTROMAGNÉTICO SOLAR: TODOS LOS SISTEMAS INHABILITADOS TEMPORALMENTE (1s)!</span>
    </div>
  )}
  ```
- **Observed Behavior**:
  1. On Day 3 in Hard mode, `empStunSeconds` is set to 1.
  2. No timer or reset mechanism decrements or clears `empStunSeconds`.
  3. The red EMP alert banner remains permanently displayed for the remainder of the 30-day mission.
- **Reproduction Vector**: Play Hard mode to Day 3. The EMP banner appears and never disappears.

---

#### Vulnerability 8: Day Advance Spam & 0% Oxygen Victory Exploit
- **File**: `src/App.tsx` (Lines 559–570, 1014–1046) and `src/components/Navbar.tsx` (Lines 208–218)
- **Code Snippet**:
  ```tsx
  // src/App.tsx:1015-1045
  if (isZeroOxygenGraceTriggered) {
    soundFx.playAlert();
    showToast('⚠️ ¡OXÍGENO AL 0%! 1 segundo de reserva en esclusas antes de asfixia fatal...');

    setTimeout(() => {
      setColonies(all => {
        const current = all[location];
        if (current.resources.oxygen <= 0) {
          // Asphyxiation and Game Over...
        }
      });
    }, 1000);
    return;
  }
  ```
- **Observed Behavior**:
  1. The "Siguiente Día" button in `Navbar.tsx` lacks debounce and remains enabled while `handleAdvanceDay` is active.
  2. When oxygen hits $0\%$, a 1000ms grace period timeout is scheduled.
  3. During this 1000ms window, the player can spam the "Siguiente Día" button.
  4. If the colony is on Day 27, spamming advances Day to 28, triggering `nextDay >= maxDays` and conferring full Victory despite zero oxygen.
- **Reproduction Vector**: Reach Day 27 with dwindling oxygen. Click advance day until O2 hits 0. Rapidly spam click "Siguiente Día" during the 1-second warning. The mission awards victory.

---

#### Vulnerability 9: Dead Astronaut Ghost Slot in Cryogenic Ice Mine
- **File**: `src/App.tsx` (Lines 502–556, 879–974) and `src/components/IceMineModal.tsx` (Lines 42–47, 152–209)
- **Code Snippet**:
  ```tsx
  // src/App.tsx:524-528
  const maxAllowed = (difficulty === 'dificil' && !currentColony.populationExpanded) ? 1 : 2;
  if (currentColony.assignedToMine.length >= maxAllowed) {
    showToast(`La mina ya tiene el cupo de ${maxAllowed} minero(s) asignado(s).`);
    return;
  }
  ```
- **Observed Behavior**:
  1. `assignedToMine` stores astronaut IDs.
  2. When an astronaut assigned to the mine dies, their ID is **not removed from `assignedToMine`**.
  3. `assignedToMine.length` continues to count the deceased member.
  4. In `IceMineModal.tsx`, the deceased astronaut is filtered out of `livingCrew` and cannot be recalled.
  5. The mine slot is permanently locked by a "ghost" deceased astronaut, preventing alive crew from being assigned.
- **Reproduction Vector**: Assign an astronaut to the ice mine. Allow that astronaut's health to reach 0. Open the Ice Mine modal. The modal shows the mine is full, but no astronaut can be reassigned or unassigned.

---

#### Vulnerability 10: Infinite Emergency Oxygen Injections (No Charge/Cooling Limits)
- **File**: `src/App.tsx` (Lines 1263–1275) and `src/components/OxygenEmergencyBanner.tsx` (Lines 26–50)
- **Code Snippet**:
  ```tsx
  const handleEmergencyO2Injected = () => {
    updateCurrentColony(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        oxygen: Math.min(100, prev.resources.oxygen + 35),
      },
      emergencyO2Active: true,
    }));
  ```
- **Observed Behavior**:
  1. Emergency O2 banner appears whenever `oxygen < 25`.
  2. Pressing the button adds $+35\%$ oxygen.
  3. While `emergencyO2Active` is set to `true`, **there is zero check on `prev.emergencyO2Active`** and no canister charge limit.
  4. Every time oxygen drops below 25%, the player can re-inject $+35\%$ oxygen infinitely.
- **Reproduction Vector**: Allow oxygen to drop below 25%. Inject emergency O2. Wait for it to drop below 25% again. Inject again. Repeat indefinitely without restriction.

---

#### Vulnerability 11: Event Modal Multi-Click Exploitation
- **File**: `src/components/EventModal.tsx` (Lines 32–39, 114–130)
- **Code Snippet**:
  ```tsx
  const handleChoose = (opt: MissionEventOption, idx: number) => {
    setSelectedOptionIndex(idx);
    soundFx.playClick();
    setTimeout(() => {
      onSelectOption(opt);
      setSelectedOptionIndex(null);
    }, 300);
  };
  ```
- **Observed Behavior**:
  1. Option buttons do not set `disabled={selectedOptionIndex !== null}`.
  2. Rapidly double-clicking an option during the 300ms transition dispatches `onSelectOption` multiple times.
  3. The deltas (e.g. $+20$ science, $+15$ energy) are applied multiple times in `App.tsx`.
- **Reproduction Vector**: When a mission event appears, rapidly double-click any favorable option. The resource bonuses are doubled.

---

#### Vulnerability 12: LocalStorage State Injection & Deserialization Lack of Clamping
- **File**: `src/App.tsx` (Lines 105–144)
- **Code Snippet**:
  ```tsx
  return {
    ...init,
    ...c,
    currentDay: safeDay,
    difficulty: c?.difficulty || 'normal',
    missionCompleted: c?.missionCompleted ?? false,
    resources: { ...init.resources, ...(c?.resources || {}) },
  ```
- **Observed Behavior**:
  1. Deserialized `resources` are merged via spread operator without numeric boundary validation.
  2. `sciencePoints`, `oxygen`, `energy`, etc., can be altered directly via console/storage to negative or arbitrary high numbers (`9999999`) or `NaN`.
- **Reproduction Vector**: Execute `localStorage.setItem('astrobase_dual_save_v6', JSON.stringify({moon:{currentDay:1,resources:{sciencePoints:999999}}})); location.reload();`. The simulator initializes with 999,999 science points.

---

#### Vulnerability 13: Unmounted Async Timer Interval Leaks
- **File**: `src/components/OxygenEmergencyBanner.tsx` (Lines 38–50) and `src/components/CommCenter.tsx` (Lines 73–92)
- **Observed Behavior**:
  1. `setInterval` handles pressurization progress in `OxygenEmergencyBanner` and transmission lag in `CommCenter`.
  2. Neither component cancels or cleans up active intervals upon unmount or location change, causing memory leaks and state updates to unmounted components.
- **Reproduction Vector**: Trigger emergency O2 pressurization; immediately switch location from Moon to Mars before 2 seconds elapse.

---

#### Vulnerability 14: Uncapped Science Points Accumulation
- **File**: `src/App.tsx` (Lines 826, 990, 1154, 1195, 1224, 1244, 1607)
- **Observed Behavior**:
  1. Unlike `oxygen`, `water`, `energy`, and `food` which are capped at `max...` or 100, `sciencePoints` is unbounded.
  2. With active Science Lab ($+36$/turn at Level 3), NASA Quiz ($+70$/run), Rover Sorties ($+25$/run), and Veggie harvests ($+15$/harvest), science points inflate into thousands, destroying STEM balance.
- **Reproduction Vector**: Run baseline simulations for 10 sols with upgraded science modules; science points surpass 500 without upper limits.

---

## 2. Logic Chain

1. **Premise**: In an educational STEM simulation (*Astrobase Cadet*), progression mechanics (module research, life support maintenance, emergency survival) must enforce strict thermodynamic conservation and finite resource bounds.
2. **Observation 1 $\to$ Inference**: In `BotanicalLabModal.tsx`, `handleWaterCrop` verifies `currentWater >= 5` but never executes an updater or invokes a water deduction callback on `App.tsx`. Therefore, growth progress is acquired at zero cost, producing an infinite food/science/morale generator.
3. **Observation 2 $\to$ Inference**: In `RoverMissionModal.tsx`, `handleLaunchSortie` verifies `currentEnergy >= activeTarget.batteryCost`, but neither passes `batteryCost` in `onCompleteSortie` nor does `handleRoverSortieComplete` subtract it. Coupled with the absence of a turn limit, sorties are free and infinite.
4. **Observation 3 $\to$ Inference**: In `NasaQuizModal.tsx`, `handleNextQuestion` invokes both `onAddSciencePoints` and `onQuizBonus`, creating an unintended double award. `handleRestart` resets the local quiz index without consulting a global daily/mission completion flag, allowing infinite science farming on Day 1.
5. **Observation 4 $\to$ Inference**: In `App.tsx:handleUpgradeModule`, the conditional guard reads from React closure state rather than within the functional updater. High-frequency click events enqueue multiple state updates against the same closure value, causing negative resource balances and modules exceeding `maxLevel`.
6. **Observation 5 $\to$ Inference**: In `App.tsx:handleAdvanceDay`, `maxDays` is dynamically bound to `effectiveTotalDays`. Selecting Apollo 13 overrides this to 5. The check for `supreme_commander` tests only `difficulty === 'dificil' && nextDay >= maxDays`. Hence, completing a 5-day crisis unlocks the 28/30-day endgame achievement.
7. **Observation 6 $\to$ Inference**: In `App.tsx`, `batteryLockoutSeconds` is initialized to 5, but there is no `useEffect`, `setInterval`, or tick counter that decrements it. It remains at 5 indefinitely, rendering `isLockedOut` permanent in `WiringMiniGameModal.tsx`.
8. **Observation 7 $\to$ Inference**: In `App.tsx`, `empStunSeconds` is set to 1 upon Day 3 Solar flare, but no ticker resets it to 0. Thus the EMP warning banner is permanently active.
9. **Observation 8 $\to$ Inference**: `handleAdvanceDay` lacks button debouncing and schedules a 1-second timeout before game-over asphyxiation. Rapidly clicking the advance button increments `currentDay` to 28 before the timeout fires, converting a fatal hypoxia event into a victory.
10. **Observation 9 $\to$ Inference**: In `handleAdvanceDay`, dead crew are filtered out when calculating living counts, but `assignedToMine` is not sanitized. A deceased astronaut's ID remains in `assignedToMine`, occupying the miner quota while being invisible in the UI roster, permanently disabling the cryogenic mine.
11. **Observation 10 $\to$ Inference**: `handleEmergencyO2Injected` in `App.tsx` sets `emergencyO2Active: true` but never tests `if (prev.emergencyO2Active)` nor decrements an available canister count. Free O2 can be triggered indefinitely whenever levels dip below 25%.
12. **Observation 11 $\to$ Inference**: In `EventModal.tsx`, option buttons are not disabled after the initial click, allowing multiple triggers within the 300ms timeout window.
13. **Observation 12 $\to$ Inference**: LocalStorage deserialization in `mergeColony` does not clamp or validate resource values, allowing arbitrary values to persist.
14. **Observation 13 $\to$ Inference**: Asynchronous intervals in `OxygenEmergencyBanner` and `CommCenter` lack `useEffect` cleanup return functions, resulting in memory leaks across unmounts.
15. **Observation 14 $\to$ Inference**: `sciencePoints` lacks a max boundary (e.g., `maxSciencePoints = 200` or `150`), leading to unbounded accumulation.

---

## 3. Caveats

- **Scope Boundary**: This audit investigated client-side architecture and logic in `src/`. No server-side components exist; the app is an offline-capable client-side React SPA.
- **Audio Synthesizer**: Web Audio API oscillator nodes in `audio.ts` catch autoplay restrictions; audio suspension is expected before first user gesture and is not a logic vulnerability.
- **Third-Party Libraries**: `canvas-confetti` and `lucide-react` perform nominally without security issues.

---

## 4. Conclusion & Recommended Patch Strategy

### Executive Architectural Assessment
The architecture of *Astrobase Cadet* is well-structured visually and educationally, with high-fidelity NASA datasets (DONKI, OSDR, MEDA, Artemis) and clear domain separation. However, the application suffers from **critical gaps in client-side transaction boundaries, missing cost deductions, timer lifecycle omissions, and race conditions under rapid user input**.

### Prioritized Patch Plan for Implementers

1. **Botanical Lab Patch (`BotanicalLabModal.tsx` & `App.tsx`)**:
   - Pass an `onWaterCrop: () => boolean` callback from `App.tsx` that strictly deducts $5\text{L}$ water and validates available water in `ColonySaveData`.
   - Add a once-per-Sol harvest limit (`colony.hasHarvestedVeggieToday: boolean`) reset in `handleAdvanceDay`.
   - Add `isHarvesting` state to disable the harvest button while processing.

2. **Rover Sortie Patch (`RoverMissionModal.tsx` & `App.tsx`)**:
   - Update `onCompleteSortie` to include `batteryCost: number`.
   - In `handleRoverSortieComplete`, deduct `batteryCost` from `prev.resources.energy` (`Math.max(0, energy - cost)`).
   - Enforce a 1-sortie-per-Sol limit (`colony.roverSortieCompletedToday: boolean`).
   - Freeze the target selection once "Launch Sortie" is clicked.

3. **NASA Quiz Patch (`NasaQuizModal.tsx` & `App.tsx`)**:
   - Remove redundant `onAddSciencePoints` from quiz completion; grant only the intended $+20$ science bonus and $+20\%$ morale via `onQuizBonus`.
   - Add `colony.quizCompletedForSol: boolean` (or once-per-mission badge tracking) and disable "Reintentar Quiz" from awarding duplicate bonuses on the same day.

4. **Module Upgrade Concurrency Patch (`App.tsx`)**:
   - Move all cost and level-cap checks inside the `updateCurrentColony` functional updater:
     ```tsx
     updateCurrentColony(prev => {
       const mod = prev.modules.find(m => m.id === id);
       if (!mod || mod.level >= mod.maxLevel) return prev;
       const cost = (prev.difficulty === 'dificil' && mod.id === 'storm_bunker') ? 20 : 10;
       if (prev.resources.sciencePoints < cost) return prev;
       return {
         ...prev,
         resources: { ...prev.resources, sciencePoints: prev.resources.sciencePoints - cost },
         modules: prev.modules.map(m => m.id === id ? { ...m, level: m.level + 1 } : m)
       };
     });
     ```
   - Add a 300ms debounce / disabled state on module upgrade buttons.

5. **Historical Crisis Achievement Patch (`App.tsx`)**:
   - In `handleAdvanceDay`, guard `unlockAchievement('supreme_commander')` with:
     ```tsx
     if (difficulty === 'dificil' && currentColony.difficulty === 'dificil' && !activeCrisis && nextDay >= currentScenario.targetDays) {
       unlockAchievement('supreme_commander');
     }
     ```
   - Historical crises should unlock crisis-specific completion badges rather than the campaign-level Supreme Commander badge.

6. **Battery Lockout & Countdown Timer Patch (`App.tsx` & `WiringMiniGameModal.tsx`)**:
   - Implement an active 1-second interval or `useEffect` in `App.tsx` that decrements `batteryLockoutSeconds` while $> 0$.
   - While `batteryLockoutSeconds > 0`, drain $-4\%$ energy per second as advertised.
   - When reaching 0, clear the lockout state cleanly.

7. **Solar EMP Stun Timer Patch (`App.tsx`)**:
   - In `App.tsx`, schedule a 1000ms timer that resets `empStunSeconds` to 0 after Day 3 begins.

8. **Day Advance Spam & Asphyxiation Grace Period Patch (`Navbar.tsx` & `App.tsx`)**:
   - Introduce `isAdvancingDay: boolean` state in `App.tsx` and pass `disabled={isAdvancingDay}` to `Navbar.tsx`.
   - In `handleAdvanceDay`, if `newOxygen <= 0`, immediately block further day advances until the grace period resolves or emergency O2 is injected.

9. **Ice Mine Dead Astronaut Sanitation Patch (`App.tsx`)**:
   - In `handleAdvanceDay`, filter `assignedToMine`:
     ```tsx
     const livingIds = updatedCrew.filter(c => c.status !== 'deceased').map(c => c.id);
     const sanitizedMineCrew = prev.assignedToMine.filter(id => livingIds.includes(id));
     ```
   - Update `assignedToMine: sanitizedMineCrew` in colony state.

10. **Emergency Oxygen Charges Patch (`App.tsx` & `OxygenEmergencyBanner.tsx`)**:
    - Add `emergencyO2Charges: number` to `ColonySaveData` (starting at 2 canisters).
    - Deduct 1 charge upon injection. Disable the banner when `emergencyO2Charges <= 0`.
    - Clean up `setInterval` on component unmount in `OxygenEmergencyBanner.tsx`.

11. **Event Modal Concurrency Patch (`EventModal.tsx`)**:
    - Add `disabled={selectedOptionIndex !== null}` to all option buttons in `EventModal.tsx`.

12. **LocalStorage Sanitation Patch (`App.tsx`)**:
    - Implement a `sanitizeResources(r: Partial<ResourceState>): ResourceState` helper that clamps every field between $0$ and maximum allowable limits ($100$ for resources, $150$ for sciencePoints).

13. **Science Points Cap Patch (`types/game.ts` & `App.tsx`)**:
    - Add `maxSciencePoints: 150` to `ResourceState`.
    - Apply `Math.min(maxSciencePoints, ...)` across all science gains.

---

## 5. Verification Method

To independently verify the identified vulnerabilities and validate future patches:

### Build and Lint Commands
1. **Compilation Check**:
   ```bash
   npm run build
   ```
   *Expected Result*: Compiles cleanly with exit code 0 (`tsc -b && vite build`).
2. **Linter Check**:
   ```bash
   npm run lint
   ```
   *Expected Result*: `oxlint` finishes with 0 errors.

### Manual & Automated Vulnerability Verification Steps
1. **Botanical Lab Water Exploit**:
   - Note current water count in header (e.g. 75L).
   - Open Botanical Lab, click "Regar con Agua (-5L)".
   - *Failure condition*: Water remains 75L.
   - *Patched condition*: Water decrements to 70L, and button disables when water $< 5\text{L}$ or when Sol harvest limit is reached.
2. **Rover Battery Exploit**:
   - Note current battery percentage (e.g. 90%).
   - Deploy rover to *Shackleton Crater Floor* (cost: 16 kWh).
   - *Failure condition*: Battery remains at 90% and water increases by 22L.
   - *Patched condition*: Battery drops to 74%, and rover cannot be deployed again until the next Sol.
3. **Supreme Commander Skip**:
   - Start Apollo 13 crisis on Hard mode.
   - Advance 5 days.
   - *Failure condition*: Achievement `supreme_commander` unlocks.
   - *Patched condition*: Crisis completion is registered, but `supreme_commander` remains locked until completing a full 28/30-day run.
4. **Battery Lockout Countdown**:
   - Trigger 2 battery faults in Hard mode.
   - Open Wiring minigame.
   - *Failure condition*: Counter remains stuck at 5s indefinitely.
   - *Patched condition*: Counter ticks down $5 \to 4 \to 3 \to 2 \to 1 \to 0$ and unlocks wires cleanly.
