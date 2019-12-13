/* eslint-env node */
'use strict';

const resolve = require('resolve');

function debugMacros(features) {
  let plugins = [
    [
      require.resolve('babel-plugin-debug-macros'),
      {
        flags: [
          {
            source: 'ember-m3/feature-flags',
            flags: features,
          },
        ],
      },
      '@ember-data/canary-features-stripping',
    ],
  ];

  return plugins;
}

function enabledFeatures(isDevelopingAddon) {
  let features = {
    CUSTOM_MODEL_CLASS: false,
  };
  try {
    let emberDataPath = require.resolve('ember-data');
    let buildInfra = resolve.sync('@ember-data/private-build-infra/src/features', {
      cwd: emberDataPath,
    });
    let emberDataFeatures = require(buildInfra)(process.env.EMBER_ENV === 'production');
    if ('CUSTOM_MODEL_CLASS' in emberDataFeatures) {
      features.CUSTOM_MODEL_CLASS = emberDataFeatures.CUSTOM_MODEL_CLASS;
    }
  } catch (e) {
    features = { CUSTOM_MODEL_CLASS: isDevelopingAddon ? null : false };
  }

  return features;
}

module.exports = {
  name: 'ember-m3',

  included() {
    this._super.included.apply(this, arguments);

    let features = enabledFeatures(this.isDevelopingAddon());

    this.options = this.options || {};
    this.options.babel = this.options.babel || {};

    let plugins = this.options.babel.plugins || [];
    // this ensures that the same `@ember-data/canary-features` processing that the various
    // ember-data addons do is done in the dummy app
    this.options.babel.plugins = [...plugins, ...debugMacros(features)];

    this.options.babel.loose = true;
  },
};
