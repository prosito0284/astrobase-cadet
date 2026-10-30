# Test Architecture & Verification Infrastructure (`TEST_INFRA.md`)
**Project**: Astrobase Cadet (Ares Base: Mars & Moon Survival Management Simulation)  
**Author**: QA & E2E Testing Track (`teamwork_test_writer`)  
**Standard**: Opaque-box E2E Automated Verification (Tiers 1–4)  

---

## 1. Overview & Test Infrastructure Principles

The Astrobase Cadet testing infrastructure is built to provide rigorous, automated, and opaque-box verification of all core simulation mechanics, STEM telemetry, and exploit mitigations specified in `PROJECT.md` and `ORIGINAL_REQUEST.md`.

### Core Engineering Requirements
1. **Opaque-Box E2E Simulation**: Tests interact through domain interfaces and external user actions (sorties, harvesting, wiring connections, quiz answering, day advancement) without white-box mocking of internal variables.
2. **Deterministic Reproducibility**: Seeded scenarios and deterministic time transitions prevent flaky assertions.
3. **High-Performance Execution**: Powered by `tsx` and the native Node.js 24 test runner (`node:test`, `node:assert/strict`), executing all 4 tiers in under 3 seconds with zero external browser dependencies.
4. **Vulnerability Regression Protection**: Each of the 37 security vulnerabilities cataloged in `PROJECT.md` has dedicated assertions ensuring exploits (double claiming, click spam, infinite resource generation, zero-cost actions) cannot recur.

---

## 2. Four-Tier Test Architecture

```
+-------------------------------------------------------------------------+
|                  TIER 4: REAL-WORLD STEM WORKLOAD SCENARIOS             |
|  - 28-Day Lunar Campaign (Normal)  - 30-Sol Martian Campaign (Hard)     |
|  - Apollo 13 Crisis Protocol       - NASA Open Data Validation          |
+-------------------------------------------------------------------------+
                                    ▲
+-------------------------------------------------------------------------+
|                  TIER 3: CROSS-FEATURE COMBINATIONS                     |
|  - Power Starvation Loops          - Cascading ECLSS Failures           |
|  - Ghost Miner Rejection           - Disaster Compounding (EMP+Dust)    |
|  - Population Stress Test          - Comm Blackout Interlocks           |
+-------------------------------------------------------------------------+
                                    ▲
+-------------------------------------------------------------------------+
|                  TIER 2: BOUNDARY & CORNER CASES                        |
|  - Resource Zero/Negative Caps     - Science Upper Limit (500 pts)      |
|  - Rapid Click Spam Debouncing     - Non-Injective Mapping Rejection    |
|  - Single-Sol Action Frequency     - Division-by-Zero (Empty Crew)      |
+-------------------------------------------------------------------------+
                                    ▲
+-------------------------------------------------------------------------+
|                  TIER 1: CORE FEATURE COVERAGE                          |
|  >= 5 Test Cases per Subsystem across all 10 Core Minigames & Modules   |
+-------------------------------------------------------------------------+
```

---

## 3. Tier Breakdown & Detailed Test Catalog

### Tier 1: Feature Coverage (>=5 Test Cases per Subsystem)
Tier 1 establishes baseline behavioral verification for each isolated subsystem.

#### Subsystem 1: Core Simulation & Sol Day Progression (`tier1_core_game_loop.test.ts`)
- **T1.1.1**: Initial state baseline for Moon and Mars scenarios across difficulty tiers.
- **T1.1.2**: Daily lifecycle resource consumption (Oxygen, Water, Food, Energy).
- **T1.1.3**: Sol advance increment and campaign victory threshold evaluation (28 Moon / 30 Mars).
- **T1.1.4**: Temperature fluctuation cycles (Moon lunar night -180°C to +120°C; Mars -85°C to +20°C).
- **T1.1.5**: Battery lockout seconds decrement and EMP stun timer clearing in game loop.

#### Subsystem 2: VEGGIE Space Botanical Lab (`tier1_botanical_lab.test.ts`)
- **T1.2.1**: Red (660nm) and Blue (450nm) spectrum photon optimization per NASA OSDR OSD-379.
- **T1.2.2**: Crop irrigation consumes 5L water per cycle (prevention of 0-cost watering).
- **T1.2.3**: Crop growth progression gating (harvest only available at 100% maturity).
- **T1.2.4**: Harvest yield allocation (+25 Food, +15 Science, +12 Morale, +5 Crew Health).
- **T1.2.5**: Daily harvest cap enforcement (maximum 1 harvest event per Sol).

#### Subsystem 3: VIPER & Perseverance Rover ISRU Sorties (`tier1_rover_missions.test.ts`)
- **T1.3.1**: Target selection and battery cost deduction from colony power bus.
- **T1.3.2**: Net energy balance enforcement (no perpetual energy exploit from solar ridge sorties).
- **T1.3.3**: Surface sample reward integration (Water, Shielding, Science) scaled by difficulty.
- **T1.3.4**: Daily sortie quota enforcement (maximum 2 rover sorties per Sol).
- **T1.3.5**: Deployment debounce and flight lock guard during sortie execution.

