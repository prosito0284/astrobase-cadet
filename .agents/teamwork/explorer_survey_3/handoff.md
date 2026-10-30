# Handoff Report: Modals & Minigames Security & Exploit Audit (Part 2)

**Explorer ID**: Explorer 3 (`teamwork_explorer`)  
**Working Directory**: `c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\explorer_survey_3\`  
**Target Scope**: `WiringMiniGameModal.tsx`, `CommMiniGameModal.tsx`, `IceMineModal.tsx`, `PopulationExpansionModal.tsx`, `EventModal.tsx`, `ModuleControl.tsx`, `OxygenEmergencyBanner.tsx`, `HistoricalCrisesModal.tsx`, `AchievementsModal.tsx`, and associated `App.tsx` handlers.  
**Date**: 2026-10-30T14:27:00Z  

---

## 1. Observation

Direct code observations from static analysis and pattern matching across the targeted components in `src/components/` and `src/App.tsx`:

### 1.1 `src/components/WiringMiniGameModal.tsx`
* **Observation 1.1.1 (State Retention / Persistent Connections Across Sessions)**:
  - Lines 52–57:
    ```tsx
    const [rightTerminals] = useState<WireNode[]>(() => {
      return [...WIRE_TYPES].sort(() => 0.5 - Math.random());
    });
    const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
    const [connections, setConnections] = useState<{ [leftId: string]: string }>({});
    if (!isOpen) return null;
    ```
  - Line 59: When `!isOpen`, the component returns `null` but remains mounted at JSX level (`<WiringMiniGameModal isOpen={isWiringOpen} ... />` in `src/App.tsx:1633`). React preserves `connections` and `rightTerminals` state across modal opens and closes because there is no `useEffect` resetting state when `isOpen` changes from false to true.

* **Observation 1.1.2 (Race Condition on Success / Multiple Trigger During 700ms Delay)**:
  - Lines 98–109:
    ```tsx
    const allConnected = Object.keys(newConns).length === 4;
    const allCorrect = allConnected && Object.entries(newConns).every(([left, right]) => left === right);

    if (allCorrect) {
      soundFx.playVictory();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => {
        onSuccess();
      }, 700);
    } else if (allConnected) {
      soundFx.playAlert();
    }
    ```
  - During the 700ms window, the terminals and buttons are NOT disabled. There is no `isCompleted` guard. Clicking `Reiniciar` (Reset) and reconnecting wires schedules additional timeouts to `onSuccess()`.
  - Closing the modal (`onClose`) does not cancel the 700ms timer; `onSuccess()` still fires after the modal is closed.

* **Observation 1.1.3 (Non-Injective Wire Mapping)**:
  - Line 93:
    ```tsx
    const newConns = { ...connections, [selectedLeft]: rightId };
    ```
  - Multiple left terminals can be mapped to the exact same right terminal because there is no check verifying if `rightId` is already present in `Object.values(connections)`.

* **Observation 1.1.4 (Lack of Fault Precondition in Callback)**:
  - In `src/App.tsx:1278–1291`:
    ```tsx
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
    ```
  - `handleWiringSuccess` does not verify whether `currentColony.batteryFault` or `currentColony.wiringErrorActive` was actually true before awarding `wire_master` and logging flight entries.

---

### 1.2 `src/components/CommMiniGameModal.tsx`
* **Observation 1.2.1 (Instant Solve Exploit / Frequency State Retention)**:
  - Lines 26–42:
    ```tsx
    const TARGET_FREQ = 8.41;
    const [currentFreq, setCurrentFreq] = useState<number>(8.15);
    const [azimuthAngle, setAzimuthAngle] = useState<number>(30); // 0 - 90 deg
    const TARGET_AZIMUTH = 45;

    if (!isOpen) return null;

    const freqDiff = Math.abs(currentFreq - TARGET_FREQ);
    const angleDiff = Math.abs(azimuthAngle - TARGET_AZIMUTH);
    const freqScore = Math.max(0, 100 - freqDiff * 250);
    const angleScore = Math.max(0, 100 - angleDiff * 4);
    const totalSignalLock = Math.round((freqScore * 0.6) + (angleScore * 0.4));
    const isLocked = totalSignalLock >= 90;
    ```
  - Once solved (user moves slider to 8.41 GHz and 45°), `isCommBlackout` becomes false. The component returns `null` but does NOT unmount or reset state. When another blackout triggers later, `currentFreq` is still 8.41 and `azimuthAngle` is still 45. `isLocked` is immediately true, permitting immediate bypass with zero interaction.

* **Observation 1.2.2 (Button Spam / Race Condition on `handleFixAntenna`)**:
  - Lines 43–48:
    ```tsx
    const handleFixAntenna = () => {
      if (!isLocked) return;
      soundFx.playVictory();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      onRestoreComm();
    };
    ```
  - Lines 150–160:
    ```tsx
    <button
      onClick={handleFixAntenna}
      disabled={!isLocked}
      className="..."
    >
    ```
  - There is no `isSubmitting` flag or click lock. Rapid clicking on the button executes `onRestoreComm()` multiple times before state update closes the modal.
  - In `src/App.tsx:1312–1321`, `handleRestoreCommunications` logs to flight log, speaks speech synthesis, and calls `unlockAchievement('dsn_restored')` on each execution.

* **Observation 1.2.3 (Audio Buffer Flooding on Slider Drag)**:
  - Lines 119–122 & 138–141:
    ```tsx
    onChange={(e) => {
      soundFx.playClick();
      setCurrentFreq(parseFloat(e.target.value));
    }}
    ```
  - Continuous slider input invokes `soundFx.playClick()` on every pixel/increment, overwhelming the Web Audio API context with hundreds of simultaneous oscillator/buffer triggers.

---

### 1.3 `src/components/IceMineModal.tsx`
* **Observation 1.3.1 (Closure Snapshot Race Condition on Assignment)**:
  - In `src/App.tsx:510–555`:
    ```tsx
    const livingCrew = currentColony.crew.filter(c => c.status !== 'deceased');
    const isCurrentlyAssigned = currentColony.assignedToMine.includes(astronautId);

    if (isCurrentlyAssigned) {
      updateCurrentColony(prev => ({
        ...prev,
        assignedToMine: prev.assignedToMine.filter(id => id !== astronautId),
        crew: prev.crew.map(c => c.id === astronautId ? { ...c, isAssignedToMine: false } : c),
      }));
      ...
    } else {
      const maxAllowed = (difficulty === 'dificil' && !currentColony.populationExpanded) ? 1 : 2;
      if (currentColony.assignedToMine.length >= maxAllowed) {
        showToast(`La mina ya tiene el cupo de ${maxAllowed} minero(s) asignado(s).`);
        return;
      }
      ...
      const remainingInBase = livingCrew.length - currentColony.assignedToMine.length;
      if (remainingInBase <= 1) {
        ...
        return;
      }
      updateCurrentColony(prev => ({
        ...prev,
        assignedToMine: [...prev.assignedToMine, astronautId],
        crew: prev.crew.map(c => c.id === astronautId ? { ...c, isAssignedToMine: true } : c),
      }));
    }
    ```
  - The check `currentColony.assignedToMine.length >= maxAllowed` and `remainingInBase <= 1` evaluate against the outer closure state `currentColony`.
  - Rapidly double-clicking on an astronaut runs both calls against `!isCurrentlyAssigned`. Both calls append `astronautId` to `assignedToMine`, creating duplicate entries: `[astronautId, astronautId]`.

* **Observation 1.3.2 (Miner Duplication & Infinite Production Cheat)**:
  - In `src/App.tsx:701`:
    ```tsx
    const assignedMinersCount = currentColony.assignedToMine.filter(id => livingCrew.some(c => c.id === id)).length;
    ```
  - If `assignedToMine` contains duplicate IDs `[id1, id1]`, `assignedMinersCount` evaluates to 2 even though only 1 astronaut is assigned.
  - In `src/App.tsx:738–740`:
    ```tsx
    if (assignedMinersCount === 2) {
      deltaH2O += 22;
    }
    ```
  - A single astronaut generates the full 2-miner +22 L water yield.

* **Observation 1.3.3 (Base Abandonment via Rapid Selection)**:
  - Clicking multiple crew members in rapid succession allows assigning all crew members to the mine because `remainingInBase` was calculated before React finished re-rendering the updated list, leaving 0 crew members inside the habitat.

* **Observation 1.3.4 (Lack of Upper Water Limit / Uncapped Water Production)**:
  - In `src/App.tsx:865`:
    ```tsx
    newWater = Math.max(0, Math.min(currentColony.resources.maxWater, newWater));
    ```
  - While `newWater` is clamped to `maxWater`, `currentColony.resources.water` can be continuously capped out daily without diminishing returns or equipment wear/temperature degradation.

---

### 1.4 `src/components/PopulationExpansionModal.tsx`
* **Observation 1.4.1 (Lack of Precondition Validation in Confirm Callback)**:
  - In `src/App.tsx:441–466`:
    ```tsx
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
          resources: { ...prev.resources, oxygen: nextO2, water: nextH2O, energy: nextEnergy, food: nextFood },
          crew: newCrewList,
          populationExpanded: true,
        };
      });
      ...
    ```
  - The handler does NOT verify:
    1. Whether difficulty is actually `'dificil'`.
    2. Whether `currentDay >= 15`.
  - Calling `handleConfirmPopulationExpansion()` on Day 1 or in Easy/Normal mode permanently injects two 100% HP, 90% morale crew members.

* **Observation 1.4.2 (Zero-Resource Free Crew Exploit)**:
  - The cost is calculated purely as a percentage of current resources: `Math.round(prev.resources.oxygen * 0.75)`.
  - If the base has 0 or near-0 resources (e.g. 0% energy, 0 L water, 0 food), the 25% cost is 0. The player gets two free specialist astronauts without paying any resource penalty.

* **Observation 1.4.3 (Side-Effect Duplication Outside Updater)**:
  - Lines 468–472:
    ```tsx
    const msg = '🎉 ¡Expansión exitosa! Cadete Santi Gomez y Dra. Elena Ruiz se han acoplado a la tripulación (6 astronautas).';
    showToast(msg);
    spaceVoice.speak('Personal de relevo acoplado con éxito. Tripulación expandida a seis miembros.');
    unlockAchievement('crew_expansion');
    addFlightLog('success', 'Transbordador acoplado: Tripulación expandida a 6 astronautas sacrificando 25% de recursos.', 'Shuttle docked: Crew expanded to 6 astronauts sacrificing 25% supplies.');
    ```
  - Multiple rapid clicks on "Aceptar y Aumentar a 6" execute these lines multiple times because they sit outside the `updateCurrentColony` functional check.

---

### 1.5 Additional Modals & Interactive Components
* **Observation 1.5.1 (`EventModal.tsx` Decision Spam Multiplying Rewards)**:
  - In `src/components/EventModal.tsx:32–39`:
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
  - Lines 117–125: Option buttons are NOT disabled when `selectedOptionIndex !== null`.
  - Rapidly clicking an option 3 times within 300ms invokes `onSelectOption` 3 times.
  - In `src/App.tsx:1145–1155`, `handleSelectEventOption` applies `opt.resourceDeltas` directly to `nextRes` each time: +25 Science Points becomes +75 Science Points; +20 Energy becomes +60 Energy.

* **Observation 1.5.2 (`ModuleControl.tsx` Double Upgrade & Negative Science Exploit)**:
  - In `src/App.tsx:405–434`:
    ```tsx
    const handleUpgradeModule = (id: string) => {
      const mod = currentColony.modules.find(m => m.id === id);
      if (!mod || mod.level >= mod.maxLevel) return;

      const isBunker = mod.id === 'storm_bunker';
      const requiredCost = (difficulty === 'dificil' && isBunker) ? 20 : 10;

      if (currentColony.resources.sciencePoints < requiredCost) { ... return; }

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
    };
    ```
  - Rapid double-clicking "Mejorar" executes before React state finishes updating. Both clicks pass the checks. Science points are subtracted twice (can become negative, e.g. -10), and module levels exceed `maxLevel` (e.g. level 4 on a max 3 module).

* **Observation 1.5.3 (`OxygenEmergencyBanner.tsx` Infinite Free Oxygen & 1s Death Grace Conflict)**:
  - In `src/components/OxygenEmergencyBanner.tsx:27–49`:
    - Banner shows whenever `oxygenLevel < 25`.
    - Pressurization takes 2000ms (`duration = 2000`).
    - At 2000ms, calls `onEmergencyO2Injected()`.
  - In `src/App.tsx:1268`: Adds +35% O₂ for free with no consumable candle cost or charges.
  - In `src/App.tsx:1015–1040`: When O₂ reaches 0%, a 1000ms (1 second) `setTimeout` is triggered before wiping the crew with Game Over.
  - Because `OxygenEmergencyBanner` takes 2000ms (2 seconds) to pressurize, the crew dies at 1000ms. At 2000ms, `onEmergencyO2Injected` revives dead crew stats or injects oxygen into a terminated mission.

* **Observation 1.5.4 (`HistoricalCrisesModal.tsx` Game Over Evasion / State Reset Cheat)**:
  - In `src/App.tsx:1576–1592`:
    ```tsx
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
    ```
  - Can be activated at any time from the bottom link bar, allowing a failing colony (e.g. Day 25, 2% oxygen) to reset to Day 1 with fresh resources without recording a loss.

* **Observation 1.5.5 (`AchievementsModal.tsx` / `unlockAchievement` Side-Effects Inside State Reducer)**:
  - In `src/App.tsx:271–288`:
    ```tsx
    setAchievements(prev => {
      const target = prev.find(a => a.id === id);
      if (!target || target.unlocked) return prev;

      soundFx.playAchievement();
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.4 } });
      showToast(msg);
      spaceVoice.speak(...);
      addFlightLog(...);
      return prev.map(...);
    });
    ```
  - Side-effects executed directly inside `setAchievements` updater run twice under React StrictMode and during concurrent updates.

---

## 2. Logic Chain

```
[Observation 1.1.1] Component returns null without unmounting
  │
  ├─► State `connections` and `rightTerminals` persist across modal sessions.
  │   Reopening after close leaves previous wires intact or in pre-solved state.
  │
