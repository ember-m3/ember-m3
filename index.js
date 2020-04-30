/* eslint-env node */
'use strict';
const Funnel = require('broccoli-funnel');
const getDebugMacros = require('./src/debug-macros').debugMacros;

const VersionChecker = require('ember-cli-version-checker');

function assertValidEmberData(addon) {
  let checker = VersionChecker.forProject(addon.project);
  let emberDataFound = false;
  let emberDataVersionsFound = [];
  let emberDataModelFound = false;
  let emberDataModelVersionsFound = [];
  let emberDataStoreFound = false;
  let emberDataStoreVersionsFound = [];
  let emberInflectorFound = false;
  let emberInflectorVersionsFound = [];

  for (let { name, pkg } of checker.allAddons()) {
    switch (name) {
      case 'ember-data':
        emberDataFound = true;
        emberDataVersionsFound.push(pkg.version);
        break;
      case '@ember-data/model':
        emberDataModelFound = true;
        emberDataModelVersionsFound.push(pkg.version);
        break;
      case '@ember-data/store':
        emberDataStoreFound = true;
        emberDataStoreVersionsFound.push(pkg.version);
        break;
      case 'ember-inflector':
        emberInflectorFound = true;
        emberInflectorVersionsFound.push(pkg.version);
        break;
    }
  }

  // Here we only check that the addons installed are conceivably valid
  // ember-data's packages should make themselves highlanders and throw if duplicates are found
  //
  // TODO: consider extracting this to ember-cli-version-checker
  if (!emberDataFound) {
    if (![emberDataModelFound, emberDataStoreFound, emberInflectorFound].every(Boolean)) {
      let versionsFound = [];
      if (emberDataFound) {
        versionsFound.push(`\n  - ember-data: ${emberDataVersionsFound.join(', ')}`);
      }

      if (emberDataModelFound) {
        versionsFound.push(`\n  - @ember-data/model: ${emberDataModelVersionsFound.join(', ')}`);
      }

      if (emberDataStoreFound) {
        versionsFound.push(`\n  - @ember-data/store: ${emberDataStoreVersionsFound.join(', ')}`);
      }

      if (emberInflectorFound) {
        versionsFound.push(`\n  - ember-inflector: ${emberInflectorVersionsFound.join(', ')}`);
      }

      throw new Error(
        `\nember-m3 requires either:\n\n  - ember-data: >= 3.12.0\n\nor all of:\n\n  - @ember-data/model: >= 3.12.0\n  - @ember-data/store: >= 3.12.0\n  - ember-inflector: >= 3.0.0\n\nversions found:\n${versionsFound.join(
          ''
        )}\n`
      );
    }
  }
}

module.exports = {
  name: 'ember-m3',

  included() {
    this._super.included.call(this, ...arguments);

    assertValidEmberData(this);

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

  configureBabelOptions() {
    let app = this._findHost();

    this.options = this.options || {};
    this.options.babel = this.options.babel || {};
    let plugins = this.options.babel.plugins;
    let newPlugins = getDebugMacros(app, this.isDevelopingAddon());
    this.options.babel.plugins = Array.isArray(plugins) ? plugins.concat(newPlugins) : newPlugins;

    this.options.babel.loose = true;
  },
};
