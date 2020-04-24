/* eslint-env node */
'use strict';
const Funnel = require('broccoli-funnel');
const getDebugMacros = require('./src/debug-macros').debugMacros;
const debug = require('debug')('ember-m3');
const checkDependencyVersions = require('./src/dependency-checks');

module.exports = {
  name: 'ember-m3',

  init() {
    this._hasInitializedDependencyChecks = false;
    return this._super.init.apply(this, arguments);
  },

  included() {
    this._super.included.apply(this, arguments);
    this.configureBabelOptions();
  },

  shouldIncludeChildAddon(addon) {
    if (!this._hasInitializedDependencyChecks) {
      // we can't initialize in init because we need to super first
      // but super calls shouldIncludeChildAddon which needs this
      // so we initialize from the first call to shouldIncludeChildAddon
      this._hasInitializedDependencyChecks = true;
      this._excludeChildDataAddons = checkDependencyVersions(this.project);
    }

    if (this._excludeChildDataAddons !== true) {
      debug(`\t✅  including dependency ${addon.name} because including all children`);
      return true;
    }
    if (addon.name.startsWith('@ember-data') || addon.name === 'ember-inflector') {
      debug(
        `\t⚠️  ember-m3 is excluding its own copy of ${addon.name} version ${addon.pkg.version} from the build`
      );
      return false;
    }
    debug(`\t✅  including dependency ${addon.name}`);
    return true;
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