#### Subsystem 4: Electrical Bus Wiring & Short Circuit Minigame (`tier1_wiring_minigame.test.ts`)
- **T1.4.1**: Bijective terminal matching (strictly 1:1 injective mapping from left to right).
- **T1.4.2**: Fault clearing precondition: `batteryFault` or `wiringErrorActive` must be active.
- **T1.4.3**: Crew requirement validation (Hard mode requires at least 2 available technicians).
- **T1.4.4**: Lockout hazard handling (shock disabled crew on overloaded battery bus).
- **T1.4.5**: State reset upon completion or modal close (preventing persistent auto-solve).

#### Subsystem 5: Deep Space Network (DSN) Comm Dish (`tier1_comm_minigame.test.ts`)
- **T1.5.1**: X-band carrier frequency alignment to 8.41 GHz and dish azimuth to 45°.
- **T1.5.2**: Signal strength computation and 90% lock threshold.
- **T1.5.3**: Precondition verification: `isCommBlackout` must be active to claim restoration.
- **T1.5.4**: Re-randomization of dish drift angle upon subsequent blackout events.
- **T1.5.5**: Click debounce on restoration signal (single callback trigger).

#### Subsystem 6: Cryogenic Polar Ice Mining (`tier1_ice_mine.test.ts`)
- **T1.6.1**: Astronaut assignment and unassignment toggling.
- **T1.6.2**: Mining team quota enforcement (1 miner on Hard without expansion; 2 miners otherwise).
- **T1.6.3**: Duplicate astronaut assignment rejection (Set semantics: prevent `[id, id]`).
- **T1.6.4**: Minimum habitat staffing safety rule (cannot leave base with 0 crew).
- **T1.6.5**: Automatic eviction of deceased astronauts (no ghost miners).

#### Subsystem 7: Life Support Emergency Oxygen (`tier1_oxygen_emergency.test.ts`)
- **T1.7.1**: Emergency activation threshold trigger when O2 drops below 25%.
- **T1.7.2**: Finite reserve canister enforcement (maximum 2 emergency charges per mission).
- **T1.7.3**: Synchronized valve pressurization and asphyxiation grace period.
- **T1.7.4**: Oxygen level recovery (+35% O2) capped at habitat maximum capacity.
- **T1.7.5**: Prevention of unlimited free emergency oxygen re-triggers.

#### Subsystem 8: NASA STEM Assessment Quiz (`tier1_nasa_quiz.test.ts`)
- **T1.8.1**: NASA dataset question validation and answer grading.
- **T1.8.2**: Score-gated bonus reward (completion bonus awarded only if score >= 3/5).
- **T1.8.3**: Single reward callback invocation (prevention of double scoring).
- **T1.8.4**: Daily quiz attempt limit (maximum 1 reward claimed per Sol).
- **T1.8.5**: Submission button debouncing on final question.

#### Subsystem 9: Habitat Module Engineering (`tier1_modules.test.ts`)
- **T1.9.1**: Module power toggling and real-time energy consumption recalculation.
- **T1.9.2**: Upgrade science cost deduction with non-negative science balance assertion.
- **T1.9.3**: Maximum module level cap enforcement (cannot exceed `mod.maxLevel`).
- **T1.9.4**: Storm bunker level 2 requirement for hard-mode solar flare survival.
- **T1.9.5**: Atomic upgrade operations under simulated concurrent clicks.

#### Subsystem 10: Colony Population Expansion & Flight Certification (`tier1_population_expansion.test.ts`)
- **T1.10.1**: Expansion precondition checks (Hard difficulty, Sol >= 15, not previously expanded).
- **T1.10.2**: Resource sacrifice deduction (25% penalty on all supplies).
- **T1.10.3**: Minimum supply threshold check (cannot expand with 0 supplies for free).
- **T1.10.4**: Specialist crew integration (expands roster from 4 to 6 members).
- **T1.10.5**: Mission report certification gating (premature claim blocked on Day 1).

---

### Tier 2: Boundary & Corner Cases (`tier2_boundary_corner_cases.test.ts`)
Tier 2 exercises extreme numeric values, concurrent event spam, and domain limiters.
- **T2.1 Resource Floor Clamping**: Resources cannot decrement below 0.0 under extreme drains.
- **T2.2 Resource Ceiling Clamping**: Resources cannot exceed module capacity caps (100% / maxScience: 500).
- **T2.3 Rapid Next-Day Click Spam**: 50 rapid sequential clicks on "Siguiente Día" advance exactly 1 Sol per legitimate cycle.
- **T2.4 Zero-Crew Telemetry Safety**: Division-by-zero protection in mission debrief telemetry when crew is empty (`0%` instead of `NaN%`).
- **T2.5 Harvest Rapid Double-Tap**: Multiple clicks within same frame execute harvest once.
- **T2.6 Rover Sortie Quota Overflow**: Third sortie attempt on same Sol is rejected.
- **T2.7 Non-Injective Terminal Collision**: Connecting multiple wires to terminal R1 rejects redundant links.
- **T2.8 Extreme Serialization Deserialization**: Corrupted `localStorage` payloads with NaN, negative, or infinite values clamp to safe defaults.