[Observation 1.1.2] 700ms victory delay with unblocked buttons
  │
  ├─► Rapid clicks or Reset + re-connect triggers multiple `onSuccess()` callbacks.
  │   Closing modal with 'X' does not cancel timer, awarding victory anyway.

[Observation 1.2.1] Sliders not reset on blackout resolve
  │
  ├─► Once tuned to 8.41 GHz / 45°, subsequent blackouts immediately show 100% locked signal.
  │   Players can click "Restablecer Enlace" with zero tuning required.
  │
[Observation 1.2.2] No submission lock on antenna restoration
  │
  ├─► Rapid clicks invoke `onRestoreComm()` repeatedly, duplicating flight logs and toasts.

[Observation 1.3.1 & 1.3.2] Closure-based length checks in `onToggleAssignAstronaut`
  │
  ├─► Concurrent clicks append the same astronaut ID twice (`[id, id]`).
  │   `assignedMinersCount` evaluates to 2, yielding 22 L water from 1 astronaut.
  │   Bypasses minimum crew safety rule (base can be left with 0 crew).

[Observation 1.4.1 & 1.4.2] Missing day/difficulty checks in population expansion
  │
  ├─► Callable before Day 15 or on Easy/Normal mode.
  │   Zero-resource base pays 0 cost (25% of 0 = 0) and receives 2 full-health astronauts.

