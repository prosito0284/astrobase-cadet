## 2026-10-30T14:52:46Z
You are Worker M3 (teamwork_worker) for Milestone 3: Facility & Engineering Minigames.
Your working directory is: c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\worker_m3\
Original request path: c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\ORIGINAL_REQUEST.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY FIRST STEP:
Read c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\ORIGINAL_REQUEST.md and c:\Users\crist\Documents\antigravity\kind-hawking\PROJECT.md before doing anything else.
Also inspect Explorer handoff reports for deep technical references:
- c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\explorer_survey_3\handoff.md
- c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\worker_m1\handoff.md

EXCLUSIVE FILE WRITE OWNERSHIP:
You own `src/components/WiringMiniGameModal.tsx`, `src/components/CommMiniGameModal.tsx`, and `src/components/IceMineModal.tsx`.
Do NOT modify files owned by other milestones.

YOUR OBJECTIVES:
1. `src/components/WiringMiniGameModal.tsx`:
   - V-WIRING-PERSIST: Reset `connections` to `{}` and re-shuffle `rightTerminals` on modal open (`useEffect` when `isOpen` becomes true).
   - V-WIRING-DEBOUNCE: When `allCorrect` is detected, immediately lock/disable all wire clicks. Clear the 700ms `setTimeout` on unmount or `onClose` so `onSuccess()` does not fire after closing.
   - V-WIRING-INJECTIVE: Enforce injective mapping — do not allow multiple left wires to connect to the exact same right terminal (if a right terminal is already used, clear its previous connection or prevent connection).
2. `src/components/CommMiniGameModal.tsx`:
   - V-COMM-PERSIST: Re-randomize starting frequency (`currentFreq`, e.g. 8.10 - 8.25) and `azimuthAngle` (e.g. 15 - 35) whenever the modal opens on a new blackout (`isOpen` transition), preventing state retention from auto-solving future blackouts.
   - V-COMM-DEBOUNCE: Add re-entrancy lock / disabled state to `handleFixAntenna` button upon click to prevent rapid spam calling `onRestoreComm()` multiple times.
   - V-COMM-AUDIO: Throttle or debounce the click sound in slider `onChange` (e.g., play only every 50ms or on step change) to prevent Web Audio buffer flooding.
3. `src/components/IceMineModal.tsx`:
   - V-ICEMINE-RACE: Add click debouncing / disabled state during astronaut assignment toggling.
   - V-ICEMINE-SAFETY & GHOST: Filter out deceased crew from assignment options. Accurately reflect base occupancy safety limits in the UI (disable assigning if `remainingInBase <= 1`).

VERIFICATION:
Run `npm run build`, `npm test`, and `npx oxlint src/components/WiringMiniGameModal.tsx src/components/CommMiniGameModal.tsx src/components/IceMineModal.tsx`.
Ensure all tests pass and build compiles cleanly with 0 errors.
Document changes and verification output in `c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\worker_m3\handoff.md`.
Update `progress.md` regularly while working.
