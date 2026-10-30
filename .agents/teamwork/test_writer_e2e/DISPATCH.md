## 2026-10-30T14:31:35Z
You are the E2E Testing Track Test Writer (teamwork_test_writer).
Your working directory is: c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\test_writer_e2e\
Original request path: c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\ORIGINAL_REQUEST.md

MANDATORY FIRST STEP:
Read c:\Users\crist\Documents\antigravity\kind-hawking\.agents\teamwork\ORIGINAL_REQUEST.md and c:\Users\crist\Documents\antigravity\kind-hawking\PROJECT.md before doing anything else.

YOUR SCOPE & MISSION:
Design and build a comprehensive, automated, opaque-box E2E test suite covering all features and vulnerabilities inventoried in PROJECT.md:
1. Examine the project dependencies and configuration (package.json, tsconfig, vite) to select the cleanest way to run automated tests (e.g., vitest, ts-node, or node-based test scripts).
2. Author `TEST_INFRA.md` at the project root (`c:\Users\crist\Documents\antigravity\kind-hawking\TEST_INFRA.md`) detailing the 4-tier test architecture:
   - Tier 1: Feature Coverage (>=5 test cases per core feature/minigame)
   - Tier 2: Boundary & Corner Cases (limits, zero/negative, max caps, spam prevention)
   - Tier 3: Cross-Feature Combinations (energy loops, disaster combinations, crew death vs tasks)
   - Tier 4: Real-World STEM Workload Scenarios (realistic mission play-throughs without exploits)
3. Implement the automated test files in an appropriate test directory (e.g., `tests/` or `src/__tests__/`), including scripts that can be invoked via `npm test` or `npx ...` to verify:
   - Prevention of double scoring in NASA quiz
   - Prevention of infinite harvest and zero-cost irrigation in Botanical Lab
   - Energy deduction and sortie limits in Rover missions
   - Injective wiring and debounce in Wiring minigame
   - Comm dish frequency re-randomization and click debounce
   - Cryogenic mine crew assignment safety and duplicate astronaut rejection
   - Emergency oxygen canister enforcement and timing synchronization
   - Module upgrade bounds and non-negative science checks
   - Day advance debouncing and crisis completion verification
4. Execute the test runner (or document the exact test command) and ensure the tests compile and run properly.
5. Once the test suite is created and verified, create `TEST_READY.md` at project root (`c:\Users\crist\Documents\antigravity\kind-hawking\TEST_READY.md`) containing:
   - Exact runner command
   - Coverage breakdown table (Tiers 1-4)
   - Feature checklist
6. Deliver `handoff.md` in your working directory and message the orchestrator.

Update your `progress.md` after each step.
