/**
  ⚠️ This file exists ONLY for ergonomics to ensure
  JS import autocompletion works.

  The actual flag states are ALWAYS determined at
  build-time and off-branches stripped from the output.

  This determination is done in `src/debug-macros.js`

  The file itself is stripped from production builds.
*/
export default {
  GTE_VERSION_3_13: true,
};
