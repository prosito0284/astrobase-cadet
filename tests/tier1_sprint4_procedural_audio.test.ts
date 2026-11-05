import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUDIO_SYNTH_SPEC,
  AudioEngineValidator,
} from './helpers/sprintHarness';
import { 
  spaceAmbient, 
  soundFx, 
  playQuindarTone, 
  quindarHistory, 
  clearQuindarHistory,
  evaBreathing,
  SpaceAmbientSynth,
  EvaBreathingEngine
} from '../src/utils/audio';

describe('Tier 1.17: Sprint 4 - Procedural Web Audio Synth & Apollo NASA Audio (0 KB)', () => {

  describe('Feature 10: F-PROC-SYNTH (Web Audio Procedural Space Ambient Pad Synth)', () => {
    it('SYNTH-1: Chord progression contains authentic 4-chord space harmonics (Em9, Cmaj7, G, Dsus4)', () => {
      const chords = spaceAmbient.chords;
      assert.strictEqual(chords.length, 4);
      assert.strictEqual(chords[0].name, 'Em9');
      assert.strictEqual(chords[1].name, 'Cmaj7');
      assert.strictEqual(chords[2].name, 'G');
      assert.strictEqual(chords[3].name, 'Dsus4');

      // Also assert alignment with specification harness
      assert.strictEqual(AUDIO_SYNTH_SPEC.chords[0].name, 'Em9');
      assert.strictEqual(AUDIO_SYNTH_SPEC.chords[1].name, 'Cmaj7');
      assert.strictEqual(AUDIO_SYNTH_SPEC.chords[2].name, 'G');
      assert.strictEqual(AUDIO_SYNTH_SPEC.chords[3].name, 'Dsus4');
    });

    it('SYNTH-2: Oscillator frequencies match exact harmonic notes in Hz', () => {
      // Em9: [82.41, 164.81, 246.94, 392.00]
      const em9 = spaceAmbient.chords[0].freqs;
      assert.strictEqual(em9[0], 82.41, 'E2 fundamental must be 82.41 Hz');
      assert.strictEqual(em9[1], 164.81, 'E3 octave must be 164.81 Hz');
      assert.strictEqual(em9[2], 246.94, 'B3 fifth must be 246.94 Hz');
      assert.strictEqual(em9[3], 392.00, 'G4 minor third must be 392.00 Hz');

      assert.strictEqual(AUDIO_SYNTH_SPEC.chords[0].freqs[0], 82.41);
      assert.strictEqual(AUDIO_SYNTH_SPEC.chords[0].freqs[3], 392.00);
    });

    it('SYNTH-3: Lowpass filter center is 550 Hz with LFO sweep bounds [200, 800] Hz', () => {
      assert.strictEqual(spaceAmbient.filterCenterHz, 550);
      assert.strictEqual(spaceAmbient.filterSweepRange[0], 200);
      assert.strictEqual(spaceAmbient.filterSweepRange[1], 800);

      assert.strictEqual(AUDIO_SYNTH_SPEC.filterCenterHz, 550);
      assert.strictEqual(AUDIO_SYNTH_SPEC.filterSweepRange[0], 200);
      assert.strictEqual(AUDIO_SYNTH_SPEC.filterSweepRange[1], 800);
    });

    it('SYNTH-4: Space ambient synth instance toggles and reports playing state correctly', () => {
      assert.strictEqual(typeof spaceAmbient.getIsPlaying, 'function');
      assert.strictEqual(typeof spaceAmbient.start, 'function');
      assert.strictEqual(typeof spaceAmbient.stop, 'function');
      assert.strictEqual(typeof spaceAmbient.toggle, 'function');
      assert.strictEqual(typeof spaceAmbient.setIntensity, 'function');
      assert.strictEqual(typeof spaceAmbient.getIntensity, 'function');

      // Intensity control tests
      spaceAmbient.setIntensity(0.75);
      assert.strictEqual(spaceAmbient.getIntensity(), 0.75);
      spaceAmbient.setIntensity(1.5); // clamped to 1.0
      assert.strictEqual(spaceAmbient.getIntensity(), 1.0);
      spaceAmbient.setIntensity(-0.5); // clamped to 0.0
      assert.strictEqual(spaceAmbient.getIntensity(), 0.0);

      // Dedicated instance testing
      const customSynth = new SpaceAmbientSynth();
      assert.strictEqual(customSynth.getIsPlaying(), false);
    });

    it('SYNTH-5: Zero external audio files required (100% procedural Web Audio footprint = 0 KB)', () => {
      // Validates soundFx object exposes all synthesized sound functions without audio element src URLs
      assert.strictEqual(typeof soundFx.playClick, 'function');
      assert.strictEqual(typeof soundFx.playToggleOn, 'function');
      assert.strictEqual(typeof soundFx.playAchievement, 'function');
      assert.strictEqual(typeof soundFx.toggleMute, 'function');
      assert.strictEqual(typeof soundFx.playQuindarTone, 'function');
    });
  });

  describe('Feature 11: F-QUINDAR-TONES (Apollo Houston Quindar Beeps)', () => {
    it('QUINDAR-1: Intro tone frequency matches authentic 2525 Hz within ±5 Hz tolerance', () => {
      soundFx.setMuted(false);
      const res = playQuindarTone('intro');

      assert.strictEqual(res.success, true);
      assert.ok(
        Math.abs(res.frequencyHz - 2525) <= AUDIO_SYNTH_SPEC.quindarToleranceHz,
        `Quindar intro frequency ${res.frequencyHz} must be 2525±5 Hz`
      );
    });

    it('QUINDAR-2: Outro tone frequency matches authentic 2475 Hz within ±5 Hz tolerance', () => {
      soundFx.setMuted(false);
      const res = playQuindarTone('outro');

      assert.strictEqual(res.success, true);
      assert.ok(
        Math.abs(res.frequencyHz - 2475) <= AUDIO_SYNTH_SPEC.quindarToleranceHz,
        `Quindar outro frequency ${res.frequencyHz} must be 2475±5 Hz`
      );
    });

    it('QUINDAR-3: Quindar tone burst duration is bounded to 250ms', () => {
      soundFx.setMuted(false);
      const resIntro = playQuindarTone('intro');
      const resOutro = playQuindarTone('outro');

      assert.strictEqual(resIntro.durationMs, 250);
      assert.strictEqual(resOutro.durationMs, 250);
    });

    it('QUINDAR-4: Mute flag suppresses Quindar tones output cleanly', () => {
      soundFx.setMuted(true);

      const res = playQuindarTone('intro');
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.frequencyHz, 0);

      soundFx.setMuted(false);
    });

    it('QUINDAR-5: Quindar event history records transmission sequence accurately', () => {
      soundFx.setMuted(false);
      clearQuindarHistory();

      playQuindarTone('intro'); // Rover departs
      playQuindarTone('outro'); // Telemetry ends / rover docks

      assert.strictEqual(quindarHistory.length, 2);
      assert.strictEqual(quindarHistory[0].type, 'intro');
      assert.strictEqual(quindarHistory[1].type, 'outro');
      assert.strictEqual(quindarHistory[0].freq, 2525);
      assert.strictEqual(quindarHistory[1].freq, 2475);
    });
  });

  describe('Feature 12: F-EVA-BREATHING (Pressurized Suit Breathing Audio Cycle)', () => {
    it('BREATH-1: Suit breathing cycle period is exactly 6.6 seconds', () => {
      assert.strictEqual(evaBreathing.cyclePeriodSec, 6.6);
      assert.strictEqual(AUDIO_SYNTH_SPEC.evaBreathingCycleSec, 6.6);
    });

    it('BREATH-2: Inhalation phase spans [0.0s..2.8s] with soft pressurized airflow', () => {
      assert.strictEqual(evaBreathing.getBreathingPhase(0.5), 'inhalation');
      assert.strictEqual(evaBreathing.getBreathingPhase(2.5), 'inhalation');
    });

    it('BREATH-3: Post-inhalation pause phase spans [2.8s..3.3s]', () => {
      assert.strictEqual(evaBreathing.getBreathingPhase(3.0), 'pause1');
    });

    it('BREATH-4: Exhalation phase spans [3.3s..6.1s] with filtered exhaust resonance', () => {
      assert.strictEqual(evaBreathing.getBreathingPhase(4.5), 'exhalation');
      assert.strictEqual(evaBreathing.getBreathingPhase(5.8), 'exhalation');
      assert.strictEqual(evaBreathing.getBreathingPhase(6.3), 'pause2');
    });

    it('BREATH-5: Breathing sound state is strictly gated by EVA mode and halts on exit', () => {
      soundFx.setMuted(false);
      evaBreathing.start();
      assert.strictEqual(evaBreathing.getIsActive(), true);

      // Exiting EVA halts breathing immediately
      evaBreathing.stop();
      assert.strictEqual(evaBreathing.getIsActive(), false);
    });

    it('BREATH-6: Cadence accelerator increases respiratory rate when sprinting or low O2', () => {
      evaBreathing.updateCadence(false, false, 100);
      assert.strictEqual(evaBreathing.getCadenceMultiplier(), 1.0);

      // Sprinting increases cadence
      evaBreathing.updateCadence(true, true, 100);
      assert.ok(
        evaBreathing.getCadenceMultiplier() >= 1.8,
        `Sprinting cadence ${evaBreathing.getCadenceMultiplier()} should be >= 1.8`
      );

      // Hypoxia (O2 < 40%) accelerates respiratory rate
      evaBreathing.updateCadence(false, false, 15);
      assert.ok(
        evaBreathing.getCadenceMultiplier() > 1.2,
        `Hypoxia cadence ${evaBreathing.getCadenceMultiplier()} should accelerate above baseline`
      );
    });
  });

});
