/* eslint-env node */
'use strict';

const Funnel = require('broccoli-funnel');
const getDebugMacros = require('./src/debug-macros').debugMacros;

const VersionChecker = require('ember-cli-version-checker');

const CHECKED_PROJECT = new WeakSet();

function assertValidEmberData(project) {
  if (CHECKED_PROJECT.has(project)) {
    return;
  }

  let checker = VersionChecker.forProject(project);

  // full ember-data brings store and model starting in 3.16
  // so we do not need to check for full ember-data, just the specific packages
  // we care about since our current support is 3.16+
  let check = checker.check({
    '@ember-data/store': '>= 3.16.0',
    '@ember-data/model': '>= 3.16.0',
    'ember-inflector': '>= 3.0.0',
  });

  check.assert(
    '[ember-m3] requires either "ember-data" be installed (which brings the below packages) or at least the following versions of them.'
  );

  CHECKED_PROJECT.add(project);
}

module.exports = {
  name: 'ember-m3',

  isDevelopingAddon() {
    return true;
  },

  included() {
    this._super.included.call(this, ...arguments);

    assertValidEmberData(this.project);

    this.configureBabelOptions();
  },

  treeForAddon(tree) {
    const isProd = process.env.EMBER_ENV === 'production';

    if (isProd) {
      tree = new Funnel(tree, {
        exclude: ['-infra', 'adapters'],
      });
    }

    return this._super.treeForAddon.call(this, tree);
  },

  treeForApp(tree) {
    const isProd = process.env.EMBER_ENV === 'production';

    if (isProd) {
      tree = new Funnel(tree, {
        exclude: ['data-adapter.js'],
      });
    }

    return this._super.treeForApp.call(this, tree);
  },

  configureBabelOptions() {
    let app = this._findHost();

    this.options = this.options || {};
    this.options.babel = this.options.babel || {};
    let plugins = this.options.babel.plugins ? this.options.babel.plugins.slice() : [];
    let newPlugins = getDebugMacros(app);

    for (let newPlugin of newPlugins) {
      let wasPreviouslyAdded = plugins.find(
        (existingPlugin) => Array.isArray(existingPlugin) && existingPlugin[2] === newPlugin[2]
      );
      if (!wasPreviouslyAdded) {
        plugins.push(newPlugin);
      }
    }
    this.options.babel.plugins = plugins;

    this.options.babel.loose = true;
  },
};
