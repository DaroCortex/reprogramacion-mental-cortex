export const DEFAULT_ADVANCED_CONFIG = Object.freeze({
  breathsPerCycle: 30,
  inhaleSeconds: 2,
  exhaleSeconds: 2,
  recoverySeconds: 15,
  cycles: 5,
  breathStyle: "activation",
  audioVolume: 0.8,
  breathCueVolume: 1,
  bosqueVolume: 0.5,
  ambientSound: "bosque",
  septasyncTrack: "none",
  septasyncVolume: 0.5,
  reverbMix: 0.12,
  reverbMode: "soft"
});

const PREVIOUS_AUTOMATIC_ADVANCED_CONFIG = Object.freeze({
  ...DEFAULT_ADVANCED_CONFIG,
  cycles: 3
});

const matchesPreset = (configuration, preset) =>
  Object.entries(preset).every(([key, value]) => configuration?.[key] === value);

export const migrateSavedAdvancedConfig = (configuration) => {
  if (!configuration || typeof configuration !== "object") return configuration;
  if (!matchesPreset(configuration, PREVIOUS_AUTOMATIC_ADVANCED_CONFIG)) {
    return configuration;
  }
  return {
    ...configuration,
    cycles: DEFAULT_ADVANCED_CONFIG.cycles
  };
};
