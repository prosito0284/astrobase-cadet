# Reviewer 1 Handoff Report: Milestones 1, 2, and 3 Review

**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### Verification Tool Execution Commands and Results
- **Build (`npm run build`)**: Exited code 0 cleanly.
  ```text
  vite v8.3.5 building client environment for production...
  ✓ 1987 modules transformed.
  dist/index.html                   1.24 kB │ gzip:   0.68 kB
  dist/assets/index-Ca5KeuQR.css  121.50 kB │ gzip:  15.39 kB
  dist/assets/index-BIG_AJr5.js   537.75 kB │ gzip: 158.54 kB
  ✓ built in 938ms
  ```
- **Automated Tests (`npm test`)**: Exited code 0 cleanly (67/67 tests passing).
  ```text
  ✔ Tier 1.2: Botanical Lab - Irrigation consumes 5L water and advances growth by 25% (2.2186ms)
  ...
  ℹ tests 67 | pass 67 | fail 0 | duration_ms 663.5135
  ```
- **Linter (`npx oxlint src/App.tsx src/types/game.ts src/components/BotanicalLabModal.tsx src/components/RoverMissionModal.tsx src/components/WiringMiniGameModal.tsx src/components/CommMiniGameModal.tsx src/components/IceMineModal.tsx`)**:
  ```text
  Found 0 warnings and 0 errors.
  Finished in 126ms on 7 files with 116 rules using 12 threads.
  ```

---

### Direct Code Observations & Vulnerability Findings

#### Finding 1 (Critical): `V-BOTANICAL-WATER` Not Fixed in Application (`src/App.tsx` & `src/components/BotanicalLabModal.tsx`)
In `src/components/BotanicalLabModal.tsx` (lines 20-29 & 260-261):
```tsx
interface BotanicalLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHarvest: (foodGain: number, scienceGain: number, moraleGain: number, waterCost?: number) => void;
  currentWater: number;
  currentEnergy: number;
  lang: 'es' | 'en';
  onDeductWater?: (amount: number) => boolean | void;
  hasHarvestedToday?: boolean;
  plantsNeedDoubleWaterOnce?: boolean;
  plantsWipedGrowth?: boolean;
  currentDay?: number;
}
...
  const handleWaterCrop = () => {
    if (isWatering || growthProgress >= 100) return;
    if (currentWater < waterCostRequired) {
      soundFx.playAlert();
      return;
    }

    soundFx.playHarvest();
    setIsWatering(true);

    // Deduct water via parent callback if provided
    onDeductWater?.(waterCostRequired);
...
```
However, in `src/App.tsx` (lines 1994-2001), `BotanicalLabModal` is rendered as:
```tsx
      <BotanicalLabModal
        isOpen={isBotanicalLabOpen}
        onClose={() => setIsBotanicalLabOpen(false)}
        onHarvest={handleBotanicalHarvest}
        currentWater={currentColony.resources.water}
        currentEnergy={currentColony.resources.energy}
        lang={lang}
      />
```
- Prop `onDeductWater` is completely omitted by `App.tsx`.
- When the player clicks `Regar con Agua (-5L)` (or -10L during solar flare), `onDeductWater?.(waterCostRequired)` evaluates to `undefined`.
- Colony water is **never deducted** during irrigation. Crop growth advances for 0 water cost.
- Furthermore, in `src/App.tsx` (lines 1447-1507), `waterCost: number = 5` is mistakenly deducted **on harvest** (`handleBotanicalHarvest`), conflating harvesting with irrigation and allowing infinite free watering cycles.

