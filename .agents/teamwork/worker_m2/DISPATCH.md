## 2026-10-30T14:52:35Z
You are Worker M2 (teamwork_worker) for Milestone 2: Resource & Exploration Minigames.
Your working directory is: c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\worker_m2\
Original request path: c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\ORIGINAL_REQUEST.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY FIRST STEP:
Read c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\ORIGINAL_REQUEST.md and c:\Users\crist\Documents\antigravity\kind-hawking\PROJECT.md before doing anything else.
Also inspect Explorer handoff reports for deep technical references:
- c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\explorer_survey_2\handoff.md
- c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\worker_m1\handoff.md

EXCLUSIVE FILE WRITE OWNERSHIP:
You own `src/components/BotanicalLabModal.tsx` and `src/components/RoverMissionModal.tsx`.
Do NOT modify files owned by other milestones.

YOUR OBJECTIVES:
1. `src/components/BotanicalLabModal.tsx`:
   - V-BOTANICAL-WATER: In `handleWaterCrop`, pass the water deduction to the parent callback or deduct water (5L required), and disable the button while watering is in progress.
   - V-BOTANICAL-HARVEST: Require `growthProgress >= 80` to harvest. Enforce Sol-based harvest limit (e.g., track if harvested this Sol, disable harvest button once harvested until next Sol). Debounce the harvest button so rapid clicks cannot trigger duplicate harvest callbacks.
   - V-BOTANICAL-SOLAR: Properly handle solar flare flags (`plantsNeedDoubleWaterOnce` requires 10 water instead of 5; `plantsWipedGrowth` resets crop growth to 0).
   - Differentiate crop yields and growth rates appropriately based on the selected crop type.
2. `src/components/RoverMissionModal.tsx`:
   - V-ROVER-BATTERY: In `handleLaunchSortie`, pass `activeTarget.batteryCost` to `onCompleteSortie({ batteryCost: activeTarget.batteryCost, ... })` so battery energy is deducted in state. Verify `currentEnergy >= activeTarget.batteryCost` before launching.
   - V-ROVER-ENERGY: Rebalance energy targets ("Pico de Luz Eterna" and "Séítah") so reward energy does NOT exceed battery cost (eliminating perpetual infinite energy generation loops).
   - V-ROVER-RACE: Lock target selection and modal close buttons while `isDeploying` is true (during the 1200ms flight) to prevent switching targets or double-triggering.
   - V-ROVER-CAPS: Display remaining sorties per Sol (max 2 per Sol per PROJECT.md interface contract) and disable launch button when daily limit is reached.

VERIFICATION:
Run `npm run build`, `npm test`, and `npx oxlint src/components/BotanicalLabModal.tsx src/components/RoverMissionModal.tsx`.
Ensure all tests pass and build compiles cleanly with 0 errors.
Document changes and verification output in `c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\worker_m2\handoff.md`.
Update `progress.md` regularly while working.
