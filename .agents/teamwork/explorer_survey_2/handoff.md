# Handoff Report: Modals & Minigames Security & Architecture Audit (Group 1)

**Agent**: Explorer 2 (`teamwork_explorer`)  
**Scope**: `BotanicalLabModal.tsx`, `RoverMissionModal.tsx`, `NasaQuizModal.tsx`, `MissionReportModal.tsx`, and associated handlers in `App.tsx` & components  
**Target Path**: `c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\explorer_survey_2\handoff.md`  
**Date**: 2026-10-30  

---

## 1. Observation

Direct code analysis of `src/components/BotanicalLabModal.tsx`, `src/components/RoverMissionModal.tsx`, `src/components/NasaQuizModal.tsx`, `src/components/MissionReportModal.tsx`, `src/App.tsx`, and related files revealed the following exact observations:

### 1.1 BotanicalLabModal.tsx (`src/components/BotanicalLabModal.tsx`)
1. **Irrigation Does Not Consume Water (`lines 124-132, 17-24`)**:
   ```typescript
   interface BotanicalLabModalProps {
     isOpen: boolean;
     onClose: () => void;
     onHarvest: (foodGain: number, scienceGain: number, moraleGain: number) => void;
     currentWater: number;
     currentEnergy: number;
     lang: 'es' | 'en';
   }
   ...
   const handleWaterCrop = () => {
     if (currentWater < 5) return;
     soundFx.playHarvest();
     setIsWatering(true);
     setTimeout(() => {
       setIsWatering(false);
       setGrowthProgress(prev => Math.min(100, prev + 25));
     }, 600);
   };
   ```
   *Finding*: The modal requires `currentWater >= 5` to water, but there is NO callback (`onConsumeWater` or `onDeductResource`) passed from `App.tsx` (lines 1555-1562). Water is never subtracted from `currentColony.resources.water`.
2. **Initial Growth Progress & Instant Turn-1 Harvest (`lines 111, 372-379`)**:
   ```typescript
   const [growthProgress, setGrowthProgress] = useState<number>(65); // 0-100%
   ...
   <button
     onClick={handleHarvestClick}
     disabled={growthProgress < 80}
   ```
   *Finding*: Initial maturity is hardcoded to 65%. A single free water click increases growth to 90%, immediately unlocking harvest. Harvest awards 25 Food, 15 Science, +12 Morale to all crew, and +5 Health to all crew (`App.tsx:1186-1205`), and can be repeated indefinitely.
3. **Unused Energy & Disconnect from Solar Flare Mechanics (`lines 22, 105, types/game.ts:142-143`)**:
   `currentEnergy` is passed as a prop but never used. Grow lights consume 0 energy. In `types/game.ts`, `plantsNeedDoubleWaterOnce` and `plantsWipedGrowth` exist in `ColonySaveData`, but `BotanicalLabModal` does not receive or check either flag.
4. **Static Harvest Output Regardless of Crop & Spectrum Calibration (`lines 117-120, 137`)**:
   ```typescript
   onHarvest(25, 15, 12);
   ```
   All 4 crops (Mizuna, Red Romaine, Radish, Spirulina) yield identical hardcoded rewards, ignoring crop growth days, nutritional specialties, and LED red/blue spectrum calibration.
5. **No Debounce on Harvest & Unmounted Timer Leak (`lines 128-132, 134-139`)**:
   Rapid clicking on the Harvest button before React state updates allows multi-harvest event firing. The 600ms `setTimeout` in `handleWaterCrop` lacks cleanup on modal close/unmount.

---