#### Finding 2 (Critical): Permanent Harvest Soft-Lock on Sol 2+ (`src/components/BotanicalLabModal.tsx`)
In `src/components/BotanicalLabModal.tsx` (lines 209, 235, 302-304):
```tsx
  const [hasHarvestedLocal, setHasHarvestedLocal] = useState<boolean>(false);
...
  const hasHarvestedThisSol = hasHarvestedLocal || (propHasHarvestedToday ?? getStorageColonyFlags().hasHarvestedToday);
...
  const handleHarvestClick = () => {
    ...
    setHasHarvestedLocal(true);
    updateStorageColonyFlags({ hasHarvestedToday: true });
```
- In `src/App.tsx`, `<BotanicalLabModal />` remains mounted in the React DOM tree when closed (using `if (!isOpen) return null;` internally).
- `hasHarvestedLocal` is set to `true` upon harvest on Sol 1.
- There is **no `useEffect`** in `BotanicalLabModal.tsx` that resets `hasHarvestedLocal` back to `false` when `isOpen` changes or when the day advances.
- In addition, `App.tsx` does not pass `hasHarvestedToday` or `currentDay` to `BotanicalLabModal`.
- On Day 2 and subsequent days, `hasHarvestedThisSol` remains permanently `true`. The harvest button is disabled with label `"Cosecha Realizada (1/1)"` for the rest of the 28- or 30-day campaign.

#### Finding 3 (Critical): Permanent Rover Sortie Soft-Lock on Sol 2+ (`src/components/RoverMissionModal.tsx`)
In `src/components/RoverMissionModal.tsx` (lines 86-95, 209-211, 243-244):
```tsx
export const RoverMissionModal: React.FC<RoverMissionModalProps> = ({
  ...
  sortiesToday: propSortiesToday,
  maxSortiesPerDay = 2,
}) => {
  ...
  const [localSorties, setLocalSorties] = useState<number>(() => {
    return propSortiesToday !== undefined 
      ? propSortiesToday 
      : getStorageRoverSorties(location);
  });
...
  const activeSortieCount = propSortiesToday !== undefined ? propSortiesToday : localSorties;
  const isDailyLimitReached = activeSortieCount >= maxSortiesPerDay;
...
  deployTimeoutRef.current = setTimeout(() => {
    ...
    onCompleteSortie(sortiePayload);
    setLocalSorties(prev => prev + 1);
    incrementStorageRoverSorties(location);
    onClose();
  }, 1200);
```
- In `src/App.tsx` (lines 2003-2010), `<RoverMissionModal />` is mounted without `sortiesToday`.
- When 2 sorties are launched on Day 1, `localSorties` reaches 2.
- `RoverMissionModal` remains mounted in React's component tree. There is **no `useEffect`** resetting `localSorties` when `isOpen` becomes true or when Sol advances.
- When Sol advances in `App.tsx`, `colony.roverSortiesToday` resets to 0 in `App.tsx`, but `localSorties` inside `RoverMissionModal` stays at 2.
- On Day 2+, `isDailyLimitReached` evaluates to `true` (2 >= 2). All sortie launches on subsequent days are blocked by `if (isDailyLimitReached) { soundFx.playAlert(); return; }`.

#### Finding 4 (Major): Test Harness Facade Masks Unintegrated React Modals
In `tests/tier1_botanical_lab.test.ts` (lines 5-14):
```ts
test('Tier 1.2: Botanical Lab - Irrigation consumes 5L water and advances growth by 25%', () => {
  const sim = new AstrobaseSimulation('moon', 'normal');
  sim.cropGrowthProgress = 50;
  const initialWater = sim.colony.resources.water;

  const res = sim.waterCrop();
  assert.strictEqual(res.success, true);
  assert.strictEqual(sim.colony.resources.water, initialWater - 5);
  assert.strictEqual(sim.cropGrowthProgress, 75);
});
```
- `tests/` tests only `AstrobaseSimulation` in `tests/helpers/gameHarness.ts`.
- `AstrobaseSimulation.waterCrop()` independently deducts water (`this.colony.resources.water - WATER_COST`), masking the fact that `onDeductWater` was omitted in `src/App.tsx` and never invoked in the real UI.
- The 67/67 automated test suite creates a false sense of test pass readiness while critical game features are non-functional in the actual application.

