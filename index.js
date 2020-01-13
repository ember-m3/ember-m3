/* eslint-env node */
'use strict';
const Funnel = require('broccoli-funnel');
const getDebugMacros = require('./src/debug-macros').debugMacros;
const semver = require('semver');
const pkg = require('./package.json');

/*
 shouldIncludeChildAddon runs during
 addon init so does not have access to
 the host application instance.
*/
let requiredDataPackages = ['@ember-data/model', '@ember-data/store', 'ember-inflector'];
let allDataPackages = [
  '@ember-data/adapter',
  '@ember-data/debug',
  '@ember-data/model',
  '@ember-data/record-data',
  '@ember-data/serializer',
  '@ember-data/store',
];
let minVersionForUsingOwnPackages = '3.14.0';

function hasDataPackage(addon) {
  let addons = addon.project.addonPackages;
  return addons['ember-data'] !== undefined;
}
function hasOwnDataPackages(addon) {
  let addons = addon.project.addonPackages;

  for (let i = 0; i < allDataPackages.length; i++) {
    if (addons[allDataPackages[i]] !== undefined) {
      return true;
    }
  }
  return false;
}
function assertOwnDataPackagesValid(addon) {
  let addons = addon.project.addonPackages;

  for (let i = 0; i < requiredDataPackages.length; i++) {
    let requiredPackageName = requiredDataPackages[i];
    if (addons[requiredPackageName] === undefined) {
      throw new Error(
        `ember-m3 ${pkg.version} requires the peerDependency ${requiredPackageName} to be installed.`
      );
    }
  }

  let storeVersion = addons['@ember-data/store'].pkg.version;

  if (semver.lt(storeVersion, minVersionForUsingOwnPackages)) {
    throw new Error(
      `To use your own @ember-data/<pkg> versions with ember-m3 their versions must be at least ${minVersionForUsingOwnPackages}. Found @ember-data/store with version ${storeVersion}.`
    );
  }

  for (let i = 0; i < allDataPackages.length; i++) {
    let addonName = allDataPackages[i];
    let addon = addons[addonName];

    if (addon && addonName !== 'ember-inflector') {
      let pkgVersion = addons[addonName].pkg.version;
      if (pkgVersion !== storeVersion) {
        throw new Error(
          `All @ember-data/<pkg> packages must have matching versions. Found ${addonName} ${pkgVersion} which does not match @ember-data/store's version of ${storeVersion}.`
        );
      }
    }
  }
}

module.exports = {
  name: 'ember-m3',

  init() {
    let ret = this._super.init.call(this, ...arguments);

    if (!hasDataPackage(this) && hasOwnDataPackages(this)) {
      assertOwnDataPackagesValid(this);
    }

    return ret;
  },

  included() {
    this._super.included.call(this, ...arguments);
    this.configureBabelOptions();
  },

  shouldIncludeChildAddon(addon) {
    if (!hasDataPackage(this) && !hasOwnDataPackages(this)) {
      return true;
    }
    if (addon.name.startsWith('@ember-data') || addon.name === 'ember-inflector') {
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
