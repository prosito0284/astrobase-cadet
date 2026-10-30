## 2026-10-30T14:53:02Z
You are Worker M4 (teamwork_worker) for Milestone 4: Crew Survival, Events & Progression.
Your working directory is: c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\worker_m4\
Original request path: c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\ORIGINAL_REQUEST.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY FIRST STEP:
Read c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\ORIGINAL_REQUEST.md and c:\Users\crist\Documents\antigravity\kind-hawking\PROJECT.md before doing anything else.
Also inspect Explorer handoff reports for deep technical references:
- c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\explorer_survey_2\handoff.md
- c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\explorer_survey_3\handoff.md
- c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\worker_m1\handoff.md

EXCLUSIVE FILE WRITE OWNERSHIP:
You own:
- `src/components/OxygenEmergencyBanner.tsx`
- `src/components/EventModal.tsx`
- `src/components/PopulationExpansionModal.tsx`
- `src/components/NasaQuizModal.tsx`
- `src/components/MissionReportModal.tsx`
- `src/components/ModuleControl.tsx`
Do NOT modify files owned by other milestones.

YOUR OBJECTIVES:
1. `src/components/OxygenEmergencyBanner.tsx`:
   - V-OXYGEN-INFINITE & TIMER: Limit emergency oxygen injections (e.g. max 2 canister charges per game, display remaining canisters). Set pressurization duration to 1000ms so it completes safely within the 3.0s asphyxiation grace window. Clean up intervals on unmount.
2. `src/components/EventModal.tsx`:
   - V-EVENT-DEBOUNCE: Disable all option buttons immediately when an option is clicked (`disabled={selectedOptionIndex !== null}`), preventing multi-click duplicate triggers during the 300ms transition.
3. `src/components/PopulationExpansionModal.tsx`:
   - V-POPULATION-PRECOND & ZERO: Enforce preconditions in UI (require `difficulty === 'dificil'`, `currentDay >= 15`, and minimum base supplies of at least 20 O2, 20 H2O, 20 Energy, 20 Food so players cannot expand for 0 cost with empty tanks). Debounce confirm button.
4. `src/components/NasaQuizModal.tsx`:
   - V-QUIZ-DOUBLE & RETRY & DEBOUNCE: Eliminate double reward stacking — call a single bonus callback. Require score >= 3/5 to award passing bonus. Debounce Question 5 "Ver Resultados" button. Disable "Reintentar Quiz" on the same Sol once completed.
5. `src/components/MissionReportModal.tsx`:
   - V-REPORT-PREMATURE, CRISIS, NAN: Verify `currentDay >= totalDays && missionCompleted` before showing the official "CERTIFICADO DE COMANDANTE DE MISIÓN" and Supreme Commander badge. If opened before mission completion, show mid-mission debrief. Guard against division by zero (`NaN%`) on crew health when crew is empty. Ensure restart clears crisis.
6. `src/components/ModuleControl.tsx`:
   - V-MODULE-RACE: Debounce the "Mejorar" button to prevent double-clicking from triggering multiple upgrade requests.

VERIFICATION:
Run `npm run build`, `npm test`, and `npx oxlint` on your modified components.
Ensure all tests pass and build compiles cleanly with 0 errors.
Document changes and verification output in `c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\worker_m4\handoff.md`.
Update `progress.md` regularly while working.