#### Finding 5 (Positive Verification): Milestone 1 & Milestone 3 Successfully Verified
- **Milestone 1**:
  - `V-CORE-LOCKOUT` & `V-CORE-EMP`: Active 1-second `setInterval` in `src/App.tsx` (lines 384-430) decrements `batteryLockoutSeconds` and `empStunSeconds`, applies -4 kWh/s overload drain, and cleans up properly.
  - `V-CORE-DAY-SPAM`: Protected by `isAdvancingRef.current` with 400ms debounce and 3000ms lock during 0% O2 asphyxiation grace period.
  - `V-CORE-CRISIS-SKIP`: `isFullCampaign` in `src/App.tsx` (line 1371) prevents short Apollo 13 crisis completions from unlocking `supreme_commander`.
  - `V-CORE-CAPS`: `clampResources` (lines 51-86) bounds all resources (science capped at 500, resources 0-100%, handling NaN and ±Infinity).
  - `V-CORE-REDUCER-EFFECTS`: Speech, soundFx, toasts, and flight logs are moved outside state updaters.
- **Milestone 3**:
  - `V-WIRING-PERSIST` & `V-WIRING-INJECTIVE` & `V-WIRING-DEBOUNCE`: `WiringMiniGameModal.tsx` re-shuffles right terminals on `isOpen`, removes conflicting wire mappings, locks interaction upon completion with `isSolved`, cleans up timeout on unmount/close, and requires active fault precondition in `App.tsx`.
  - `V-COMM-PERSIST`, `V-COMM-DEBOUNCE`, `V-COMM-AUDIO`: `CommMiniGameModal.tsx` re-randomizes frequency and azimuth on `isOpen`, throttles slider click audio to 60ms, debounces restoration, and requires `isCommBlackout` in `App.tsx`.
  - `V-ICEMINE-RACE`, `V-ICEMINE-SAFETY`, `V-ICEMINE-GHOST`: `IceMineModal.tsx` and `handleToggleAssignAstronaut` debounce toggles, filter deceased astronauts, enforce minimum base occupancy (>=1 in Hard, >=2 in Normal), and enforce Set uniqueness.

---

## 2. Logic Chain

1. **Step 1 (Inspection of `BotanicalLabModal.tsx` and `App.tsx`)**:
   `BotanicalLabModal` was authored with prop `onDeductWater?: (amount: number) => boolean | void`. In `handleWaterCrop`, it calls `onDeductWater?.(waterCostRequired)`. In `App.tsx` (line 1994), this prop was not passed. Therefore, clicking "Regar con Agua" does not deduct water. This leaves vulnerability `V-BOTANICAL-WATER` unresolved in the user-facing application.
2. **Step 2 (Inspection of Modal Component Lifecycles)**:
   React functional components rendered conditionally via `if (!isOpen) return null;` remain mounted in the fiber tree. Their `useState` hooks initialize once on initial app load and do not re-run when `isOpen` transitions from `false` to `true`.
3. **Step 3 (Analysis of Harvest Soft-Lock)**:
   `BotanicalLabModal` sets `hasHarvestedLocal = true` on harvest. Because it lacks a `useEffect` on `isOpen` or Sol change, and because `App.tsx` does not supply `hasHarvestedToday`, `hasHarvestedThisSol` remains `true` forever after Day 1. The user can never harvest again.
4. **Step 4 (Analysis of Rover Sortie Soft-Lock)**:
   `RoverMissionModal` tracks `localSorties` without receiving `sortiesToday` from `App.tsx`. When two sorties are run on Sol 1, `localSorties` reaches 2. It never resets on Sol advancement. All rover sorties on Sol 2 and beyond are permanently locked.
5. **Step 5 (Adversarial Assessment of Test Harness)**:
   The test suite was written against `tests/helpers/gameHarness.ts` (`AstrobaseSimulation`), which re-implements game logic in pure TypeScript without executing the React components or testing their prop wiring in `App.tsx`. This created a false verification signal.
