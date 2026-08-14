import assert from "node:assert/strict";
import {
  DEFAULT_ADVANCED_CONFIG,
  hasAdvancedPhaseVolumeControls,
  migrateSavedAdvancedConfig
} from "../src/advancedConfig.js";

assert.equal(DEFAULT_ADVANCED_CONFIG.cycles, 5);
assert.equal(DEFAULT_ADVANCED_CONFIG.personalizedBreathingVolume, null);
assert.equal(DEFAULT_ADVANCED_CONFIG.personalizedApneaVolume, null);
assert.equal(hasAdvancedPhaseVolumeControls({ slug: "fiore" }), true);
assert.equal(hasAdvancedPhaseVolumeControls({ slug: "Fiore" }), true);
assert.equal(hasAdvancedPhaseVolumeControls({ slug: "fiore-2" }), false);
assert.equal(hasAdvancedPhaseVolumeControls({ slug: "viviana-arndt" }), false);

const previousAutomatic = {
  breathsPerCycle: 30,
  inhaleSeconds: 2,
  exhaleSeconds: 2,
  recoverySeconds: 15,
  cycles: 3,
  breathStyle: "activation",
  audioVolume: 0.8,
  breathCueVolume: 1,
  bosqueVolume: 0.5,
  ambientSound: "bosque",
  septasyncTrack: "none",
  septasyncVolume: 0.5,
  reverbMix: 0.12,
  reverbMode: "soft"
};
assert.deepEqual(migrateSavedAdvancedConfig(previousAutomatic), {
  ...previousAutomatic,
  cycles: 5
});

const manualThreeCycles = {
  ...previousAutomatic,
  bosqueVolume: 0.65
};
assert.deepEqual(
  migrateSavedAdvancedConfig(manualThreeCycles),
  manualThreeCycles
);

assert.deepEqual(
  migrateSavedAdvancedConfig(DEFAULT_ADVANCED_CONFIG),
  DEFAULT_ADVANCED_CONFIG
);

console.log("Advanced automatic configuration tests passed.");
