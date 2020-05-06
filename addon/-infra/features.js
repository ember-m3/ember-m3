import require, { has } from 'require';

/**
  ⚠️ This file exists ONLY for DEV ergonomics to ensure
  JS import autocompletion works and flags can be toggled.

  In production, The actual flag states are ALWAYS determined
  at build-time and off-branches stripped from the output.

  This determination is done in `src/debug-macros.js`

  The file itself is stripped from production builds.
*/

function flagState(flagName) {
  let value;
  if (has('@ember-data/canary-features')) {
    value = require('@ember-data/canary-features')[flagName];
  }
  return value || false;
}

export const CUSTOM_MODEL_CLASS = flagState('CUSTOM_MODEL_CLASS');
