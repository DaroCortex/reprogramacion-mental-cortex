import assert from "node:assert/strict";
import {
  ADVANCED_PLAYBACK_PROFILES,
  buildAdvancedPlayback,
  getAdvancedVoiceTargetVolume
} from "../lib/advanced-playback.js";

const defaultPlayback = buildAdvancedPlayback({
  features: { advancedReprogrammingEnabled: true }
});
assert.equal(
  defaultPlayback.profile,
  ADVANCED_PLAYBACK_PROFILES.CONTINUOUS_VOICE_V1
);
assert.equal(defaultPlayback.continuousVoiceEnabled, true);
assert.ok(
  Math.abs(
    getAdvancedVoiceTargetVolume({
      playback: defaultPlayback,
      phase: "breathing",
      configuredVolume: 0.8
    }) - 0.32
  ) < Number.EPSILON
);
assert.equal(
  getAdvancedVoiceTargetVolume({
    playback: defaultPlayback,
    phase: "apnea",
    configuredVolume: 0.8
  }),
  0.96
);
assert.equal(
  getAdvancedVoiceTargetVolume({
    playback: defaultPlayback,
    phase: "apnea",
    configuredVolume: 1
  }),
  1
);

const apneaOnly = buildAdvancedPlayback({
  features: { advancedPlaybackProfile: "apnea_only" }
});
assert.equal(apneaOnly.profile, ADVANCED_PLAYBACK_PROFILES.APNEA_ONLY);
assert.equal(apneaOnly.continuousVoiceEnabled, false);
assert.equal(
  getAdvancedVoiceTargetVolume({
    playback: apneaOnly,
    phase: "breathing",
    configuredVolume: 0.8
  }),
  0
);
assert.equal(
  getAdvancedVoiceTargetVolume({
    playback: apneaOnly,
    phase: "breathing",
    configuredVolume: 0.8,
    breathingVolume: 0.55
  }),
  0.55
);
assert.equal(
  getAdvancedVoiceTargetVolume({
    playback: defaultPlayback,
    phase: "breathing",
    configuredVolume: 0.8,
    breathingVolume: 0
  }),
  0
);
assert.equal(
  getAdvancedVoiceTargetVolume({
    playback: defaultPlayback,
    phase: "recovery",
    configuredVolume: 0.8,
    breathingVolume: 0.55
  }),
  0.55
);
assert.equal(
  getAdvancedVoiceTargetVolume({
    playback: defaultPlayback,
    phase: "apnea",
    configuredVolume: 0.8,
    apneaVolume: 0.25
  }),
  0.25
);
assert.equal(
  getAdvancedVoiceTargetVolume({
    playback: defaultPlayback,
    phase: "apnea",
    configuredVolume: 0.8,
    apneaVolume: 0
  }),
  0
);
assert.equal(
  getAdvancedVoiceTargetVolume({
    playback: defaultPlayback,
    phase: "apnea",
    configuredVolume: 0.8,
    apneaVolume: 4
  }),
  1
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
  0.96
);

const normalizedContract = buildAdvancedPlayback({
  advancedPlayback: {
    profile: "continuous_voice_v1",
    breathingVolumeMultiplier: 0.99
  }
});
assert.equal(normalizedContract.breathingVolumeMultiplier, 0.4);

console.log("advanced playback profile tests: ok");
