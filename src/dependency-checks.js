const debug = require('debug')('ember-m3');
const pkg = require('../package.json');
const semver = require('semver');
const M3DataDeps = Object.keys(pkg.dependencies).filter(
  k => k.indexOf('ember-data') !== -1 || k === 'ember-inflector'
);

const REQUIRED_DATA_PACKAGES = ['@ember-data/model', '@ember-data/store', 'ember-inflector'];
const ALL_DATA_PACKAGES = [
  '@ember-data/adapter',
  '@ember-data/debug',
  '@ember-data/model',
  '@ember-data/record-data',
  '@ember-data/serializer',
  '@ember-data/store',
];
const minVersionForUsingOwnPackages = '3.14.0';

class VersionChecker {
  constructor(project) {
    this._project = project;
  }

  *allAddons() {
    let cache = this._project.packageInfoCache.entries;
    let keys = Object.keys(cache);
    for (let key of keys) {
      let packageInfo = cache[key];

      if (
        packageInfo.pkg &&
        packageInfo.pkg.keywords &&
        packageInfo.pkg.keywords.includes('ember-addon')
      ) {
        yield {
          name: packageInfo.pkg.name,
          pkg: packageInfo.pkg,
          _info: packageInfo,
        };
      }
    }
  }

  filterAddonsByName(name) {
    const addons = [];

    for (let addon of this.allAddons()) {
      if (addon.name === name) {
        addons.push(addon);
      }
    }

    return addons;
  }
  static forProject(project) {
    return new VersionChecker(project);
  }
}

function extractVersionsFromDeps(deps, m3Version, dataInfo) {
  let hasFullEmberData = dataInfo && dataInfo.uniqueDeps.length === 1;
  let fullEmberDataVersion = hasFullEmberData ? dataInfo.uniqueDeps[0].pkg.version : null;

  let seenVersions = {};
  let hasSeenM3Version = false;
  let hasSeenDataVersion = false;
  let uniqueDeps = deps.filter(i => {
    let pkgVersion = i.pkg.version;
    let seen = !!seenVersions[pkgVersion];

    // filter out the m3Version from uniqueDeps
    if (m3Version && pkgVersion === m3Version) {
      if (!seen && !hasSeenM3Version) {
        hasSeenM3Version = true;
        return false;
      } else if (!seen && hasSeenM3Version) {
        if (m3Version !== fullEmberDataVersion) {
          seenVersions[pkgVersion] = 1;
          return true;
        }
      } else {
        seenVersions[pkgVersion]++;
        return false;
      }
    }

    // filter out the EmberData version from uniqueDeps
    if (hasFullEmberData && pkgVersion === fullEmberDataVersion) {
      if (!seen && !hasSeenDataVersion) {
        hasSeenDataVersion = true;
        return false;
      } else if (!seen && hasSeenDataVersion) {
        seenVersions[pkgVersion] = 1;
        return true;
      } else {
        seenVersions[pkgVersion]++;
        return false;
      }
    }

    if (!seen) {
      seenVersions[pkgVersion] = 1;
    } else {
      seenVersions[pkgVersion]++;
    }

    return !seen;
  });
  return { versions: seenVersions, uniqueDeps };
}

/**
 * Return
 * @param {*} checker
 * @param {*} pkgName
 */
function checkForPackage(checker, pkgName, m3Versions, dataInfo) {
  let depInstances = checker.filterAddonsByName(pkgName);
  let m3Version = m3Versions[pkgName];

  // if ember-m3 brings all of ember-data, fall back
  if (!m3Version & (pkgName.indexOf('@ember-data') !== -1)) {
    m3Version = m3Versions['ember-data'];
  }

  let infos = extractVersionsFromDeps(depInstances, m3Version, dataInfo);
  infos.name = pkgName;

  return infos;
}

function hasSingleVersionIfPresent(infos) {
  let { uniqueDeps, name: pkgName } = infos;

  if (uniqueDeps.length > 1) {
    throw new Error(
      `\nDetected the presence of more than one version of ${pkgName}:\n\t - ${uniqueDeps
        .map(i => `${i.pkg.version}`)
        .join('\n\t - ')}`
    );
  }

  let exists = uniqueDeps.length === 1;
  if (exists) {
    let version = uniqueDeps[0].pkg.version;
    if (pkgName !== 'ember-m3') {
      debug(`Detected ${pkgName} ${version}`);
    }
  }

  return exists;
}

