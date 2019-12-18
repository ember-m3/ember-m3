/**
  ⚠️ This file is used by both the runtime and the build-time
  to determine what packages are "queryable".

  - For run-time determination see `./packages.js`
  - For build-time determination see `src/debug-macros.js`

  This file and all `false` branch code is stripped from
  production builds.
*/
export default {
  HAS_EMBER_DATA_PACKAGE: 'ember-data',
  HAS_STORE_PACKAGE: '@ember-data/store',
  HAS_MODEL_PACKAGE: '@ember-data/model',
  HAS_RECORD_DATA_PACKAGE: '@ember-data/record-data',
  HAS_ADAPTER_PACKAGE: '@ember-data/adapter',
  HAS_SERIALIZER_PACKAGE: '@ember-data/serializer',
  HAS_DEBUG_PACKAGE: '@ember-data/debug',
};
