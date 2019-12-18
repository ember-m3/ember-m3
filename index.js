/* eslint-env node */
'use strict';
const Funnel = require('broccoli-funnel');
const getDebugMacros = require('./src/debug-macros').debugMacros;

/*
 shouldIncludeChildAddon runs during
 addon init so does not have access to
 the host application instance.
*/
function hasDataPackage(addon) {
  let addons = addon.project.addonPackages;
  return addons['ember-data'] !== undefined;
}

module.exports = {
  name: 'ember-m3',

  included() {
    this._super.included.call(this, ...arguments);
    this.configureBabelOptions();
  },

  shouldIncludeChildAddon(addon) {
    if (!hasDataPackage(this)) {
      return true;
    }
    if (addon.name.startsWith('@ember-data')) {
      /*
      console.log(
        `⚠️  ember-m3 is excluding ${addon.name} version ${addon.pkg.version} from the build`
      );
      */
      return false;
    }
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
