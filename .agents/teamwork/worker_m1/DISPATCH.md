## 2026-10-30T14:31:54Z
You are Worker 1 (teamwork_worker) for Milestone 1: Core State & Game Loop Integrity.
Your working directory is: c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\worker_m1\
Original request path: c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\ORIGINAL_REQUEST.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY FIRST STEP:
Read c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\ORIGINAL_REQUEST.md and c:\Users\crist\Documents\antigravity\kind-hawking\PROJECT.md before doing anything else.
Also inspect the Explorer handoff reports for deep technical reference:
- c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\explorer_survey_1\handoff.md
- c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\explorer_survey_2\handoff.md
- c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\explorer_survey_3\handoff.md

EXCLUSIVE FILE WRITE OWNERSHIP:
You own `src/App.tsx` and `src/types/` (and any constants in `src/data/` if needed).
Do NOT modify modal files in `src/components/` in this milestone — those will be modified by subsequent workers to match the interface contracts you establish.

YOUR SCOPE & OBJECTIVES:
1. V-CORE-LOCKOUT: Add a proper countdown ticker to `batteryLockoutSeconds` in the active Sol/second tick loop so it counts down to 0 and clears the lockout.
2. V-CORE-EMP: Add countdown ticker and clear logic to `empStunSeconds` in the game loop.
3. V-CORE-DAY-SPAM: Add a debounce / locked guard to `handleNextDay` preventing rapid clicks from bypassing the 1s fatal O2 grace timer or queueing duplicate day advances.
4. V-CORE-CRISIS-SKIP: In crisis completion logic, ensure that completing a short historical crisis (like Apollo 13, 5 days) does NOT award the full 28/30-day campaign victory achievement (`supreme_commander`).
5. V-CORE-CAPS: Implement strict clamping on all resource additions and state updaters:
   - `oxygen` clamped to `[0, maxOxygen]`
   - `water` clamped to `[0, maxWater]`
   - `energy` clamped to `[0, maxEnergy]`
   - `food` clamped to `[0, maxFood]`
   - `sciencePoints` clamped to `[0, 500]` (or appropriate upper ceiling) and never negative
   - Sanitize and clamp values during `localStorage` deserialization.
6. V-CORE-REDUCER-EFFECTS: Extract side-effects (`soundFx`, `confetti`, `showToast`, `spaceVoice.speak`, `addFlightLog`) out of React state updater closures so they do not execute multiple times in React StrictMode.
7. Implement strict backend validation in `src/App.tsx` for all modal callbacks (per Interface Contracts in PROJECT.md):
   - `handleHarvest`: accept waterCost (default 5) and deduct from `currentColony.resources.water`, clamp food/science/morale rewards, enforce daily harvest limit.
   - `handleRoverSortieComplete`: accept `batteryCost`, verify and deduct energy, enforce daily sortie limit (max 2 per Sol), prevent negative energy.
   - `handleWiringSuccess`: verify `batteryFault || wiringErrorActive` was true before clearing.
   - `handleRestoreCommunications`: verify `isCommBlackout` was true, debounce single call.
   - `handleToggleAssignAstronaut`: functional atomic update preventing duplicate IDs in `assignedToMine`, filtering dead miners, ensuring minimum crew in base.
   - `handleEmergencyO2Injected`: limit emergency canister uses (e.g. max 2 charges per mission), harmonize grace timer.
   - `handleQuizBonus`: single reward callback, award bonus only if score >= 3, enforce 1 quiz bonus per Sol, clamp science points.
   - `handleConfirmPopulationExpansion`: check `difficulty === 'dificil'`, `currentDay >= 15`, minimum resource cost.
   - `handleUpgradeModule`: atomic check inside functional updater preventing negative science points and exceeding `maxLevel`.

VERIFICATION:
Run `npm run build` and `npm run lint` and verify that the build succeeds without TypeScript or Vite errors, and lint passes on modified files.
Document your changes, build/lint output, and verification results in `c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\worker_m1\handoff.md`.

Update your `progress.md` regularly while working.