---

### Tier 3: Cross-Feature Combinations (`tier3_cross_feature_combinations.test.ts`)
Tier 3 stresses multiple coupled subsystems interacting simultaneously.
- **T3.1 Solar Blackout + Rover Energy Starvation**: Martian dust storm cuts solar production while Rover is deployed; base must shed non-essential modules to prevent ECLSS blackouts.
- **T3.2 Cryogenic Mine Hazard + Radiation Sickness**: Astronaut mining ice during radiation flare suffers accelerated health decay; upon demise, slot is immediately vacated and water extraction ceases.
- **T3.3 Electrical Short Circuit + ECLSS Oxygen Failure**: Battery fault disables power distribution, inducing rapid oxygen drop; emergency canister must deploy within calibrated grace window.
- **T3.4 Population Expansion Under Resource Scarcity**: Docking shuttle on Sol 15 consumes 25% supplies; if reserves fall below safety line, life-support stress triggers emergency countermeasures.
- **T3.5 Disaster Compounding (EMP Stun + Comm Blackout + Wire Fault)**: Triple failure state disables remote assistance, locks electrical repairs, and verifies no softlock occurs.

---

### Tier 4: Real-World STEM Workload Scenarios (`tier4_stem_workload_scenarios.test.ts`)
Tier 4 executes complete multi-sol mission play-throughs without exploits, validating authentic STEM survival.
- **T4.1 Complete 28-Day Lunar South Pole Campaign (Normal)**:
  - Survives Day 1 to Day 28 covering 14-day lunar daylight and 14-day polar night (-180°C).
  - Maintains power using batteries charged during daylight.
  - Regularly harvests Veggie crops with 75/25 LED ratio.
  - Deploys VIPER rover sorties for water ice extraction.
  - Achieves mission completion with all crew alive.
- **T4.2 Complete 30-Sol Martian Surface Campaign (Hard)**:
  - Manages dust storms, 2-technician electrical repairs, cryogenic mining with 1 miner.
  - Expands colony on Sol 15 to 6 astronauts.
  - Survives extreme temperature drops (-85°C).
  - Validates genuine Supreme Commander achievement criteria.
- **T4.3 Historical Crisis Protocol (Apollo 13 on Hard)**:
  - Survives 5-day crippled spacecraft scenario.
  - Verifies crisis victory awards Apollo 13 badge without triggering 28/30-day campaign achievement.
  - Verifies restart resets crisis state completely.
- **T4.4 NASA Scientific Dataset Ground Truth Verification**:
  - Verifies formulas match NASA published open datasets (OSDR OSD-379, Twins Study OSD-174, MEDA 610 Pa pressure, LRO Diviner polar ice).

---

## 4. Test Execution & Reporting Matrix

### Runner Command
```bash
npm test
```
Or directly via `tsx`:
```bash
npx tsx --test "tests/**/*.test.ts"
```

### Directory Structure
```
tests/
├── helpers/
│   ├── gameHarness.ts             # Opaque-box simulation harness & state manager
│   └── testData.ts                # Test scenarios, fixtures, and NASA telemetry
├── tier1_core_game_loop.test.ts   # Tier 1: Core simulation & Sol progression (5 tests)
├── tier1_botanical_lab.test.ts    # Tier 1: Botanical Lab greenhouse (5 tests)
├── tier1_rover_missions.test.ts   # Tier 1: Rover sorties & energy balance (5 tests)
├── tier1_wiring_minigame.test.ts  # Tier 1: Wiring & electrical bypass (5 tests)
├── tier1_comm_minigame.test.ts    # Tier 1: DSN Comm dish alignment (5 tests)
├── tier1_ice_mine.test.ts         # Tier 1: Cryogenic ice mine (5 tests)
├── tier1_oxygen_emergency.test.ts # Tier 1: Emergency life-support O2 (5 tests)
├── tier1_nasa_quiz.test.ts        # Tier 1: NASA STEM quiz (5 tests)
├── tier1_modules.test.ts          # Tier 1: Base module engineering (5 tests)
├── tier1_population_expansion.test.ts # Tier 1: Population & mission debrief (5 tests)
├── tier2_boundary_corner_cases.test.ts # Tier 2: Boundary, limits, spam prevention (8 tests)
├── tier3_cross_feature_combinations.test.ts # Tier 3: Compound failures & loops (5 tests)
└── tier4_stem_workload_scenarios.test.ts   # Tier 4: Full multi-day campaigns (4 tests)
```

---

## 5. Verification Protocol & Defect Reporting

When running automated tests:
1. **Pass Requirement**: 100% of non-escalated tests must pass.
2. **Defect Escalation**: Any discrepancy between actual behavior and `PROJECT.md` contracts is logged as an implementation defect in `handoff.md` and escalated to the orchestrator/implementing agent.
3. **No Facade Tests**: Assertions must verify actual state mutations, resource limits, and contract invariants.
