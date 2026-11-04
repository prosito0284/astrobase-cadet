# Project: Astrobase Cadet 3D & Gameplay Enhancements

## Architecture
- **Framework**: React 19, TypeScript, Vite, Tailwind CSS, Three.js (pure vanilla Three.js with React canvas refs for 100% deterministic WebGL lifecycle and zero React 19 peer-dependency conflicts).
- **Rendering Architecture**: Dual-view toggleable base simulation (`BaseView.tsx`) with 3D interactive WebGL view (`BaseScene3D.tsx`) and 2D classic strip. Interactive 3D Rover driving minigame (`RoverMissionModal.tsx` + `Rover3DCanvas.tsx`). Interactive 3D Planetary Globe (`PlanetGlobeSelectorModal.tsx`).
- **Physics & Simulation**: Standalone mathematical heightmap `getY(x, z)` and vehicle physics engine (`roverPhysics.ts`) with momentum, acceleration, terrain normal pitch/roll alignment, elastic obstacle rebound, and battery drainage calculation.
- **Memory & Lifecycle Integrity**: Strict recursive WebGL resource disposal (`disposal.ts`), `requestAnimationFrame` cancellation, `webglcontextlost`/`webglcontextrestored` event handling, and strict `deltaTime` clamping ($dt \le 0.1$).
- **Deployment**: Git sync to `https://github.com/prosito0284/astrobase-cadet.git` (main) and automated production deployment on Vercel (`checodeleonvaldes-4471`).

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|:------:|
| 1 | F-3D-DEPS | Install `three` and `@types/three` dependencies with zero peer-dep conflicts | M1 | Survey 1 | DONE |
| 2 | F-3D-BASE-SCENE | 3D interactive WebGL scene in `BaseView.tsx` with terrain for Shackleton & Jezero | M1 | Survey 2 | DONE |
| 3 | F-3D-ORBIT-CAM | 360° interactive orbit camera (rotation, zoom, tilt) with mouse and touch gestures | M1 | Survey 2 | DONE |
| 4 | F-3D-STRUCTURES | Central Dome, Veggie Greenhouse with lighting, tunnels, animated solar panels, DSN antenna, magnetic shield | M1 | Survey 2 | DONE |
| 5 | F-3D-PARTICLES | 3D particles for lunar/martian dust storms and DONKI X-flare solar proton streams | M1 | Survey 2 | DONE |
| 6 | F-3D-RAYCAST | Interactive raycasting on 3D modules to trigger inspection/repair/operate modals | M1 | Survey 2 | DONE |
| 7 | F-3D-TOGGLE | Seamless toggle between 3D immersive view and 2D classic strip with state persistence | M1 | Survey 2 | DONE |
| 8 | F-ROVER-PHYSICS | Real-time vehicle physics with velocity, steering, acceleration, inertia, slope resistance | M2 | Survey 3 | DONE |
| 9 | F-ROVER-CONTROLS | Dual control schemes: Keyboard (WASD/arrows) + on-screen mobile virtual joystick/D-pad | M2 | Survey 3 | DONE |
| 10 | F-ROVER-OBSTACLES | Procedural rocks/boulders, impact craters, and crevasses with elastic rebound and speed penalty | M2 | Survey 3 | DONE |
| 11 | F-ROVER-LASER | Spectrometer laser tool (Space/click/touch) with beam, audio zap, and 3-shard node fragmentation | M2 | Survey 3 | DONE |
| 12 | F-ROVER-RESOURCES | Cyan Ice (Water), bronze Regolith (Shield), and violet Science nodes with magnetic collection | M2 | Survey 3 | DONE |
| 13 | F-ROVER-BATTERY | Dynamic battery drainage (passive, speed, uphill, laser) with warning ramp and Base Lander beacon | M2 | Survey 3 | DONE |
| 14 | F-ROVER-REWARDS | Dynamic reward calculation based on gathered resources fed into `onCompleteSortie` | M2 | Survey 3 | DONE |
| 15 | F-ROVER-FALLBACK | Accessible "Despacho Rápido" (Quick Sortie) path preserving headless test contracts | M2 | Survey 3 | DONE |
| 16 | F-ASTRONAUTS-3D | Animated astronaut figures with visible walking/inspection tasks on base and tunnels | M3 | Survey 2 | DONE |
| 17 | F-GLOBE-3D | Interactive 3D Moon and Mars planetary globe selector with 360° rotation & landing markers | M3 | Survey 3 | DONE |
| 18 | F-WEBGL-DISPOSAL | Recursive disposal of geometries, materials, textures, renderers and DOM removal | M4 | Survey 1, 2 | DONE |
| 19 | F-LIFECYCLE-STABILITY | `cancelAnimationFrame` cleanup, `webglcontextlost`/`restored`, tab visibility pause/resume | M4 | Survey 1, 2 | DONE |
| 20 | F-DELTA-CLAMP | Strict `deltaTime` clamping ($dt \le 0.1$) against background tab freeze and speed hacks | M4 | Survey 2, 3 | DONE |
| 21 | F-BRAND-PRESERVE | 100% preservation of "🌲 Troncos Intergalácticos", NASA events, balance, dual save v7 | M4 | Survey 1, 2 | DONE |
| 22 | F-TEST-RETENTION | All 109 existing automated tests continue to pass 100% (`npm test`) | M5 | Survey 1 | DONE |
| 23 | F-TEST-NEW-3D | Comprehensive unit & integration tests for 3D base logic, rover physics, battery, and disposal | M5 | Survey 1, 3 | DONE |
| 24 | F-BUILD-CLEAN | Clean `npm run build` compilation with zero TypeScript errors or blocking warnings | M5 | Survey 1 | DONE |
| 25 | F-GIT-SYNC | Autonomous Git synchronization (`git add`, `git commit`, `git push origin main`) | M5 | Survey 1 | DONE |
| 26 | F-VERCEL-DEPLOY | Autonomous Vercel production deployment update verified via Vercel CLI | M5 | Survey 1 | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|:------:|
| M1 | 3D Interactive Space Base | `three` install, `BaseScene3D.tsx`, `base3DBuilder.ts`, `particleSystems.ts`, `BaseView.tsx` 2D/3D toggle, 360 camera, structures, raycasting | None | DONE |
| M2 | 3D Playable Rover Driving Mode | `RoverMissionModal.tsx`, `roverPhysics.ts`, `roverTerrain.ts`, `roverModels.ts`, `RoverHUD.tsx`, `Rover3DCanvas.tsx` | M1 | DONE |
| M3 | Animated Astronauts & 3D Planet Globe | Astronaut animations on base/tunnels, `PlanetGlobeSelectorModal.tsx`, `Navbar.tsx` globe integration | M1 | DONE |
| M4 | Studio Quality, WebGL Memory Leaks & Anti-Bugs | `disposal.ts`, context loss handlers, rAF cleanup, deltaTime clamping, anti-cheat, brand & save v7 checks | M1, M2, M3 | DONE |
| M5 | Test Hardening, Git Sync & Vercel Deployment | New tests, 109+ tests pass, `npm run build`, git push, vercel deploy | M1, M2, M3, M4 | DONE |

