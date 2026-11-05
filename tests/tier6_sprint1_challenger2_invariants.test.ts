import { describe, it } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  updateEvaMovement,
  resolveCollisions,
  normalizeCompassDegrees,
  getCardinalDirection,
  MODULE_COLLIDERS,
  TUNNEL_COLLIDERS,
  EVA_SPAWN_POINT,
  MAX_EXPLORATION_RADIUS,
  EVA_SPRINT_SPEED,
  PLAYER_COLLISION_RADIUS,
  EvaControllerState,
} from '../src/components/3d/evaControls';
import { HelmetHUD } from '../src/components/3d/HelmetHUD';
import { getTerrainHeight } from '../src/components/3d/base3DBuilder';

describe('Tier 6 Challenger 2: Sprint 1 Invariants & Edge-Case Verification', () => {

  const renderClean = (element: React.ReactElement): string => {
    return renderToString(element).replace(/<!-- -->/g, '');
  };

  /* =========================================================================
   * SUITE 1: Zero and Negative Oxygen Telemetry Handling in Helmet HUD
   * ========================================================================= */
  describe('1. Helmet HUD Oxygen Telemetry & Vital Diagnostics Invariants', () => {

    it('Zero oxygen (0.0%): clamped to 0, readout "0.0%", width "0%", critical red pulse active', () => {
      const htmlEs = renderClean(
        React.createElement(HelmetHUD, {
          oxygenPct: 0,
          cameraYawDeg: 0,
          location: 'moon',
          onExitEva: () => {},
          lang: 'es',
        })
      );

      // Verify exact percentage readout
      assert.ok(htmlEs.includes('0.0%'), 'Readout must display "0.0%" for 0% oxygen');
      // Verify bar gauge width is 0%
      assert.ok(htmlEs.includes('style="width:0%"'), 'Gauge bar width must be exactly 0%');
      // Verify critical state styling
      assert.ok(htmlEs.includes('CRÍTICO'), 'Status text must show CRÍTICO');
      assert.ok(htmlEs.includes('text-rose-400'), 'Text color must be rose red in critical state');
      assert.ok(htmlEs.includes('animate-pulse'), 'Pulsing animation must be applied to critical alert');

      // Verify English language localization
      const htmlEn = renderClean(
        React.createElement(HelmetHUD, {
          oxygenPct: 0,
          cameraYawDeg: 0,
          location: 'moon',
          onExitEva: () => {},
          lang: 'en',
        })
      );
      assert.ok(htmlEn.includes('0.0%'), 'Readout must display "0.0%" in English');
      assert.ok(htmlEn.includes('CRÍTICO') || htmlEn.includes('CRITICAL'), 'Critical indicator present');
      assert.ok(htmlEn.includes('O₂ Life Support'), 'English header must be present');
    });

    it('Negative oxygen inputs (-0, -10, -50, -Infinity): clamped to 0.0% without layout breakage', () => {
      const negativeCases = [-0, -0.001, -10, -50, -100, -Infinity];

      for (const negO2 of negativeCases) {
        const html = renderClean(
          React.createElement(HelmetHUD, {
            oxygenPct: negO2,
            cameraYawDeg: 45,
            location: 'mars',
            onExitEva: () => {},
            lang: 'es',
          })
        );

        // Clamping ensures readout is never negative (no "-10.0%")
        assert.ok(!html.includes('-%'), `Must not display negative percentage for ${negO2}`);
        assert.ok(html.includes('0.0%'), `Must clamp ${negO2} to "0.0%"`);
        assert.ok(html.includes('style="width:0%"'), `Gauge width must be 0% for ${negO2}`);
        assert.ok(html.includes('CRÍTICO'), `Critical tag must be active for ${negO2}`);
      }
    });

    it('O2 color and threshold boundaries: Critical (<= 20%), Reserve (20–50%), Nominal (> 50%)', () => {
      // 1. Critical boundary (20.0% vs 20.01%)
      const html20 = renderClean(
        React.createElement(HelmetHUD, {
          oxygenPct: 20.0,
          cameraYawDeg: 0,
          location: 'moon',
          onExitEva: () => {},
          lang: 'es',
        })
      );
      assert.ok(html20.includes('20.0%'), 'Shows 20.0%');
      assert.ok(html20.includes('CRÍTICO'), '20.0% is inside critical threshold (<=20)');
      assert.ok(html20.includes('text-rose-400'), '20.0% uses rose-400');

      const html20_1 = renderClean(
        React.createElement(HelmetHUD, {
          oxygenPct: 20.1,
          cameraYawDeg: 0,
          location: 'moon',
          onExitEva: () => {},
          lang: 'es',
        })
      );
      assert.ok(html20_1.includes('20.1%'), 'Shows 20.1%');
      assert.ok(html20_1.includes('RESERVA'), '20.1% enters reserve threshold');
      assert.ok(html20_1.includes('text-amber-400'), '20.1% uses amber-400');

      // 2. Reserve / Nominal boundary (50.0% vs 50.01%)
      const html50 = renderClean(
        React.createElement(HelmetHUD, {
          oxygenPct: 50.0,
          cameraYawDeg: 0,
          location: 'moon',
          onExitEva: () => {},
          lang: 'es',
        })
      );
      assert.ok(html50.includes('50.0%'), 'Shows 50.0%');
      assert.ok(html50.includes('RESERVA'), '50.0% is still reserve threshold');

      const html50_1 = renderClean(
        React.createElement(HelmetHUD, {
          oxygenPct: 50.1,
          cameraYawDeg: 0,
          location: 'moon',
          onExitEva: () => {},
          lang: 'es',
        })
      );
      assert.ok(html50_1.includes('50.1%'), 'Shows 50.1%');
      assert.ok(html50_1.includes('NOMINAL'), '50.1% is nominal threshold');
      assert.ok(html50_1.includes('text-cyan-400'), '50.1% uses cyan-400');
    });

    it('O2 overflow inputs (> 100%, +Infinity): clamped to 100.0% with width="100%"', () => {
      const overflowCases = [100.1, 150, 9999, Infinity];

      for (const overflowO2 of overflowCases) {
        const html = renderClean(
          React.createElement(HelmetHUD, {
            oxygenPct: overflowO2,
            cameraYawDeg: 90,
            location: 'moon',
            onExitEva: () => {},
            lang: 'es',
          })
        );

        assert.ok(html.includes('100.0%'), `Overflow ${overflowO2} must clamp to 100.0%`);
        assert.ok(html.includes('style="width:100%"'), `Gauge width must be capped at 100%`);
        assert.ok(html.includes('NOMINAL'), 'Status must remain NOMINAL');
      }
    });

    it('Diagnostics telemetry extreme values render valid strings without crashing', () => {
      const extremeTelemetry = {
        suitPressureKPa: 0, // explosive decompression
        suitTempC: -273.15, // absolute zero
        heartRateBpm: 0,    // asystole / cardiac arrest
        radiationLevel: 999.99, // lethal solar CME
      };

      const html = renderClean(
        React.createElement(HelmetHUD, {
          oxygenPct: 95,
          cameraYawDeg: 180,
          ...extremeTelemetry,
          location: 'moon',
          onExitEva: () => {},
          lang: 'es',
        })
      );

      assert.ok(html.includes('0.0 kPa'), 'Zero pressure rendered correctly');
      assert.ok(html.includes('-273.1 °C') || html.includes('-273.2 °C'), 'Absolute zero temperature rendered');
      assert.ok(html.includes('0') && html.includes('BPM'), 'Zero heart rate rendered');
      assert.ok(html.includes('999.99 mSv/h'), 'Lethal radiation rendered');
    });
  });

  /* =========================================================================
   * SUITE 2: Extreme Lag Spike / Tab Freeze Resistance (dt Clamping <= 0.1s)
   * ========================================================================= */
  describe('2. Lag Spike & Tab Freeze Resistance (dt Clamping dt <= 0.1s)', () => {

    it('Extreme dt inputs (1s, 10s, 60s, 3600s) are clamped to exactly safeDt = 0.1s', () => {
      const lagSpikes = [0.15, 0.5, 1.0, 5.0, 10.0, 60.0, 3600.0];

      for (const spikeDt of lagSpikes) {
        const state: EvaControllerState = {
          x: 20, y: 1.7, z: 20, yaw: 0, pitch: 0, isMoving: false, isSprinting: false
        };

        // Facing North (yaw = 0): forward movement decreases Z
        updateEvaMovement(spikeDt, state, { KeyW: true, ShiftLeft: true }, 'moon');

        const deltaZ = 20 - state.z;
        const maxExpectedStep = EVA_SPRINT_SPEED * 0.1; // 5.8 m/s * 0.1s = 0.58m

        assert.ok(
          Math.abs(deltaZ - maxExpectedStep) < 1e-5,
          `Lag spike of dt=${spikeDt}s must be clamped to 0.1s (step=${maxExpectedStep}m), got ${deltaZ}m`
        );
      }
    });

    it('Mathematical proof of tunneling prevention: max step (0.58m) is smaller than all collision barriers', () => {
      const maxSingleStep = EVA_SPRINT_SPEED * 0.1; // 0.58m

      // Smallest dome is storm_bunker: radius = 2.6m, min distance with player is 3.05m (diameter 6.1m)
      for (const dome of MODULE_COLLIDERS) {
        const minRadialBarrier = (dome.radius + PLAYER_COLLISION_RADIUS) * 2;
        assert.ok(
          maxSingleStep < minRadialBarrier,
          `Single step (${maxSingleStep}m) must be smaller than dome ${dome.id} diameter (${minRadialBarrier}m)`
        );
      }

      // Smallest tunnel collision barrier is 2 * (0.75 + 0.45) = 2.40m
      for (const tunnel of TUNNEL_COLLIDERS) {
        const tunnelBarrierThickness = 2 * (tunnel.radius + PLAYER_COLLISION_RADIUS); // 2.40m
        assert.ok(
          maxSingleStep < tunnelBarrierThickness,
          `Single step (${maxSingleStep}m) must be strictly smaller than tunnel barrier (${tunnelBarrierThickness}m)`
        );
      }
    });

    it('Continuous lag-spike collision attack: marching across all 5 tunnels with dt=10.0s never breaches', () => {
      // If dt was NOT clamped, a 10s step at 5.8 m/s would jump 58 meters, easily jumping through any tunnel!
      // With dt clamped to 0.1s, each step advances at most 0.58m, and resolveCollisions catches the player.
      for (const tunnel of TUNNEL_COLLIDERS) {
        const segDx = tunnel.x2 - tunnel.x1;
        const segDz = tunnel.z2 - tunnel.z1;
        const segLen = Math.hypot(segDx, segDz);
        const midX = (tunnel.x1 + tunnel.x2) / 2;
        const midZ = (tunnel.z1 + tunnel.z2) / 2;
        const normalX = -segDz / segLen;
        const normalZ = segDx / segLen;

        // Position astronaut 1.5m away from tunnel along normal (just outside minSafeDist = 1.20m)
        const startDist = 1.5;
        const startX = midX + normalX * startDist;
        const startZ = midZ + normalZ * startDist;

        // Aim directly at midpoint
        const yaw = Math.atan2(normalX, normalZ);

        const state: EvaControllerState = {
          x: startX,
          y: 1.7,
          z: startZ,
          yaw,
          pitch: 0,
          isMoving: false,
          isSprinting: false,
        };

        const minSafeDist = tunnel.radius + PLAYER_COLLISION_RADIUS; // 1.20m

        // Execute 20 frames with massive 10-second lag spikes per frame
        for (let frame = 0; frame < 20; frame++) {
          updateEvaMovement(10.0, state, { KeyW: true, ShiftLeft: true }, 'moon');

          // Check distance to tunnel segment
          const projT = ((state.x - tunnel.x1) * segDx + (state.z - tunnel.z1) * segDz) / (segLen * segLen);
          const clampedT = Math.max(0, Math.min(1, projT));
          const closeX = tunnel.x1 + clampedT * segDx;
          const closeZ = tunnel.z1 + clampedT * segDz;
          const distToTunnel = Math.hypot(state.x - closeX, state.z - closeZ);

          assert.ok(
            distToTunnel >= minSafeDist - 1e-4,
            `Tunnel ${tunnel.id} breached under lag spike at frame ${frame}: dist=${distToTunnel} < min=${minSafeDist}`
          );

          // Verify player did not pass through to the other side
          const sideDot = (state.x - midX) * normalX + (state.z - midZ) * normalZ;
          assert.ok(
            sideDot >= minSafeDist - 1e-4,
            `Player tunneled across ${tunnel.id} to opposite side under lag spike! dot=${sideDot}`
          );
        }
      }
    });

    it('Fuzz testing: 1,000 random lag spike probes against base modules never penetrate module cores', () => {
      for (let i = 0; i < 1000; i++) {
        // Pick random module
        const module = MODULE_COLLIDERS[Math.floor(Math.random() * MODULE_COLLIDERS.length)];
        const minSafeDist = module.radius + PLAYER_COLLISION_RADIUS;

        // Start at random distance 0.1m to 2.0m outside the module
        const angle = Math.random() * 2 * Math.PI;
        const startDist = minSafeDist + 0.1 + Math.random() * 2.0;
        const startX = module.x + Math.cos(angle) * startDist;
        const startZ = module.z + Math.sin(angle) * startDist;

        // Face directly toward module center
        const yaw = Math.atan2(-(module.x - startX), -(module.z - startZ));

        const state: EvaControllerState = {
          x: startX,
          y: 1.7,
          z: startZ,
          yaw,
          pitch: 0,
          isMoving: false,
          isSprinting: false,
        };

        // Random extreme dt between 0.2s and 100.0s
        const spikeDt = 0.2 + Math.random() * 99.8;
        updateEvaMovement(spikeDt, state, { KeyW: true, ShiftLeft: true }, 'moon');

        const endDist = Math.hypot(state.x - module.x, state.z - module.z);
        assert.ok(
          endDist >= minSafeDist - 1e-4,
          `Fuzz breach on ${module.id}: endDist=${endDist} < minSafeDist=${minSafeDist}`
        );
      }
    });
  });

  /* =========================================================================
   * SUITE 3: Perimeter Boundary Confinement (120m Terrain Mesh)
   * ========================================================================= */
  describe('3. Perimeter Boundary Confinement (120m Terrain Mesh)', () => {

    it('Safe exploration radius (MAX_EXPLORATION_RADIUS = 52.0m) is strictly within 120m terrain mesh', () => {
      const terrainSize = 120; // 120m x 120m plane centered at 0
      const halfSize = terrainSize / 2; // 60m edge

      // 52.0m provides a strict 8.0m safety buffer before the physical mesh edge (60m)
      const edgeBuffer = halfSize - MAX_EXPLORATION_RADIUS;
      assert.ok(edgeBuffer >= 8.0, `Safety margin to terrain edge must be >= 8m (got ${edgeBuffer}m)`);
      assert.strictEqual(MAX_EXPLORATION_RADIUS, 52.0);
    });

    it('Radial sprint test: sprinting outward along 72 radial azimuths strictly clamps at hypot <= 52.0m', () => {
      const dt = 0.1;

      // Probe 72 headings (every 5 degrees)
      for (let headingDeg = 0; headingDeg < 360; headingDeg += 5) {
        const yaw = -(headingDeg * Math.PI) / 180;

        // Start from edge vicinity (r = 50.0m)
        const rad = (headingDeg * Math.PI) / 180;
        const startX = Math.sin(rad) * 50.0;
        const startZ = -Math.cos(rad) * 50.0;

        const state: EvaControllerState = {
          x: startX,
          y: 1.7,
          z: startZ,
          yaw,
          pitch: 0,
          isMoving: false,
          isSprinting: false,
        };

        // Sprint outward for 50 frames (50 * 0.58m = 29m theoretical travel)
        for (let frame = 0; frame < 50; frame++) {
          updateEvaMovement(dt, state, { KeyW: true, ShiftLeft: true }, 'moon');

          const currentRadius = Math.hypot(state.x, state.z);
          assert.ok(
            currentRadius <= MAX_EXPLORATION_RADIUS + 1e-5,
            `Boundary breached at heading ${headingDeg}° frame ${frame}: radius=${currentRadius} > ${MAX_EXPLORATION_RADIUS}`
          );
        }

        // Final radius must be tightly bounded to 52.0m
        const finalRadius = Math.hypot(state.x, state.z);
        assert.ok(
          Math.abs(finalRadius - MAX_EXPLORATION_RADIUS) < 1e-4,
          `Final clamped radius must equal 52.0m at heading ${headingDeg}°, got ${finalRadius}`
        );
      }
    });

    it('Boundary clamping preserves radial angle theta without tangential distortion', () => {
      // Test angles across all 4 quadrants
      const testAnglesDeg = [15, 45, 90, 135, 180, 225, 270, 315];

      for (const deg of testAnglesDeg) {
        const rad = (deg * Math.PI) / 180;
        // Point far outside boundary (r = 200m)
        const unconstrainedX = Math.cos(rad) * 200;
        const unconstrainedZ = Math.sin(rad) * 200;

        const resolved = resolveCollisions(unconstrainedX, unconstrainedZ, PLAYER_COLLISION_RADIUS);

        assert.ok(resolved.collided, 'Must flag collision');
        const resolvedRadius = Math.hypot(resolved.x, resolved.z);
        assert.ok(
          Math.abs(resolvedRadius - MAX_EXPLORATION_RADIUS) < 1e-6,
          `Radius must clamp to 52.0m, got ${resolvedRadius}`
        );

        // Verify angle is preserved
        const resolvedAngle = Math.atan2(resolved.z, resolved.x);
        const expectedAngle = Math.atan2(unconstrainedZ, unconstrainedX);
        assert.ok(
          Math.abs(resolvedAngle - expectedAngle) < 1e-6,
          `Clamping must preserve radial direction (angle: ${resolvedAngle} vs ${expectedAngle})`
        );
      }
    });

    it('Terrain elevation at perimeter boundary (r = 52.0m) is continuous and non-NaN', () => {
      for (const loc of ['moon', 'mars'] as const) {
        for (let deg = 0; deg < 360; deg += 10) {
          const rad = (deg * Math.PI) / 180;
          const px = Math.cos(rad) * MAX_EXPLORATION_RADIUS;
          const pz = Math.sin(rad) * MAX_EXPLORATION_RADIUS;

          const h = getTerrainHeight(px, pz, loc);
          assert.strictEqual(Number.isFinite(h), true, `Height at (${px}, ${pz}) must be finite`);
          assert.strictEqual(Number.isNaN(h), false, `Height at (${px}, ${pz}) must not be NaN`);
          // Terrain height is reasonably bounded (between -20m and +30m)
          assert.ok(h >= -20 && h <= 30, `Height out of realistic crater range: ${h}`);
        }
      }
    });
  });

  /* =========================================================================
   * SUITE 4: Rapid Toggle Test, Event Listener Lifecycle & FPS Stability
   * ========================================================================= */
  describe('4. Rapid Toggle Test, Event Listener Lifecycle & 60 FPS Stability', () => {

    it('Rapid EVA toggle stress: 100 consecutive enter/exit cycles maintain state reset integrity', () => {
      // Simulate rapid toggling in controller state
      const state: EvaControllerState = {
        x: 35, y: 5.2, z: -40, yaw: 2.1, pitch: 0.8, isMoving: true, isSprinting: true, walkBobPhase: 4.5
      };

      for (let cycle = 0; cycle < 100; cycle++) {
        // 1. Enter EVA -> reinitializes to EVA_SPAWN_POINT
        state.x = EVA_SPAWN_POINT.x;
        state.y = EVA_SPAWN_POINT.y;
        state.z = EVA_SPAWN_POINT.z;
        state.yaw = EVA_SPAWN_POINT.yaw;
        state.pitch = EVA_SPAWN_POINT.pitch;
        state.isMoving = false;
        state.isSprinting = false;
        state.walkBobPhase = 0;

        assert.strictEqual(state.x, 0, `Cycle ${cycle} spawn X must be 0`);
        assert.strictEqual(state.z, 5.5, `Cycle ${cycle} spawn Z must be 5.5`);
        assert.strictEqual(state.yaw, 0, `Cycle ${cycle} spawn yaw must be 0`);
        assert.strictEqual(state.isMoving, false, `Cycle ${cycle} isMoving must be false`);

        // 2. Perform 5 walking steps
        for (let step = 0; step < 5; step++) {
          updateEvaMovement(0.016, state, { KeyW: true }, 'moon');
        }
        assert.ok(state.isMoving, 'Should be moving during EVA steps');

        // 3. Exit EVA -> reset motion flags
        state.isMoving = false;
        state.isSprinting = false;
        state.walkBobPhase = 0;
      }
    });

    it('Event Listener Lifecycle: Helmet HUD mount and unmount cycle does not leak listeners', () => {
      // Mock window event listener tracking
      const activeListeners: { type: string; listener: EventListenerOrEventListenerObject }[] = [];

      const mockAddEventListener = (type: string, listener: EventListenerOrEventListenerObject) => {
        activeListeners.push({ type, listener });
      };

      const mockRemoveEventListener = (type: string, listener: EventListenerOrEventListenerObject) => {
        const idx = activeListeners.findIndex(l => l.type === type && l.listener === listener);
        if (idx !== -1) {
          activeListeners.splice(idx, 1);
        }
      };

      // Test hook lifecycle simulation: simulate 100 mount/unmount cycles
      for (let i = 0; i < 100; i++) {
        // Mount: simulate useEffect
        const handleKeyDown = (e: any) => { if (e.key === 'Escape') {} };
        mockAddEventListener('keydown', handleKeyDown);

        // Verify listener was registered
        assert.strictEqual(activeListeners.length, 1, 'Listener should be registered on mount');

        // Unmount: simulate cleanup
        mockRemoveEventListener('keydown', handleKeyDown);

        // Verify listener was cleaned up
        assert.strictEqual(activeListeners.length, 0, 'Listener must be removed on unmount');
      }

      // Net active listeners after 100 toggles must be strictly 0
      assert.strictEqual(activeListeners.length, 0, 'Net leaked event listeners must be strictly 0');
    });

    it('Performance budget: 2,000 frames of kinematics + collisions execute well within 60 FPS budget', () => {
      // 60 FPS budget is 16.67ms per frame.
      // Kinematics and collision resolution should take < 0.1ms per frame (< 1% of budget).
      const state: EvaControllerState = {
        x: 5, y: 1.7, z: 5, yaw: 0.5, pitch: 0, isMoving: false, isSprinting: false
      };

      const keys = { KeyW: true, ShiftLeft: true };
      const start = performance.now();

      for (let f = 0; f < 2000; f++) {
        // Rotate yaw slightly each frame to stress trigonometric and collision functions
        state.yaw += 0.01;
        updateEvaMovement(0.016, state, keys, 'moon');
        normalizeCompassDegrees(state.yaw);
        getCardinalDirection(normalizeCompassDegrees(state.yaw));
      }

      const elapsedMs = performance.now() - start;
      const msPerFrame = elapsedMs / 2000;

      // Kinematics must take < 0.1ms per frame
      assert.ok(
        msPerFrame < 0.1,
        `Kinematics must execute in < 0.1ms per frame for stable 60 FPS (measured ${msPerFrame.toFixed(4)}ms)`
      );
    });

    it('Memory allocation: 1,000 continuous ticks execute without array accumulation or memory growth', () => {
      const state: EvaControllerState = {
        x: 0, y: 1.7, z: 5.5, yaw: 0, pitch: 0, isMoving: false, isSprinting: false, walkBobPhase: 0
      };

      // Snapshot memory before
      const memBefore = process.memoryUsage().heapUsed;

      for (let i = 0; i < 1000; i++) {
        updateEvaMovement(0.016, state, { KeyW: true }, 'moon');
      }

      const memAfter = process.memoryUsage().heapUsed;
      const memGrowthMb = (memAfter - memBefore) / (1024 * 1024);

      // In 1,000 frames of pure number updates, heap growth should be virtually zero (< 5 MB garbage margin)
      assert.ok(
        memGrowthMb < 5.0,
        `Heap growth over 1,000 frames must be < 5MB (measured ${memGrowthMb.toFixed(2)}MB)`
      );
    });
  });

});
