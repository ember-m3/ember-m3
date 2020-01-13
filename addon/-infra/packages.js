import { has } from 'require';
import PotentialPackages from './potential-packages';

/**
  ⚠️ This file exists ONLY for DEV ergonomics to ensure
  JS import autocompletion works and flags can be toggled.

  In production, The actual flag states are ALWAYS determined
  at build-time and off-branches stripped from the output.

  This determination is done in `src/debug-macros.js`

  The file itself is stripped from production builds.
*/

function flagState(name) {
  let packageName = PotentialPackages[name];
  return has(packageName) || false;
}

export const HAS_EMBER_DATA_PACKAGE = flagState('HAS_EMBER_DATA_PACKAGE');
export const HAS_STORE_PACKAGE = flagState('HAS_STORE_PACKAGE');
export const HAS_MODEL_PACKAGE = flagState('HAS_MODEL_PACKAGE');
export const HAS_ADAPTER_PACKAGE = flagState('HAS_ADAPTER_PACKAGE');
export const HAS_SERIALIZER_PACKAGE = flagState('HAS_SERIALIZER_PACKAGE');
export const HAS_DEBUG_PACKAGE = flagState('HAS_DEBUG_PACKAGE');
export const HAS_RECORD_DATA_PACKAGE = flagState('HAS_RECORD_DATA_PACKAGE');