## Interface Contracts

### BaseView ↔ BaseScene3D
```typescript
interface BaseScene3DProps {
  location: 'moon' | 'mars';
  modules: BaseModule[];
  radiationActive: boolean;
  dustStormActive: boolean;
  isLunarNight: boolean;
  wiringErrorActive?: boolean;
  emergencyO2Active?: boolean;
  assignedToMineCount?: number;
  onSelectModule: (moduleId: string) => void;
  selectedModuleId: string | null;
  lang: 'es' | 'en';
}
```

### RoverMissionModal ↔ Rover3DCanvas
```typescript
interface Rover3DCanvasProps {
  location: 'moon' | 'mars';
  activeTarget: RoverTarget;
  currentEnergy: number;
  onFinishMission: (results: {
    collectedWater: number;
    collectedShield: number;
    collectedScience: number;
    batteryUsed: number;
    batteryRemainingPct: number;
    dockedSuccessfully: boolean;
  }) => void;
  onCancel: () => void;
  lang: 'es' | 'en';
}
```

### roverPhysics ↔ RoverHUD
```typescript
interface RoverState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  batteryPct: number;
  cargo: { water: number; shield: number; science: number };
  laserCooldown: number;
  isDrilling: boolean;
  warningAlert: boolean;
  criticalAlert: boolean;
  distanceToBase: number;
}
```

## Code Layout
```
src/
├── components/
│   ├── BaseView.tsx                      # Master base view with 3D/2D toggle
│   ├── RoverMissionModal.tsx              # Rover modal with 3D game + Quick Sortie
│   ├── Navbar.tsx                        # Header with planet selector launcher
│   ├── 3d/
│   │   ├── BaseScene3D.tsx               # Three.js canvas & render loop for space base
│   │   ├── base3DBuilder.ts              # Procedural terrain, 3D structures, lighting
│   │   ├── particleSystems.ts            # Dust storm & DONKI solar radiation particles
│   │   └── disposal.ts                   # Recursive WebGL resource disposal & memory guard
│   ├── rover3d/
│   │   ├── Rover3DCanvas.tsx             # Three.js canvas & minigame loop
│   │   ├── roverPhysics.ts               # Standalone vehicle physics & collision engine
│   │   ├── roverTerrain.ts               # Multi-octave continuous heightmap & nodes
│   │   ├── roverModels.ts                # VIPER & Perseverance procedural meshes & laser
│   │   └── RoverHUD.tsx                  # Touch controls, speedometer, battery & cargo
│   └── globe3d/
│       ├── PlanetGlobeSelectorModal.tsx  # 3D interactive Moon/Mars globe selector
│       └── globeShaders.ts               # Procedural planet surfaces & atmospheric halos
tests/
├── tier1_*.test.ts                       # Existing 15 test files (109 tests preserved)
├── tier1_3d_base.test.ts                 # New unit tests for 3D base logic & structures
├── tier1_3d_rover_physics.test.ts        # New unit tests for rover physics & collision
└── tier1_globe_and_disposal.test.ts      # New unit tests for WebGL disposal & globe math
```
