/* eslint-env node */
'use strict';

const EmberAddon = require('ember-cli/lib/broccoli/ember-addon');
const Funnel = require('broccoli-funnel');
const getDebugMacros = require('./src/debug-macros').debugMacros;

function hasDataPackage() {
  try {
    // eslint-disable-next-line node/no-missing-require, node/no-extraneous-require
    require.resolve('ember-data');
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = function (defaults) {
  // this ensures that the same `@ember-data/canary-features` processing that the various
  // ember-data addons do is done in the dummy app

  let babelOptions = {
    plugins: [],
  };
  let testsTree = 'tests';
  if (!hasDataPackage()) {
    testsTree = new Funnel('tests', {
      exclude: [/^dummy/, /^interop/],
    });
  }
  let app = new EmberAddon(defaults, {
    // Add options here
    emberData: {
      enableRecordDataRFCBuild: true,
    },
    babel: babelOptions,
    'ember-cli-babel': {
      includePolyfill: true,
    },
    trees: {
      tests: testsTree,
    },
  });
  babelOptions.plugins.push(...getDebugMacros(app));

  /*
    This build file specifies the options for the dummy test app of this
    addon, located in `/tests/dummy`
    This build file does *not* influence how the addon or the app using it
    behave. You most likely want to be modifying `./index.js` or app's build file
  */

  return app.toTree();
};
