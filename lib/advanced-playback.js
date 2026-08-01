export const ADVANCED_PLAYBACK_PROFILES = Object.freeze({
  APNEA_ONLY: "apnea_only",
  CONTINUOUS_VOICE_V1: "continuous_voice_v1"
});

const CONTINUOUS_VOICE_SETTINGS = Object.freeze({
  breathingVolumeMultiplier: 0.4,
  recoveryVolumeMultiplier: 0.4,
  apneaVolumeMultiplier: 1,
  transitionSeconds: 0.8
});

const clampVolume = (value) => Math.min(1, Math.max(0, Number(value) || 0));

export const getAdvancedPlaybackProfile = (student = {}) => {
  const requestedProfile = String(
    student?.advancedPlayback?.profile ||
      student?.features?.advancedPlaybackProfile ||
      ""
  ).trim();

  if (requestedProfile === ADVANCED_PLAYBACK_PROFILES.APNEA_ONLY) {
    return ADVANCED_PLAYBACK_PROFILES.APNEA_ONLY;
  }

  if (
    requestedProfile === ADVANCED_PLAYBACK_PROFILES.CONTINUOUS_VOICE_V1 ||
    student?.advancedPlayback?.continuousVoiceEnabled === true ||
    student?.features?.advancedContinuousVoiceEnabled === true
  ) {
    return ADVANCED_PLAYBACK_PROFILES.CONTINUOUS_VOICE_V1;
  }

  return ADVANCED_PLAYBACK_PROFILES.CONTINUOUS_VOICE_V1;
};

export const buildAdvancedPlayback = (student = {}) => {
  const profile = getAdvancedPlaybackProfile(student);
  const continuousVoiceEnabled =
    profile === ADVANCED_PLAYBACK_PROFILES.CONTINUOUS_VOICE_V1;

  return {
    profile,
    continuousVoiceEnabled,
    breathingVolumeMultiplier: continuousVoiceEnabled
      ? CONTINUOUS_VOICE_SETTINGS.breathingVolumeMultiplier
      : 0,
    recoveryVolumeMultiplier: continuousVoiceEnabled
      ? CONTINUOUS_VOICE_SETTINGS.recoveryVolumeMultiplier
      : 0,
    apneaVolumeMultiplier: CONTINUOUS_VOICE_SETTINGS.apneaVolumeMultiplier,
    transitionSeconds: continuousVoiceEnabled
      ? CONTINUOUS_VOICE_SETTINGS.transitionSeconds
      : 0
  };
};

export const getAdvancedVoiceTargetVolume = ({
  playback,
  phase,
  configuredVolume
}) => {
  const baseVolume = clampVolume(configuredVolume);
  if (phase === "apnea") {
    return clampVolume(baseVolume * Number(playback?.apneaVolumeMultiplier ?? 1));
  }
  if (!playback?.continuousVoiceEnabled) return 0;
  if (phase === "breathing") {
    return clampVolume(baseVolume * Number(playback?.breathingVolumeMultiplier ?? 0));
  }
  if (phase === "recovery") {
    return clampVolume(baseVolume * Number(playback?.recoveryVolumeMultiplier ?? 0));
  }
  return 0;
};
