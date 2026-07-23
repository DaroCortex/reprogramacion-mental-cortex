import assert from "node:assert/strict";
import {
  DEFAULT_ADVANCED_CONFIG,
  migrateSavedAdvancedConfig
} from "../src/advancedConfig.js";

assert.equal(DEFAULT_ADVANCED_CONFIG.cycles, 5);

const previousAutomatic = {
  ...DEFAULT_ADVANCED_CONFIG,
  cycles: 3
};
assert.equal(migrateSavedAdvancedConfig(previousAutomatic).cycles, 5);

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
