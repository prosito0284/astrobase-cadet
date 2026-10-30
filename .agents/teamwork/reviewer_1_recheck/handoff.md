# Reviewer 1 Recheck Handoff Report

**Verdict**: **APPROVE**

---

## 1. Observation

Direct inspection of modified files, code lines, tool execution commands, and results:

### 1.1 `V-BOTANICAL-WATER` Remediation in `src/App.tsx` & `src/components/BotanicalLabModal.tsx`
- In `src/App.tsx` (lines 1986–2006):
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
  `onDeductWater` is explicitly passed and integrates `clampResources` ensuring water does not drop below 0.
- In `src/components/BotanicalLabModal.tsx` (lines 265–277):
  ```tsx
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
  ```
  Water is deducted immediately during irrigation.
- In `src/App.tsx` (lines 1447–1488):
  ```tsx
  const handleBotanicalHarvest = (foodGain: number, scienceGain: number, moraleGain: number, _waterCost: number = 0) => {
    ...
    updateCurrentColony(prev => {
      if (prev.hasHarvestedToday) return prev;

      harvested = true;
      const nextResources = clampResources({
        ...prev.resources,
        food: prev.resources.food + actualFood,
        sciencePoints: prev.resources.sciencePoints + clampedScienceGain,
      }, prev.resources);
  ```
  `handleBotanicalHarvest` receives `_waterCost: number = 0` and does NOT subtract water, preventing double deduction.

### 1.2 Botanical Lab Sol 2+ Soft-lock Remediation (`src/components/BotanicalLabModal.tsx` & `src/App.tsx`)
- In `src/components/BotanicalLabModal.tsx` (lines 188–200, 220–232):
  ```tsx
  export const BotanicalLabModal: React.FC<BotanicalLabModalProps> = ({
    ...
    hasHarvestedToday: propHasHarvestedToday,
    plantsNeedDoubleWaterOnce: propPlantsNeedDoubleWaterOnce,
    plantsWipedGrowth: propPlantsWipedGrowth,
    currentDay,
  }) => {
    ...
    // Synchronize and reset local states on modal open or day advance
    useEffect(() => {
      if (isOpen) {
        // oxlint-disable-next-line react/set-state-in-effect
        setHasHarvestedLocal(false);
        setIsWatering(false);
        setIsHarvesting(false);
        if (propHasHarvestedToday === false) {
          updateStorageColonyFlags({ hasHarvestedToday: false });
        }
      }
    }, [isOpen, propHasHarvestedToday, currentDay]);
  ```
  Lines 249–250:
  ```tsx
  const colonyHarvested = propHasHarvestedToday !== undefined ? propHasHarvestedToday : getStorageColonyFlags().hasHarvestedToday;
  const hasHarvestedThisSol = hasHarvestedLocal || colonyHarvested;
  ```
  `currentDay` and `hasHarvestedToday` are destructured and passed into the dependency array of the synchronization `useEffect`. When Sol advances, `hasHarvestedLocal` is reset to `false` and `propHasHarvestedToday` (reset to `false` by `App.tsx` line 1236) guarantees `hasHarvestedThisSol` becomes `false`.

### 1.3 Rover Sortie Sol 2+ Soft-lock Remediation (`src/components/RoverMissionModal.tsx` & `src/App.tsx`)
- In `src/App.tsx` (lines 2008–2016):
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
- In `src/components/RoverMissionModal.tsx` (lines 99–106):
  ```tsx
  // Synchronize local sorties and deployment state on open or prop change
  useEffect(() => {
    if (isOpen) {
      // oxlint-disable-next-line react/set-state-in-effect
      setLocalSorties(propSortiesToday !== undefined ? propSortiesToday : getStorageRoverSorties(location));
      setIsDeploying(false);
    }
  }, [isOpen, propSortiesToday, location]);
  ```
  Lines 218–220:
  ```tsx
  const activeSortieCount = propSortiesToday !== undefined ? propSortiesToday : localSorties;
  const isDailyLimitReached = activeSortieCount >= maxSortiesPerDay;
  const remainingSorties = Math.max(0, maxSortiesPerDay - activeSortieCount);
  ```
  When Sol advances, `App.tsx` resets `roverSortiesToday: 0` (line 1237). Opening `RoverMissionModal` on Sol 2+ synchronizes `localSorties` to 0, ensuring `isDailyLimitReached` evaluates to `false` (0 >= 2).

