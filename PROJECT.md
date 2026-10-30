# Project: Astrobase Cadet Security, Exploit & Architectural Audit

## Architecture
- **Framework**: React 19, TypeScript, Vite, Tailwind CSS
- **State Architecture**: Centralized reactive state in `src/App.tsx` managing colony resources, crew status, modules, achievements, and events.
- **Minigame / Modal Architecture**: Functional modals communicating with parent state via callback props.
- **Security Integrity Principle**: Strict state validation, atomic state updaters, debounced user actions, precondition assertions on all reward and progression claims, upper-bound resource clamping, and synchronized timer lifecycles.

## Feature Inventory
| # | Feature / Vulnerability | Description | Milestone | Source | Status |
|---|-------------------------|-------------|-----------|--------|:------:|
| 1 | V-CORE-LOCKOUT | `batteryLockoutSeconds` lacks countdown decrement in game loop, staying permanently at 5s | M1 | Explorer 1 | RESOLVED |
| 2 | V-CORE-EMP | `empStunSeconds` lacks countdown decrement / clear logic in game loop | M1 | Explorer 1 | RESOLVED |
| 3 | V-CORE-DAY-SPAM | Rapid clicking on "Siguiente Día" bypasses 1s fatal O2 grace timer into campaign victory | M1 | Explorer 1 | RESOLVED |
| 4 | V-CORE-CRISIS-SKIP | Completing 5-day Apollo 13 crisis on Hard awards 28/30-day full campaign achievement | M1 | Explorer 1 | RESOLVED |
| 5 | V-CORE-CAPS | Science points and resources lack global upper bounds/caps in add functions and storage deserialization | M1 | Explorer 1 | RESOLVED |
| 6 | V-CORE-REDUCER-EFFECTS | Side-effects (sound, speech, logs) inside React state updater functions cause duplicate triggers | M1 | Explorer 1, 3 | RESOLVED |
| 7 | V-BOTANICAL-WATER | `handleWaterCrop` checks `currentWater >= 5` but never deducts water (0 cost irrigation) | M2 | Explorer 1, 2 | RESOLVED |
| 8 | V-BOTANICAL-HARVEST | Unlimited harvest spam on Sol 1 (+25 food, +15 science, +5 health, +12 morale) with zero cooldown | M2 | Explorer 1, 2 | RESOLVED |
| 9 | V-BOTANICAL-SOLAR | Solar flare flags (`plantsNeedDoubleWaterOnce`, `plantsWipedGrowth`) bypassed in modal | M2 | Explorer 2 | RESOLVED |
| 10 | V-ROVER-BATTERY | Rover sortie checks batteryCost but never passes/deducts it in `App.tsx` | M2 | Explorer 1, 2 | RESOLVED |
| 11 | V-ROVER-ENERGY | Free perpetual energy targets (+15 / +18 energy) grant positive net power for zero cost | M2 | Explorer 2 | RESOLVED |
| 12 | V-ROVER-RACE | 1200ms flight timeout allows switching targets or rapid queueing of expeditions | M2 | Explorer 1, 2 | RESOLVED |
| 13 | V-ROVER-CAPS | No daily sortie limit or cooldown per Sol on rover expeditions | M2 | Explorer 1, 2 | RESOLVED |
| 14 | V-WIRING-PERSIST | Wire connections persist across modal reopenings (solves future faults automatically) | M3 | Explorer 3 | RESOLVED |
| 15 | V-WIRING-DEBOUNCE | 700ms victory delay allows re-triggering `onSuccess()` and fires even after modal closed | M3 | Explorer 3 | RESOLVED |
| 16 | V-WIRING-INJECTIVE | Multiple left terminals connect to single right terminal (non-injective mapping) | M3 | Explorer 3 | RESOLVED |
| 17 | V-WIRING-PRECOND | `handleWiringSuccess` does not check if batteryFault or wiringErrorActive was actually active | M3 | Explorer 3 | RESOLVED |
| 18 | V-COMM-PERSIST | Frequency (8.41) and angle (45°) state retention auto-solves future blackouts immediately | M3 | Explorer 3 | RESOLVED |
| 19 | V-COMM-DEBOUNCE | Multi-click spam on `handleFixAntenna` calls `onRestoreComm()` repeatedly | M3 | Explorer 3 | RESOLVED |
| 20 | V-COMM-AUDIO | Slider drag fires `soundFx.playClick()` on every pixel change, flooding Web Audio | M3 | Explorer 3 | RESOLVED |
| 21 | V-ICEMINE-RACE | Closure race condition allows assigning same astronaut twice `[id, id]`, giving 2-miner yield for 1 crew | M3 | Explorer 1, 3 | RESOLVED |
| 22 | V-ICEMINE-SAFETY | Rapid clicks allow assigning all crew to mine, leaving 0 crew in base habitat | M3 | Explorer 3 | RESOLVED |
| 23 | V-ICEMINE-GHOST | Deceased crew members remain in `assignedToMine` permanently blocking slots | M3 | Explorer 1 | RESOLVED |
| 24 | V-QUIZ-DOUBLE | NASA Quiz invokes both `onAddSciencePoints` and `onQuizBonus(20, 20)` awarding double rewards | M4 | Explorer 1, 2 | RESOLVED |
| 25 | V-QUIZ-RETRY | Unlimited retries on Sol 1 granting up to +70 science and +20% morale repeatedly | M4 | Explorer 1, 2 | RESOLVED |
| 26 | V-QUIZ-SCORE | 0/5 failing score still awards full completion bonus | M4 | Explorer 2 | RESOLVED |
| 27 | V-QUIZ-DEBOUNCE | Question 5 "Ver Resultados" button lacks debounce guard | M4 | Explorer 2 | RESOLVED |
| 28 | V-REPORT-PREMATURE | Navbar exposes award button on Day 1; modal displays Supreme Commander victory certificate | M4 | Explorer 2 | RESOLVED |
| 29 | V-REPORT-CRISIS | Restarting mission does not clear `activeCrisis`, leaking into new games | M4 | Explorer 2 | RESOLVED |
| 30 | V-REPORT-NAN | Division by zero on crew health telemetry if crew array is empty (`NaN%`) | M4 | Explorer 2 | RESOLVED |
| 31 | V-EVENT-DEBOUNCE | Option buttons unblocked during 300ms transition, duplicating resource/science gains | M4 | Explorer 1, 3 | RESOLVED |
| 32 | V-OXYGEN-INFINITE | Infinite free emergency O2 (+35%) without consuming canisters or charge limit | M4 | Explorer 1, 3 | RESOLVED |
| 33 | V-OXYGEN-TIMER | 1.0s asphyxiation death timer conflicts with 2.0s valve pressurization timer | M4 | Explorer 1, 3 | RESOLVED |
| 34 | V-POPULATION-PRECOND | `handleConfirmPopulationExpansion` missing difficulty ('dificil') and Day 15 checks | M4 | Explorer 3 | RESOLVED |
| 35 | V-POPULATION-ZERO | Zero-resource base gets 2 free specialist crew members for 0 cost | M4 | Explorer 3 | RESOLVED |
| 36 | V-POPULATION-SIDE-EFFECT | Rapid clicks trigger external side-effects (toast, voice, achievement) multiple times | M4 | Explorer 3 | RESOLVED |
| 37 | V-MODULE-RACE | Double-clicking module upgrade subtracts science twice (into negatives) and exceeds maxLevel | M4 | Explorer 1, 3 | RESOLVED |
| 38 | V-TEST-HARNESS | Comprehensive automated test suite (Tiers 1-5, 84 tests) verifying all security fixes | M5 | E2E Testing Track | RESOLVED |
| 39 | V-AUDIT-FINAL | Final adversarial verification, audit hardening (Tier 5), and AUDIT_SECURITY_REPORT.md | M6 | Final Track | RESOLVED |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|:------:|
| M1 | Core State & Game Loop Integrity | `src/App.tsx`, `src/types/`, timers, resource clamping, lockout tick, crisis achievements | None | DONE |
| M2 | Resource & Exploration Minigames | `src/components/BotanicalLabModal.tsx`, `src/components/RoverMissionModal.tsx`, water/battery deduction & caps | M1 | DONE |
| M3 | Facility & Engineering Minigames | `src/components/WiringMiniGameModal.tsx`, `src/components/CommMiniGameModal.tsx`, `src/components/IceMineModal.tsx` | M1 | DONE |
| M4 | Crew Survival, Events & Progression | `src/components/OxygenEmergencyBanner.tsx`, `src/components/EventModal.tsx`, `src/components/PopulationExpansionModal.tsx`, `src/components/NasaQuizModal.tsx`, `src/components/MissionReportModal.tsx`, `src/components/ModuleControl.tsx` | M1 | DONE |
| M5 | E2E Testing Track (Tiers 1-5) | Opaque-box automated test suite (84 tests) covering all exploit mitigations, boundary cases, and STEM balance | M1, M2, M3, M4 | DONE |
| M6 | Final Adversarial Hardening & Audit Report | Pass 100% E2E tests, Tier 5 adversarial tests, and generate `AUDIT_SECURITY_REPORT.md` | M5 | DONE |

## Verification Summary
- **Build (`npm run build`)**: Pass (0 errors, 1987 modules transformed, built in <1s)
- **Lint (`npx oxlint`)**: Pass (0 warnings, 0 errors across all source and test files)
- **Test Suite (`npm test`)**: Pass (84/84 tests passing across Tiers 1–5, 100% pass rate in ~700ms)
- **Forensic Audit**: CLEAN (0 integrity violations, authenticated by `teamwork_auditor`)
- **Documentation**: `AUDIT_SECURITY_REPORT.md` delivered at project root (656 lines, 62.4 kB).
