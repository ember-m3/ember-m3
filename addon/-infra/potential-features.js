/**
  ⚠️ This file is used by both the runtime and the build-time
  to determine what feature-flags are available.

  - For run-time determination see `./features.js`
  - For build-time determination see `src/debug-macros.js`

  This file and all `false` branch code is stripped from
  production builds.
*/
export default {
  CUSTOM_MODEL_CLASS: null,
};