### 1.2 RoverMissionModal.tsx (`src/components/RoverMissionModal.tsx`)
1. **Zero Battery/Energy Deduction on Sortie Launch (`lines 157-179, App.tsx:1215-1227`)**:
   ```typescript
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
   In `App.tsx`:
   ```typescript
   const handleRoverSortieComplete = (reward: { water?: number; shield?: number; science?: number; energyBonus?: number }) => {
     ...
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
   ```
   *Finding*: The modal verifies `currentEnergy >= activeTarget.batteryCost`, but `batteryCost` is NEVER passed to `onCompleteSortie` and NEVER deducted from `currentColony.resources.energy`. Sorties are 100% free of energy cost.
2. **Infinite Perpetual Energy Generator Loop (`lines 90-103, 123-136`)**:
   - Lunar target `eternal_light_ridge`: batteryCost 12 kWh, reward `energyBonus: 15`.
   - Martian target `dune_field_clean`: batteryCost 12 kWh, reward `energyBonus: 18`.
   *Finding*: Because batteryCost is not deducted, running these sorties yields net positive energy (+15 or +18 kWh) infinitely on Day 1.
3. **Absence of Sortie Cooldowns or Sol Limits**:
   Players can launch unlimited rover expeditions on Sol 1, filling water to 100%, shield to 100%, and earning hundreds of science points in minutes.
4. **Simulated Risks/Hazards are 100% Cosmetic (`lines 36, 157-179, 271-276`)**:
   `riskLevel` ('Bajo', 'Medio', 'Alto') only alters badge text color. There is zero failure rate, zero risk of rover entrapment, damage, or resource penalty.
5. **Target Switching Mid-Flight & Close Race Condition (`lines 160-178, 206-213, 217-257`)**:
   Target selection buttons and the modal close button remain active while `isDeploying` is true (1200ms). Closing and reopening the modal can trigger overlapping timers and multiple reward claims.

---

### 1.3 NasaQuizModal.tsx (`src/components/NasaQuizModal.tsx`)
1. **Unrestricted Quiz Restart & Infinite Science Farming (`lines 174-183, 185-191, App.tsx:1239-1260`)**:
   ```typescript
   } else {
     // Finished quiz!
     setIsCompleted(true);
     soundFx.playVictory();
     confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
     const scienceEarned = score * 10;
     onAddSciencePoints(scienceEarned);
     // Give the requested +20 science bonus and +20% crew morale!
     onQuizBonus(20, 20);
   }
   ...
   const handleRestart = () => {
     setCurrentQuestionIndex(0);
     setSelectedAnswer(null);
     setIsAnswered(false);
     setScore(0);
     setIsCompleted(false);
   };
   ```
   *Finding*: Finishing the 5 static questions awards up to 50 science points plus a +20 science bonus and +20% crew morale (+70 science total). The completion screen offers a "Reintentar Quiz" button with zero cooldown, allowing infinite repeats.
2. **Double Science Scoring on Quiz Finish (`lines 178-181, App.tsx:1604-1610`)**:
   `handleNextQuestion` invokes BOTH `onAddSciencePoints(score * 10)` AND `onQuizBonus(20, 20)`, stacking two separate science awards on completion.
3. **Full Reward Bonus Granted on Zero Score (`lines 178-182`)**:
   Even if the user scores 0/5, `onQuizBonus(20, 20)` is unconditionally dispatched, granting +20 Science and +20% Morale for failure.
4. **Button Spamming on Question 5 Navigation (`lines 288-295`)**:
   The "Ver Resultados" button lacks a `disabled` attribute or debouncing guard. Rapid clicking triggers `handleNextQuestion` multiple times before `isCompleted` renders, dispatching duplicate reward calls.
5. **Uncapped Science Points Breaking Module Upgrades (`App.tsx:410-433, 1605-1608`)**:
   `prev.resources.sciencePoints + pts` has no ceiling. Since module upgrades cost only 10 science points (20 for bunker on hard mode), quiz farming allows maxing out all base modules on Day 1.

---

### 1.4 MissionReportModal.tsx (`src/components/MissionReportModal.tsx`)
1. **Premature Victory Certificate Generation on Day 1 (`lines 63-247, Navbar.tsx:394-403`)**:
   ```tsx
   {/* Mission Report in Navbar */}
   <button
     onClick={() => {
       soundFx.playClick();
       onOpenReport();
     }}
     ...
     title="Informe de Misión y Certificado"
   >
     <Award className="w-3.5 h-3.5" />
   </button>
   ```
   *Finding*: The Award button in `Navbar.tsx` is clickable on Day 1. `MissionReportModal` unconditionally displays the official "CERTIFICADO DE COMANDANTE DE MISIÓN" with "HONOR MÁXIMO: COMANDANTE SUPREMO (MODO DIFÍCIL)", certifying successful completion of the mission when 0 days have been survived.
2. **Missing Precondition Verification (`lines 30-44, 162-166, 174-177`)**:
   The modal receives `currentDay` and `totalDays` as props, but lacks any check verifying that `currentDay >= totalDays` and `missionCompleted === true`.
3. **Division by Zero / NaN on Crew Health (`line 60`)**:
   `avgCrewHealth = Math.round(crew.reduce((acc, c) => acc + c.health, 0) / crew.length)`. If the crew array is empty, this produces `NaN%`.
4. **Residual Crisis State Leak on Mission Restart (`App.tsx:1294-1309`)**:
   Clicking "Iniciar Nueva Misión / Reiniciar Base" resets colony data to Day 1, but does NOT reset `activeCrisis` to `null`. If a historical crisis was active, its conditions remain active on the newly restarted base.

---

## 2. Logic Chain

The step-by-step causal chain connecting our direct observations to the system vulnerabilities is as follows:

```
[Observation: BotanicalLabModal.handleWaterCrop has no onConsumeWater callback]
       │
       ▼