### 1.4 Automated Verification Commands & Results
- **Production Build (`npm run build`)**: Exited code 0 cleanly.
  ```text
  vite v8.3.5 building client environment for production...
  ✓ 1987 modules transformed.
  dist/index.html                   1.24 kB │ gzip:   0.68 kB
  dist/assets/index-Ca5KeuQR.css  121.50 kB │ gzip:  15.39 kB
  dist/assets/index-CMl5mmVF.js   538.05 kB │ gzip: 158.60 kB
  ✓ built in 863ms
  ```
- **Linter (`npx oxlint src/App.tsx src/components/BotanicalLabModal.tsx src/components/RoverMissionModal.tsx`)**: Exited code 0 cleanly.
  ```text
  Found 0 warnings and 0 errors.
  Finished in 107ms on 3 files with 116 rules using 12 threads.
  ```
- **Automated Test Suite (`npm test`)**: Exited code 0 cleanly.
  ```text
  ℹ tests 84
  ℹ suites 0
  ℹ pass 84
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 1727.6341
  ```

---

## 2. Logic Chain

1. **Water Deduction Correctness**:
   - Observation 1.1 confirms that `BotanicalLabModal` calls `onDeductWater?.(waterCostRequired)` upon irrigating crops.
   - `App.tsx` supplies `onDeductWater`, updating colony resources through `clampResources({ ...water: Math.max(0, prev.resources.water - cost) })`.
   - `handleBotanicalHarvest` in `App.tsx` no longer deducts water.
   - Therefore, water is deducted strictly during cultivation (irrigation) and neither omitted nor double-deducted.

2. **Botanical Lab Lifecycle & Sol 2+ Availability**:
   - Observation 1.2 demonstrates that `hasHarvestedToday` and `currentDay` are wired from `currentColony` into `BotanicalLabModal`.
   - On Sol change, `App.tsx` sets `hasHarvestedToday = false`.
   - The effect in `BotanicalLabModal.tsx` triggers on `isOpen`, `propHasHarvestedToday`, and `currentDay`, resetting `hasHarvestedLocal(false)` and updating stored flags.
   - `hasHarvestedThisSol` evaluates to `false`, allowing crops to be harvested on Sol 2 and every subsequent day. The permanent harvest soft-lock is eliminated.

3. **Rover Mission Lifecycle & Sortie Quota Synchronization**:
   - Observation 1.3 shows that `sortiesToday={currentColony.roverSortiesToday ?? 0}` is passed into `RoverMissionModal`.
   - `App.tsx` resets `roverSortiesToday = 0` on day advance.
   - The effect in `RoverMissionModal.tsx` on `[isOpen, propSortiesToday, location]` sets `localSorties` to `propSortiesToday` (0).
   - `isDailyLimitReached` evaluates to `false`, restoring the 2 daily sorties on Sol 2 and beyond. The rover expedition soft-lock is eliminated.

4. **Integrity & Code Quality Verification**:
   - No hardcoded test responses, fake implementations, or mock shortcuts exist in source files.
   - TypeScript compiles cleanly without errors.
   - Oxlint reports 0 errors and 0 warnings.
   - All 84 test specifications (Tiers 1 through 5) execute against actual game logic and pass cleanly.

---

## 3. Caveats

No caveats. All 3 critical findings from Reviewer 1 have been directly verified in source code and via automated tool execution.

---

## 4. Conclusion

**Verdict: APPROVE**

All three remediation targets have been verified to function correctly:
1. `V-BOTANICAL-WATER`: Irrigation deducts water cleanly through `onDeductWater` with `clampResources`, and `handleBotanicalHarvest` does not double-deduct.
2. Botanical Lab Sol 2+ Soft-lock: Local harvest state resets reliably via `useEffect` synchronizing with `propHasHarvestedToday` and `currentDay`.
3. Rover Sortie Sol 2+ Soft-lock: Sortie counters synchronize reliably via `useEffect` tracking `propSortiesToday`.
4. Quality & Build Invariants: `npm run build`, `oxlint`, and all 84 tests in `npm test` pass with 0 errors.

---

## 5. Verification Method

To independently reproduce the verification:

1. **Build Verification**:
   ```bash
   npm run build
   ```
   Expect: Exit code 0, 0 compilation errors.

2. **Linter Verification**:
   ```bash
   npx oxlint src/App.tsx src/components/BotanicalLabModal.tsx src/components/RoverMissionModal.tsx
   ```
   Expect: `Found 0 warnings and 0 errors.`

3. **Full Automated Test Suite**:
   ```bash
   npm test
   ```
   Expect: 84 passing tests across Tiers 1–5 in < 3 seconds.
