/* eslint-env node */
'use strict';

function buildDebugMacros(flags) {
  let plugins = [
    [
      require.resolve('babel-plugin-debug-macros'),
      {
        flags: [
          {
            source: 'ember-m3/-infra/features',
            flags: flags.features,
          },
        ],
      },
      'ember-m3/ember-data-canary-features-stripping',
    ],
    [
      require.resolve('babel-plugin-debug-macros'),
      {
        flags: [
          {
            source: 'ember-m3/-infra/packages',
            flags: flags.packages,
          },
        ],
      },
      'ember-m3/package-stripping',
    ],
  ];

  return plugins;
}

let _flags;
function getFlags(app, isDevelopingAddon) {
  if (_flags) {
    return _flags;
  }
  let isProd = process.env.EMBER_ENV === 'production';

  let features;
  let packages;

  // >= 3.15.0.beta
  features = app.project.require('@ember-data/private-build-infra/src/features')(isProd);

  features = Object.assign({ CUSTOM_MODEL_CLASS: false }, features);

  let allowRuntimeEnable = !isProd && isDevelopingAddon;
  Object.keys(features).forEach((flag) => {
    features[flag] = features[flag] || (allowRuntimeEnable ? null : false);
  });

  // >= 3.16
  packages = app.project.require('@ember-data/private-build-infra/src/packages')(app);

  _flags = { features, packages };
  return _flags;
}

function debugMacros(app, isDevelopingAddon) {
  return buildDebugMacros(getFlags(app, isDevelopingAddon));
}

module.exports = {
  debugMacros,
};
