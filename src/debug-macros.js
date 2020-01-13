/* eslint-env node */
'use strict';
const requireEsm = require('esm')(module);
const semver = require('semver');
const buildProjectHelper = require('./utils/project-package-helper');

function gte(availableVersion, compatVersion) {
  return semver.gte(semver.minVersion(availableVersion), semver.minVersion(compatVersion));
}

function buildDebugMacros(flags) {
  let plugins = [
    [
      require.resolve('babel-plugin-debug-macros'),
      {
        flags: [
          {
            source: 'ember-m3/-infra/versions',
            flags: flags.versions,
          },
        ],
      },
      'ember-m3/ember-data-version-stripping',
    ],
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
  const projectHelper = buildProjectHelper(app.project);
  let isProd = process.env.EMBER_ENV === 'production';
  let dataPackage = projectHelper.getAddon('ember-data');
  let storePackage = projectHelper.getAddon('@ember-data/store');
  let version = dataPackage ? dataPackage.pkg.version : storePackage.pkg.version;

  let features;
  let packages;
  let versions = {
    GTE_VERSION_3_12: gte(version, '3.12.0-alpha.0'),
    GTE_VERSION_3_5_1: dataPackage ? gte(version, '3.5.1') : true,
    GTE_VERSION_3_13: gte(version, '3.13.0'),
    IS_RECORD_DATA: dataPackage ? gte(version, '3.5.0') : true,
  };
  try {
    features = app.project.require('@ember-data/private-build-infra/src/features')(isProd);
  } catch (e) {
    try {
      features = app.project.require('@ember-data/-build-infra/src/features');
    } catch (e) {
      features = requireEsm('../addon/-infra/potential-features.js').default;
    }
  }

  features = Object.assign({ CUSTOM_MODEL_CLASS: false }, features);

  let allowRuntimeEnable = !isProd && isDevelopingAddon;
  Object.keys(features).forEach(flag => {
    features[flag] = features[flag] || (allowRuntimeEnable ? null : false);
  });

  try {
    packages = app.project.require('@ember-data/private-build-infra/src/packages')(app);
  } catch (e) {
    let potentialPackages = requireEsm('../addon/-infra/potential-packages.js').default;
    packages = {};

    Object.keys(potentialPackages).map(flag => {
      let packageName = potentialPackages[flag];
      packages[flag] = projectHelper.hasAddon(packageName);
    });
  }

  _flags = { features, packages, versions };
  return _flags;
}

function debugMacros(app, isDevelopingAddon) {
  return buildDebugMacros(getFlags(app, isDevelopingAddon));
}

module.exports = {
  debugMacros,
  getFlags,
};