6. **Step 6 (Conclusion Derivation)**:
   Because the real application suffers from broken water deduction and permanent feature soft-locks across Milestones 2, the review verdict must be **REQUEST_CHANGES**.

---

## 3. Caveats

- Milestone 4 components (`NasaQuizModal.tsx`, `OxygenEmergencyBanner.tsx`, `EventModal.tsx`, `PopulationExpansionModal.tsx`, `MissionReportModal.tsx`) were not part of this review milestone scope and were only checked for absence of regressions against M1-M3.
- Milestone 1 and Milestone 3 implementations are well-engineered, robust, and comply with all security and architectural requirements. Once Milestone 2 integration is corrected, the entire core suite will be in an approvable state.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

### Required Fixes:

1. **Fix `src/App.tsx` Modal Wiring**:
   - Provide `onDeductWater` callback to `<BotanicalLabModal />`:
     ```tsx
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
     ```
   - Pass `sortiesToday` to `<RoverMissionModal />`:
     ```tsx
     <RoverMissionModal
       isOpen={isRoverMissionOpen}
       onClose={() => setIsRoverMissionOpen(false)}
       location={location}
       currentEnergy={currentColony.resources.energy}
       onCompleteSortie={handleRoverSortieComplete}
       lang={lang}
       sortiesToday={currentColony.roverSortiesToday ?? 0}
     />
     ```
   - In `handleBotanicalHarvest`, remove the redundant `water: prev.resources.water - waterCost` (or adjust it so water is not double-penalized), as water must be deducted during irrigation.

2. **Fix `src/components/BotanicalLabModal.tsx` Lifecycle**:
   - Add a `useEffect` on `[isOpen, propHasHarvestedToday, currentDay]` to synchronize and reset local state:
     ```tsx
     useEffect(() => {
       if (isOpen) {
         setHasHarvestedLocal(false);
         setIsWatering(false);
         setIsHarvesting(false);
       }
     }, [isOpen, currentDay]);
     ```
   - Rely on `propHasHarvestedToday` as the primary source of truth rather than uncoordinated `localStorage` reading.

3. **Fix `src/components/RoverMissionModal.tsx` Lifecycle**:
   - Add a `useEffect` on `[isOpen, propSortiesToday]` to synchronize `localSorties`:
     ```tsx
     useEffect(() => {
       if (isOpen) {
         setLocalSorties(propSortiesToday !== undefined ? propSortiesToday : getStorageRoverSorties(location));
         setIsDeploying(false);
       }
     }, [isOpen, propSortiesToday]);
     ```
   - Rely on `propSortiesToday` as the primary source of truth.

---

## 5. Verification Method

To verify these fixes once implemented:
1. **Irrigation Water Deduction Verification**:
   - Open Botanical Lab Modal with 75L water.
   - Click "Regar con Agua (-5L)".
   - Confirm that colony water decreases from 75L to 70L.
   - Confirm that with < 5L water, watering is blocked.
2. **Sol 2+ Harvest Verification**:
   - Grow crop to 100% and harvest on Sol 1.
   - Advance to Sol 2.
   - Open Botanical Lab Modal on Sol 2.
   - Confirm that the Harvest button is not locked with "Cosecha Realizada (1/1)", and can be harvested again once mature.
3. **Sol 2+ Rover Sortie Verification**:
   - Launch 2 rover sorties on Sol 1. Confirm that sortie limit (2/2) is reached.
   - Advance to Sol 2.
   - Open Rover Mission Modal on Sol 2.
   - Confirm that sortie count shows 0/2 and new sorties can be dispatched.
4. **Automated Suite**:
   - Run `npm run build` (must pass 0 errors).
   - Run `npx oxlint` (must pass 0 errors).
   - Run `npm test` (all tests passing).
