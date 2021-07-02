import require, { has } from 'require';

/**
  ⚠️ This file exists ONLY for DEV ergonomics to ensure
  JS import autocompletion works and flags can be toggled.

  In production, The actual flag states are ALWAYS determined
  at build-time and off-branches stripped from the output.

  This determination is done in `src/debug-macros.js`

  The file itself is stripped from production builds.
*/

function dataFlagState(flagName) {
  let value;
  if (has('@ember-data/canary-features')) {
    value = require('@ember-data/canary-features')[flagName];
  }
  return value || false;
}

function m3FlagState(flagName) {
  if (window && window.M3ENV && window.M3ENV.FEATURES) {
    return window.M3ENV.FEATURES[flagName];
  }
}

export const CUSTOM_MODEL_CLASS = dataFlagState('CUSTOM_MODEL_CLASS');
export const PROXY_MODEL_CLASS = m3FlagState('PROXY_MODEL_CLASS');
