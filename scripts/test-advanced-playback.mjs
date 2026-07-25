import assert from "node:assert/strict";
import {
  ADVANCED_PLAYBACK_PROFILES,
  buildAdvancedPlayback,
  getAdvancedVoiceTargetVolume
} from "../lib/advanced-playback.js";

const legacy = buildAdvancedPlayback({
  features: { advancedReprogrammingEnabled: true }
});
assert.equal(legacy.profile, ADVANCED_PLAYBACK_PROFILES.APNEA_ONLY);
assert.equal(legacy.continuousVoiceEnabled, false);
assert.equal(
  getAdvancedVoiceTargetVolume({
    playback: legacy,
    phase: "breathing",
    configuredVolume: 0.8
  }),
  0
);
assert.equal(
  getAdvancedVoiceTargetVolume({
    playback: legacy,
    phase: "apnea",
    configuredVolume: 0.8
  }),
  0.8
);

const experiment = buildAdvancedPlayback({
  features: { advancedPlaybackProfile: "continuous_voice_v1" }
});
assert.equal(
  experiment.profile,
  ADVANCED_PLAYBACK_PROFILES.CONTINUOUS_VOICE_V1
);
assert.equal(experiment.continuousVoiceEnabled, true);
assert.ok(
  Math.abs(
    getAdvancedVoiceTargetVolume({
      playback: experiment,
      phase: "breathing",
      configuredVolume: 0.8
    }) - 0.32
  ) < Number.EPSILON
);
assert.ok(
  Math.abs(
    getAdvancedVoiceTargetVolume({
      playback: experiment,
      phase: "recovery",
      configuredVolume: 0.8
    }) - 0.32
  ) < Number.EPSILON
);
assert.equal(
  getAdvancedVoiceTargetVolume({
    playback: experiment,
    phase: "apnea",
    configuredVolume: 0.8
  }),
  0.8
);

const normalizedContract = buildAdvancedPlayback({
  advancedPlayback: {
    profile: "continuous_voice_v1",
    breathingVolumeMultiplier: 0.99
  }
});
assert.equal(normalizedContract.breathingVolumeMultiplier, 0.4);

console.log("advanced playback profile tests: ok");
