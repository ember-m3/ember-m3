/* eslint-env node */
'use strict';

const { version, isCanary: _isCanary } = require('../package.json');

const isCanary = _isCanary || version.includes('alpha');

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

const M3_FEATURES = {
  PROXY_MODEL_CLASS: null,
};

function getM3Features(isProd) {
  let features = Object.assign({}, M3_FEATURES);

  if (!isCanary) {
    // disable all features with a current value of `null`
    for (let feature in features) {
      let featureValue = features[feature];

      if (featureValue === null) {
        features[feature] = false;
      }
    }
    return features;
  }

  const FEATURE_OVERRIDES = process.env.EMBER_M3_FEATURE_OVERRIDE;
  if (FEATURE_OVERRIDES === 'ENABLE_ALL_OPTIONAL') {
    // enable all features with a current value of `null`
    for (let feature in features) {
      let featureValue = features[feature];

      if (featureValue === null) {
        features[feature] = true;
      }
    }
  } else if (FEATURE_OVERRIDES === 'DISABLE_ALL') {
    // disable all features, including those with a value of `true`
    for (let feature in features) {
      features[feature] = false;
    }
  } else if (FEATURE_OVERRIDES) {
    // enable only the specific features listed in the environment
    // variable (comma separated)
    const forcedFeatures = FEATURE_OVERRIDES.split(',');
    for (let i = 0; i < forcedFeatures.length; i++) {
      let featureName = forcedFeatures[i];

      features[featureName] = true;
    }
  }

  if (isProd) {
    // disable all features with a current value of `null`
    for (let feature in features) {
      let featureValue = features[feature];

      if (featureValue === null) {
        features[feature] = false;
      }
    }
  }

  return features;
}

let _flags;
function getFlags(app) {
  if (_flags) {
    return _flags;
  }
  let isProd = process.env.EMBER_ENV === 'production';

  // >= 3.15.0.beta
  let dataFeatures = app.project.require('@ember-data/private-build-infra/src/features')(isProd);
  let m3Features = getM3Features(isProd);

  let features = Object.assign(m3Features, dataFeatures);

  // >= 3.16
  let packages = app.project.require('@ember-data/private-build-infra/src/packages')(app);

  _flags = { features, packages };
  return _flags;
}

function debugMacros(app) {
  return buildDebugMacros(getFlags(app));
}

module.exports = {
  debugMacros,
};