[Logic Step 1: Watering checks water >= 5 but leaves colony water unchanged (0L cost)]
       │
       ▼
[Observation: Initial growth is 65%, threshold is 80%, watering adds +25%]
       │
       ▼
[Logic Step 2: 1 free click achieves 90% maturity; harvest awards +25 food, +15 science, +5 health, +12 morale]
       │
       ▼
[Observation: No daily harvest limit or Sol cooldown exists in BotanicalLabModal or App.tsx]
       │
       ▼
[Logic Step 3: Player can repeat water x4 (2.4s) -> harvest -> repeat indefinitely on Sol 1]
       │
       ▼
[CRITICAL EXPLOIT 1: Infinite free food, science, crew health, and morale on Day 1]
```

```
[Observation: RoverMissionModal does not pass batteryCost to onCompleteSortie]
       │
       ▼
[Observation: App.tsx handleRoverSortieComplete only adds rewards, never subtracts energy]
       │
       ▼
[Logic Step 4: All rover expeditions cost 0 kWh battery in actual colony resources]
       │
       ▼
[Observation: eternal_light_ridge grants +15 energy; dune_field_clean grants +18 energy]
       │
       ▼
[Logic Step 5: Launching energy sorties creates a net-positive infinite energy fountain]
       │
       ▼
[CRITICAL EXPLOIT 2: Unlimited rover sorties with zero cost & infinite energy generation loop]
```

```
[Observation: NasaQuizModal has 5 fixed questions and a "Reintentar Quiz" button on completion]
       │
       ▼
[Observation: handleNextQuestion calls BOTH onAddSciencePoints AND onQuizBonus(20, 20)]
       │
       ▼
[Logic Step 6: Completing the quiz grants up to 70 science + 20% morale every attempt; score 0 still grants +20 science]
       │
       ▼
[Observation: Module upgrades cost 10-20 science, and sciencePoints has no maximum cap]
       │
       ▼
[CRITICAL EXPLOIT 3: Unlimited module upgrades on Day 1 by retrying quiz 3-4 times]
```

```
[Observation: Navbar exposes onOpenReport() via global Award icon at all times]
       │
       ▼
[Observation: MissionReportModal unconditionally renders the completion certificate and honors]
       │
       ▼
[Logic Step 7: A player on Day 1 opens the modal and receives the official NASA Commander Certificate]
       │
       ▼