function consumerHasOwnDataPackages(checker, m3Versions, dataInfo) {
  for (let i = 0; i < ALL_DATA_PACKAGES.length; i++) {
    let pkgName = ALL_DATA_PACKAGES[i];
    let pkgInfo = checkForPackage(checker, pkgName, m3Versions, dataInfo);
    let exists = pkgInfo.uniqueDeps.length > 0;

    if (exists) {
      return true;
    }
  }
  return false;
}

function assertConsumerDataPackagesValid(checker, m3Versions, dataInfo) {
  let hasFullEmberData = dataInfo.uniqueDeps.length === 1;
  let fullEmberDataVersion = hasFullEmberData ? dataInfo.uniqueDeps[0].pkg.version : null;
  let addons = {};

  for (let i = 0; i < REQUIRED_DATA_PACKAGES.length; i++) {
    let requiredPackageName = REQUIRED_DATA_PACKAGES[i];

    let pkgInfos = (addons[requiredPackageName] = checkForPackage(
      checker,
      requiredPackageName,
      m3Versions,
      dataInfo
    ));

    if (hasFullEmberData) {
      // we have a required package that doesn't match the ember-data version
      if (
        pkgInfos.uniqueDeps.length === 1 &&
        requiredPackageName !== 'ember-inflector' &&
        pkgInfos.uniqueDeps[0].pkg.version !== fullEmberDataVersion
      ) {
        throw new Error(
          `ember-m3 "${pkg.version}" requires the peerDependency ${requiredPackageName} to match the installed ember-data version "${fullEmberDataVersion}". Found ${requiredPackageName} "${pkgInfos.uniqueDeps[0].pkg.version}".`
        );
      }
      // we don't have a required package at all
    } else if (pkgInfos.uniqueDeps.length !== 1) {
      throw new Error(
        `ember-m3 "${pkg.version}" requires the peerDependency ${requiredPackageName} to be installed.`
      );
      // we have a required package, check min version
    } else {
      let pkgVersion = pkgInfos.uniqueDeps[0].pkg.version;
      if (
        semver.lt(pkgVersion, minVersionForUsingOwnPackages) &&
        requiredPackageName !== 'ember-inflector'
      ) {
        throw new Error(
          `To use your own @ember-data/<pkg> versions with ember-m3 their versions must be at least "${minVersionForUsingOwnPackages}". Found ${requiredPackageName} with version "${pkgVersion}".`
        );
      }
    }
  }

  let storeVersion = fullEmberDataVersion || addons['@ember-data/store'].uniqueDeps[0].pkg.version;

  for (let i = 0; i < ALL_DATA_PACKAGES.length; i++) {
    let addonName = ALL_DATA_PACKAGES[i];
    let pkgInfos = (addons[addonName] =
      addons[addonName] || checkForPackage(checker, addonName, m3Versions, dataInfo));
    hasSingleVersionIfPresent(pkgInfos);

    if (pkgInfos) {
      let addon = pkgInfos.uniqueDeps.length ? pkgInfos.uniqueDeps[0] : null;
      let pkgVersion = addon && addon.pkg.version;
      if (addon && pkgVersion !== storeVersion) {
        throw new Error(
          `All @ember-data/<pkg> packages must have matching versions. Found ${addonName} "${pkgVersion}" which does not match @ember-data/store's version of "${storeVersion}".`
        );
      }
    }
  }

  hasSingleVersionIfPresent(addons['ember-inflector']);
}

function getOwnVersions() {
  let versions = {};
  M3DataDeps.forEach(name => {
    versions[name] = require(`${name}/package.json`).version;
  });

  return versions;
}

/**
 * Throws errors if invalid ember-data or ember-m3 configurations are detected.
 * Returns a boolean `true` if the consuming app brings it's own versions of
 * ember-data or ember-data packages. `false` otherwise.
 */
module.exports = function checkDependencyVersions(project) {
  let checker = VersionChecker.forProject(project);
  let m3DepVersions = getOwnVersions();

  // check if all of ember-data is present
  let dataInfo = checkForPackage(checker, 'ember-data', m3DepVersions);
  let consumerBringsEmberData = hasSingleVersionIfPresent(dataInfo);
  let hasCustomData = consumerHasOwnDataPackages(checker, m3DepVersions, dataInfo);

  if (hasCustomData) {
    assertConsumerDataPackagesValid(checker, m3DepVersions, dataInfo);
  }

  let m3Info = checkForPackage(checker, 'ember-m3', m3DepVersions);
  hasSingleVersionIfPresent(m3Info);

  return consumerBringsEmberData || hasCustomData;
};