[Observation 1.5.1] `EventModal` 300ms setTimeout without button disabling
  │
  ├─► Multi-clicking event choices applies resource deltas 3x to 5x.
  │   Players artificially multiply Science Points, Oxygen, and Energy.

[Observation 1.5.2] `handleUpgradeModule` closure race condition
  │
  ├─► Double-clicking upgrade consumes points twice (into negative science)
  │   and forces module levels above `maxLevel`.

[Observation 1.5.3] 1s death grace vs 2s emergency oxygen pressurization
  │
  ├─► When oxygen reaches 0%, crew dies at 1.0s. Emergency oxygen takes 2.0s.
  │   Injection arrives on a dead crew; or infinite use allows free +35% O₂ repeatedly.
```

---

## 3. Caveats

1. **Local State vs Global State**: Minigames manage visual connection state locally (`useState`), while operational states (`isCommBlackout`, `batteryFault`, `assignedToMine`) reside in `App.tsx`. Synchronizing both requires strict lifecycles (e.g. `useEffect` on `isOpen` transition or keying the modal with an instance ID).
2. **Audio Performance**: Audio clicks on input sliders are not game-breaking exploits but degrade browser performance and user experience; debouncing or triggering sounds only on slider release (`onPointerUp`) resolves this cleanly.
3. **No Network Layer**: Astrobase Cadet runs entirely in-browser (client-side simulation). Therefore, security vulnerabilities relate to client-side race conditions, invariant violations, and progression bypasses rather than remote code execution.

---

## 4. Conclusion & Vulnerability Catalog

The survey identified **14 distinct vulnerabilities and exploit vectors** across the modals and minigames in this scope.

| # | Vulnerability / Exploit | Severity | Affected File & Lines | Vector / Impact |
|---|---|---|---|---|
| **V1** | Wiring Modal State Persistence | **High** | `WiringMiniGameModal.tsx:52–59` | Reopening modal preserves solved wires; instant auto-solve or corrupted state. |
| **V2** | Wiring Modal Race Condition on Completion | **High** | `WiringMiniGameModal.tsx:98–109` | Unblocked 700ms window allows multiple `onSuccess()` calls or reward claim after closing. |
| **V3** | Non-Injective Wire Mapping | **Medium** | `WiringMiniGameModal.tsx:93` | Allows multiple left wires connected to the same right terminal. |
| **V4** | Comm Blackout Instant Auto-Solve Exploit | **High** | `CommMiniGameModal.tsx:26–42` | Sliders retain 8.41 GHz/45°; future blackouts are pre-solved instantly. |
| **V5** | Comm Restoration Button Spamming | **Medium** | `CommMiniGameModal.tsx:43–48` | Spamming click triggers duplicate flight logs, toasts, and audio. |
| **V6** | Slider Audio Flooding / Denial of Service | **Low** | `CommMiniGameModal.tsx:119–141` | Rapid slider drag triggers hundreds of audio clicks per second. |
| **V7** | Ice Mine Duplicate Astronaut Assignment | **High** | `App.tsx:510–555` | Double-click assigns same astronaut twice; 1 astronaut counts as 2 miners (+22 L water). |
| **V8** | Base Abandonment Safety Rule Bypass | **High** | `App.tsx:538–546` | Concurrent clicks bypass `remainingInBase <= 1`, leaving 0 astronauts in base. |
| **V9** | Population Expansion Precondition Bypass | **High** | `App.tsx:441–466` | Expansion can be invoked on Day 1 or in Easy/Normal mode without day 15 check. |
| **V10** | Population Expansion Zero-Cost Exploit | **Medium** | `App.tsx:444–447` | If resources are 0, cost is 0; awards 2 free specialists without sacrifice. |
| **V11** | Event Modal Decision Spam / Delta Multiplier | **Critical** | `EventModal.tsx:32–39`, `App.tsx:1145–1155` | Clicking options during 300ms window multiplies science/resources up to 4x. |
| **V12** | Module Upgrade Double-Click / Level Overflow | **High** | `App.tsx:405–434` | Double-clicking upgrade drives science negative and exceeds `maxLevel`. |
| **V13** | Emergency O₂ Infinite Free Supply & Grace Mismatch | **Critical** | `OxygenEmergencyBanner.tsx:27–49`, `App.tsx:1015–1040` | Free infinite +35% O₂; 2s pressurization finishes after 1s asphyxiation death timer. |
| **V14** | Historical Crises Game-Over Evade / Cheat | **Medium** | `App.tsx:1576–1592` | Selecting a crisis mid-collapse resets sol to 1 and resets resources, dodging loss. |

---

## 5. Recommended Patch Strategy & Architecture Validations

### 5.1 `WiringMiniGameModal.tsx`
1. **Reset State on Open**:
   Add a `useEffect` triggered when `isOpen` changes to `true` (or generate random right terminals on open):
   ```tsx
   useEffect(() => {
     if (isOpen) {
       setConnections({});
       setSelectedLeft(null);
       setIsSolved(false);
       setRightTerminals([...WIRE_TYPES].sort(() => 0.5 - Math.random()));
     }
   }, [isOpen]);
   ```
2. **Atomic Completion Lock**:
   Introduce `isSolved` state. Set `isSolved = true` immediately on all-correct. Disable all terminal buttons and reset button while `isSolved` is true.
3. **Cancel Timeout on Close / Unmount**:
   Use a `useRef` for the 700ms timer and clear it in cleanup / `handleClose`.
4. **Enforce 1-to-1 Mapping**:
   Prevent binding a left terminal to an already connected right terminal:
   ```tsx
   if (Object.values(connections).includes(rightId)) return;
   ```

### 5.2 `CommMiniGameModal.tsx`
1. **Randomize Targets and Reset Sliders on Open**:
   ```tsx
   useEffect(() => {
     if (isOpen) {
       setCurrentFreq(8.10 + Math.random() * 0.15);
       setAzimuthAngle(15 + Math.floor(Math.random() * 20));
       setIsRestoring(false);
     }
   }, [isOpen]);
   ```
2. **Submission Lock**:
   Add `isRestoring` state to disable the restore button immediately on first click.
3. **Audio Throttling**:
   Remove `soundFx.playClick()` from `onChange` or throttle to once every 150ms.

### 5.3 `IceMineModal.tsx` & `App.tsx:handleToggleAssignAstronaut`
1. **Atomic Functional State Check**:
   Move all assignment checks inside `updateCurrentColony(prev => ...)`:
   ```tsx
   updateCurrentColony(prev => {
     const livingCrew = prev.crew.filter(c => c.status !== 'deceased');
     const isAssigned = prev.assignedToMine.includes(astronautId);
     if (isAssigned) {
       return {
         ...prev,
         assignedToMine: prev.assignedToMine.filter(id => id !== astronautId),
         crew: prev.crew.map(c => c.id === astronautId ? { ...c, isAssignedToMine: false } : c),
       };
     }
     const maxAllowed = (difficulty === 'dificil' && !prev.populationExpanded) ? 1 : 2;
     if (prev.assignedToMine.length >= maxAllowed) return prev;
     const remainingInBase = livingCrew.length - (prev.assignedToMine.length + 1);
     if (remainingInBase < 1) return prev;
     if (prev.assignedToMine.includes(astronautId)) return prev;

     return {
       ...prev,
       assignedToMine: [...new Set([...prev.assignedToMine, astronautId])],
       crew: prev.crew.map(c => c.id === astronautId ? { ...c, isAssignedToMine: true } : c),
     };
   });
   ```

### 5.4 `PopulationExpansionModal.tsx` & `App.tsx:handleConfirmPopulationExpansion`
1. **Strict Guard Validations**:
   ```tsx
   if (difficulty !== 'dificil' || currentColony.currentDay < 15 || currentColony.populationExpanded) {
     return;
   }
   ```
2. **Minimum Baseline Cost**:
   Ensure minimum resource penalty even if storages are depleted:
   ```tsx
   const costO2 = Math.max(10, Math.round(prev.resources.oxygen * 0.25));
   const costH2O = Math.max(10, Math.round(prev.resources.water * 0.25));
   const costEnergy = Math.max(10, Math.round(prev.resources.energy * 0.25));
   const costFood = Math.max(10, Math.round(prev.resources.food * 0.25));
   ```

### 5.5 `EventModal.tsx`
1. **Disable Options on Selection**:
   ```tsx
   const [isResolving, setIsResolving] = useState(false);
   const handleChoose = (opt: MissionEventOption, idx: number) => {
     if (isResolving) return;
     setIsResolving(true);
     setSelectedOptionIndex(idx);
     soundFx.playClick();
     setTimeout(() => {
       onSelectOption(opt);
       setIsResolving(false);
       setSelectedOptionIndex(null);
     }, 300);
   };
   ```
   Disable all option buttons when `isResolving` is true.

### 5.6 `ModuleControl.tsx` & `handleUpgradeModule`
1. **Atomic Guard Inside Updater**:
   ```tsx
   updateCurrentColony(prev => {
     const mod = prev.modules.find(m => m.id === id);
     if (!mod || mod.level >= mod.maxLevel) return prev;
     const isBunker = mod.id === 'storm_bunker';
     const requiredCost = (difficulty === 'dificil' && isBunker) ? 20 : 10;
     if (prev.resources.sciencePoints < requiredCost) return prev;

     return {
       ...prev,
       resources: {
         ...prev.resources,
         sciencePoints: prev.resources.sciencePoints - requiredCost,
       },
       modules: prev.modules.map(m => m.id === id ? { ...m, level: Math.min(m.maxLevel, m.level + 1) } : m),
     };
   });
   ```

### 5.7 `OxygenEmergencyBanner.tsx`
1. **Limited Emergency Canisters**:
   Track `emergencyO2Canisters: number` in colony state (e.g. 2 max per mission). Deduct 1 canister per injection; disable button when canisters reach 0.
2. **Synchronize Death Grace Timer**:
   Ensure oxygen grace death timer in `App.tsx` gives at least 3 seconds so the 2-second valve pressurization can realistically rescue the habitat.

---

## 6. Verification Method

To independently verify these findings:

1. **Verify Source Locations**:
   - `c:\Users\crist\Documents\antigravity\kind-hawking\src\components\WiringMiniGameModal.tsx:52–109`
   - `c:\Users\crist\Documents\antigravity\kind-hawking\src\components\CommMiniGameModal.tsx:26–48`
   - `c:\Users\crist\Documents\antigravity\kind-hawking\src\components\IceMineModal.tsx:150–205`
   - `c:\Users\crist\Documents\antigravity\kind-hawking\src\components\PopulationExpansionModal.tsx:35–48`
   - `c:\Users\crist\Documents\antigravity\kind-hawking\src\components\EventModal.tsx:32–39`
   - `c:\Users\crist\Documents\antigravity\kind-hawking\src\App.tsx:405–555, 1145–1183, 1263–1291, 1312–1321`

2. **Reproduction Tests**:
   - **Wiring Modal**: Solve circuit, close modal within 600ms; note that `handleWiringSuccess` still executes and repairs the base.
   - **Comm Modal**: Solve frequency lock once. Advance to next blackout event. Note that frequency sliders remain at 8.41 GHz/45° with 100% signal pre-locked.
   - **Ice Mine**: In normal mode with 1 miner, rapidly double-click a second crew member; observe both assigned with duplicate IDs and production triggered without valid crew count.
   - **Event Modal**: In any decision event, click an option 3 times rapidly within 300ms; observe resource score or science multiplying by 3x.
   - **Module Control**: Click "Mejorar" twice with exactly 10 science points; observe science dropping to -10 and module reaching level 2.

3. **Compilation & Build Command**:
   ```powershell
   npm run build
   ```
   Ensures changes adhere to strict TypeScript typings and produce a clean Vite bundle.