[CRITICAL EXPLOIT 4: Flow skipping - claiming full mission victory and honors on Sol 1]
```

---

## 3. Catalog of Identified Vulnerabilities & Reproduction Vectors

| ID | Component | Vulnerability / Bug | File & Line | Severity | Reproduction Vector |
|---|---|---|---|---|---|
| **VULN-B1** | `BotanicalLabModal.tsx` | Free Irrigation: 0 Water Deducted | `BotanicalLabModal.tsx:125-132`<br>`App.tsx:1555-1562` | **High** | Open Botanical Lab with >=5L water; click "Regar con Agua (-5L)". Growth increases by 25%, colony water remains unchanged. |
| **VULN-B2** | `BotanicalLabModal.tsx` | Infinite Day-1 Harvest Spam | `BotanicalLabModal.tsx:111, 134-139`<br>`App.tsx:1186-1212` | **Critical** | Open modal on Day 1; click water once (progress 90%); click "Cosechar" (+25 food, +15 science, +5 health, +12 morale). Water 3 more times; harvest again. Repeat for infinite resources. |
| **VULN-B3** | `BotanicalLabModal.tsx` | Ignored Energy & Solar Flare State | `BotanicalLabModal.tsx:22, 105`<br>`types/game.ts:142-143` | **Medium** | Grow lights consume 0 energy; solar flare flags `plantsNeedDoubleWaterOnce` and `plantsWipedGrowth` have zero effect on modal state. |
| **VULN-B4** | `BotanicalLabModal.tsx` | Static Rewards Ignoring Crop & Light | `BotanicalLabModal.tsx:117-120, 137` | **Low** | Select Spirulina vs Mizuna; tune light to 20% vs 75%. Click Harvest: both give identical flat 25 food, 15 science, 12 morale. |
| **VULN-B5** | `BotanicalLabModal.tsx` | Harvest Concurrency & Timer Leak | `BotanicalLabModal.tsx:128-132, 134-139` | **Medium** | Rapidly double click "Cosechar"; multiple `onHarvest` events dispatch. Close modal during watering; timeout updates unmounted state. |
| **VULN-R1** | `RoverMissionModal.tsx` | Zero Battery Cost on Sortie Launch | `RoverMissionModal.tsx:157-178`<br>`App.tsx:1215-1227` | **High** | Select target with batteryCost 16 kWh; click "Despachar Expedición". Resources rewarded; colony battery is never deducted. |
| **VULN-R2** | `RoverMissionModal.tsx` | Perpetual Infinite Energy Generator | `RoverMissionModal.tsx:90-103, 123-136` | **Critical** | On Moon, select "Pico de Luz Eterna" (+15 energy). On Mars, select "Campo de Dunas Séítah" (+18 energy). Launch repeatedly to refill energy to 100% for free. |
| **VULN-R3** | `RoverMissionModal.tsx` | Uncapped Rover Deployments per Sol | `RoverMissionModal.tsx:157-178` | **High** | Launch rover, close modal, reopen immediately, launch again. 10 sorties can be completed in 1 Sol, bypassing all ISRU pacing. |
| **VULN-R4** | `RoverMissionModal.tsx` | Cosmetic Risk Simulation | `RoverMissionModal.tsx:36, 157-179` | **Medium** | High-risk sorties never fail or damage rovers; 100% success rate on every run. |
| **VULN-R5** | `RoverMissionModal.tsx` | Target Switching Mid-Deployment | `RoverMissionModal.tsx:160-178, 217-257` | **Medium** | Click launch with target A; during 1200ms flight, click target B or close/reopen. Timeout resolves without cancellation. |
| **VULN-Q1** | `NasaQuizModal.tsx` | Infinite Science Farm via Retry Button | `NasaQuizModal.tsx:174-183, 185-191`<br>`App.tsx:1239-1260` | **Critical** | Complete the 5 questions; score 5/5 (+70 science). Click "Reintentar Quiz". Retake immediately. 500+ science farmed in 2 minutes. |
| **VULN-Q2** | `NasaQuizModal.tsx` | Double Science Award Stacking | `NasaQuizModal.tsx:178-181`<br>`App.tsx:1604-1610` | **Medium** | Finish quiz: `onAddSciencePoints(50)` and `onQuizBonus(20, 20)` both add science points to colony in parallel. |
| **VULN-Q3** | `NasaQuizModal.tsx` | Completion Bonus on Zero Score | `NasaQuizModal.tsx:178-182` | **Medium** | Answer all 5 questions incorrectly (score 0). Click "Ver Resultados". Still awarded +20 Science bonus and +20% crew morale. |
| **VULN-Q4** | `NasaQuizModal.tsx` | Spam Multi-Click on Final Navigation | `NasaQuizModal.tsx:167-183, 288-295` | **Medium** | Rapidly click "Ver Resultados" multiple times on Q5. Synchronous dispatches call `onAddSciencePoints` and `onQuizBonus` multiple times. |
| **VULN-Q5** | `App.tsx` / Economy | Uncapped Science Breaking Upgrades | `App.tsx:410-433, 1605-1608` | **Critical** | Farm 100 science points using Q1/R1; upgrade all base modules to max level on Sol 1, trivializing the entire game loop. |
| **VULN-M1** | `MissionReportModal.tsx` | Premature Certificate & Flow Skipping | `MissionReportModal.tsx:63-247`<br>`Navbar.tsx:394-403` | **High** | On Sol 1, click Award icon in Navbar. Official Certificate of Mission Commander and "HONOR MÁXIMO" renders and can be printed. |
| **VULN-M2** | `MissionReportModal.tsx` | Missing Completion Precondition Guard | `MissionReportModal.tsx:30-44` | **High** | Modal does not verify `currentDay >= totalDays && missionCompleted` before presenting victory celebration and certificate. |
| **VULN-M3** | `MissionReportModal.tsx` | Division by Zero (NaN% Health) | `MissionReportModal.tsx:60` | **Low** | If crew array is empty, `crew.reduce(...) / crew.length` returns `NaN`. |
| **VULN-M4** | `MissionReportModal.tsx` | Residual Crisis State on Restart | `App.tsx:1294-1309` | **Medium** | Trigger crisis; open report; click "Iniciar Nueva Misión". Base restarts to Day 1, but `activeCrisis` is not cleared. |

---

## 4. Recommended Patch Strategy & Architectural Validations

### 4.1 BotanicalLabModal & Crop Engine
1. **Pass Resource Consumption Callback**:
   - Update `BotanicalLabModalProps` to include `onDeductWater: (amount: number) => boolean`.
   - In `handleWaterCrop`: deduct 5L water atomically. If `currentWater < 5`, block action.
   - If `plantsNeedDoubleWaterOnce` is active, require and deduct 10L water, then clear the flag.
   - If `plantsWipedGrowth` is active, reset `growthProgress` to 0% and display an alert notification.
2. **Growth Progression Tied to Turn Advancement**:
   - Crop growth should primarily advance when `handleAdvanceDay()` runs (e.g., +20% per day, scaled by crop `growthDays` and module level).
   - In-modal irrigation should give a one-time boost per Sol (+15%), with a flag `isWateredToday: boolean`.
   - Limit harvests to when `growthProgress >= 100%`, and reset progress to 0% after harvest.
3. **Dynamic Crop Yields**:
   - Multiply harvest rewards by `optimalRatioScore / 100` and crop-specific nutritional profile.
4. **Button Throttling**:
   - Add `isHarvesting: boolean` guard to disable harvest button during callback execution.

### 4.2 RoverMissionModal & Expedition Engine
1. **Atomic Energy Cost Deduction**:
   - Pass `batteryCost` in `onCompleteSortie({ ...reward, batteryCost: activeTarget.batteryCost })`.
   - In `App.tsx`'s `handleRoverSortieComplete`: strictly deduct `batteryCost` from `energy`. If `currentEnergy < batteryCost`, abort transaction.
2. **Sol Cooldown / Expedition Cap**:
   - Add `roverSortieCompletedToday: boolean` to `ColonySaveData`.
   - Allow only 1 rover sortie per Sol. Reset flag in `handleAdvanceDay()`.
3. **True Hazard & Failure Simulation**:
   - Calculate failure/damage probability based on `riskLevel`:
     - Low: 95% success, 5% minor dust delay.
     - Medium: 80% success, 20% partial yield (-50%).
     - High: 65% success, 25% partial yield, 10% sortie abort with zero reward and battery spent.
4. **Lock Controls During Deployment**:
   - Disable target selection pills and modal close button while `isDeploying` is true. Store and clear timeout on unmount.

### 4.3 NasaQuizModal & STEM Challenge Architecture
1. **Single-Reward Policy per Mission / Sol**:
   - Add `quizCompleted: boolean` to `ColonySaveData` (or track `lastQuizDay`).
   - Remove or disable "Reintentar Quiz" from awarding additional science points. A player can retake the quiz for review/practice, but rewards are only granted once per mission or once every 10 Sols.
2. **Consolidate Science Awards**:
   - Award science strictly based on score: e.g. 5 pts per correct answer (max 25 pts).
   - Only grant the `onQuizBonus(20, 20)` if the player achieves a passing score of at least 80% (4/5 or 5/5 correct).
3. **Global Resource Caps**:
   - Enforce a strict ceiling on `sciencePoints` in `updateCurrentColony` (e.g., `Math.min(100, ...)` or `Math.min(150, ...)`), aligning it with oxygen, water, energy, and food.
4. **Button Debounce Guard**:
   - Add `isSubmitting: boolean` state to `handleNextQuestion` to disable the navigation button while transitioning.

### 4.4 MissionReportModal & Progression Guards
1. **Conditional View Mode**:
   - If `currentDay < totalDays` and `!missionCompleted`: render an **"Interim Flight Log & Systems Telemetry"** status card (showing current Sol, days remaining, resource efficiency, crew health, and in-progress notes). Do NOT display the completion certificate or "HONOR MÁXIMO".
   - If `currentDay >= totalDays || missionCompleted`: render the **"Official NASA Mission Commander Certificate"** and celebration actions.
2. **Division by Zero Guard**:
   - Use `crew.length > 0 ? Math.round(crew.reduce(...) / crew.length) : 0`.
3. **Clean Restart Sanitization**:
   - In `handleRestartMission()`: ensure `setActiveCrisis(null)` is called so residual historical crisis conditions are purged.

---

## 5. Potential Impact on Balance, Performance, and STEM Gameplay

| Dimension | Current Vulnerable State | Post-Patch Expected State |
|---|---|---|
| **Game Balance** | Trivialized. Players can gain infinite food, water, energy, and science on Sol 1 without advancing time or facing hazards. Module upgrades can all be maxed out on Day 1. | Meaningful tension. Resources require deliberate trade-offs, rover sorties risk scarce battery power, and crops require patient nurturing across solar cycles. |
| **STEM Fidelity** | Diluted. The scientific telemetry (photon spectrums, solar flares, radiation risk, light speed latency) is purely decorative because rewards are hardcoded and costs are not enforced. | High educational integrity. Players must calculate real battery consumption, match 75/25 LED spectra for optimal photosynthesis, and make risk decisions aligned with NASA rover protocols. |
| **System Performance** | Minor memory leak risks from uncleaned `setTimeout` calls and unthrottled concurrent event handlers triggering state updates on unmounted modals. | Solid stability. Proper debounce locks, cancellation on unmount, and atomic state updates prevent race conditions and unnecessary re-renders. |

---

## 6. Caveats

1. **Read-Only Investigation**: In accordance with explorer directives, zero modifications have been made to application source files. All findings are documented for the implementation team.
2. **Scope Boundaries**: This report focuses on Group 1 modals (`BotanicalLabModal`, `RoverMissionModal`, `NasaQuizModal`, `MissionReportModal`) and their direct interactions in `App.tsx`. Peer explorers are surveying Group 2 modals (`WiringMiniGameModal`, `CommMiniGameModal`, `IceMineModal`, `PopulationExpansionModal`).
3. **Storage Persistence**: `localStorage` serialization in `App.tsx` loads existing colony data; if a saved game already contains exploited values (e.g. 999 science points), sanitization during save-load hydration should also be verified by the patch team.

---

## 7. Conclusion

The Group 1 modals and minigames contain 17 distinct vulnerabilities and design defects that completely circumvent game progression, resource scarcity, and survival balance. The most severe flaws include **free crop irrigation without water deduction (VULN-B1)**, **infinite turnkey food and morale harvesting (VULN-B2)**, **zero battery cost rover expeditions with perpetual infinite energy generation loops (VULN-R1, VULN-R2)**, **unrestricted infinite quiz restarts granting unbounded science (VULN-Q1, VULN-Q5)**, and **premature victory certificate generation on Sol 1 (VULN-M1)**.

Implementing atomic resource deduction callbacks, per-sol expedition and quiz cooldowns, science point caps, and conditional certificate display will restore simulation integrity, preserve STEM educational value, and ensure a robust, exploit-free gameplay experience.

---

## 8. Verification Method

To independently verify the observations and logic documented in this report:

1. **Verify Baseline Code Compilation**:
   ```powershell
   npm run build
   ```
   *Expected*: Builds cleanly (`tsc -b && vite build` exits 0).
2. **Verify Linter Output**:
   ```powershell
   npm run lint
   ```
   *Expected*: Passes with 0 errors (114 stylistic/unused-import warnings).
3. **Inspect Target Files for Reported Code Locations**:
   - `src/components/BotanicalLabModal.tsx`: Inspect line 125 (`handleWaterCrop` lacking water deduction) and line 137 (`onHarvest(25, 15, 12)`).
   - `src/components/RoverMissionModal.tsx`: Inspect line 158 (`handleLaunchSortie` lacking battery deduction) and lines 90-103 (`eternal_light_ridge` net energy reward).
   - `src/components/NasaQuizModal.tsx`: Inspect lines 178-182 (`handleNextQuestion` double-reward and zero-score bonus) and lines 185-191 (`handleRestart` reset loop).
   - `src/components/MissionReportModal.tsx`: Inspect line 63 (`print:` certificate unconditionally shown) and `src/components/Navbar.tsx:394-403` (unrestricted navbar entry).
   - `src/App.tsx`: Inspect lines 1186-1212 (`handleBotanicalHarvest`), lines 1215-1235 (`handleRoverSortieComplete`), lines 1239-1260 (`handleQuizBonus`), and lines 1294-1309 (`handleRestartMission`).
4. **Invalidation Condition**:
   If `BotanicalLabModal` is observed to deduct water from `currentColony.resources.water`, or `RoverMissionModal` deducts battery from `currentColony.resources.energy`, or `NasaQuizModal` prevents re-taking the quiz for rewards, or `MissionReportModal` refuses to show the certificate until Day 28/30, this report would be invalidated. Direct code review confirms none of these safeguards currently exist.
