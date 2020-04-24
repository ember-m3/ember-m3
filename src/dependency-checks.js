const debug = require('debug')('ember-m3');
const pkg = require('../package.json');
const semver = require('semver');

// build a list of all data deps this version of ember-m3 brings
const M3DataDeps = Object.keys(pkg.dependencies).filter(
  k => k.indexOf('ember-data') !== -1 || k === 'ember-inflector'
);

const REQUIRED_DATA_PACKAGES = ['@ember-data/model', '@ember-data/store', 'ember-inflector'];

// we do not include ember-inflector here because a user specifying ember-inflector
// does not opt them out of ember-m3 bringing EmberData.
// the highlander rule for ember-inflector will still be enforced though
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

/**
 * Helper for the function checkForPackage. Does the heavy lifting to
 * filter versions of a package into something more useful
 *
 * - ignores one copy matching ember-m3's copy: because we are determining
 *   whether to bring this at all
 * - ignores one copy matching ember-data's copy if ember-data is present:
 *   because treating it as a cohesive unit simplifies our checks later
 * - filters out duplicates: because we care if different versions are present,
 *   but we don't care if multiple of the same version are present
 *
 * @param {*} deps an array of all available PackageInfos for a given package name
 * @param {*} m3Version the version of this dependency ember-m3 brings
 * @param {*} dataInfo info about the available ember-data package if that package is present
 */
function extractVersionsFromDeps(deps, m3Version, dataInfo) {
  let hasFullEmberData = dataInfo && dataInfo.uniqueDeps.length === 1;
  let fullEmberDataVersion = hasFullEmberData ? dataInfo.uniqueDeps[0].pkg.version : null;

  let seenVersions = {};

  // we don't care about the copies of packages brought
  // by ourself (ember-m3) or by a full copy of ember-data
  // (which we've already asserted is singleton by this point
  //  if present)
  let hasSkippedM3Version = false;
  let hasSkippedDataVersion = false;

  let uniqueDeps = deps.filter(i => {
    let pkgVersion = i.pkg.version;
    let seen = !!seenVersions[pkgVersion];

    // filter out the m3Version from uniqueDeps
    if (m3Version && pkgVersion === m3Version) {
      if (!seen && !hasSkippedM3Version) {
        // skip this copy (treat as unseen)
        hasSkippedM3Version = true;
        return false;
      } else if (!seen && hasSkippedM3Version) {
        // only mark as seen if it doesn't match the fullEmberDataVersion
        // otherwise allow the fullEmberDataVersion check to filter if needed
        if (m3Version !== fullEmberDataVersion) {
          seenVersions[pkgVersion] = 1;
          return true;
        }
      } else {
        // increment how many times we have seen (sometimes useful)
        seenVersions[pkgVersion]++;
        return false;
      }
    }

    // filter out the EmberData version from uniqueDeps
    if (hasFullEmberData && pkgVersion === fullEmberDataVersion) {
      if (!seen && !hasSkippedDataVersion) {
        // skip this copy (treat as unseen)
        hasSkippedDataVersion = true;
        return false;
      } else if (!seen && hasSkippedDataVersion) {
        // treat this as the first copy seen
        seenVersions[pkgVersion] = 1;
        return true;
      } else {
        // increment how many times we have seen (sometimes useful)
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
 * Finds all versions of a package
 *
 * - ignores one copy matching ember-m3's copy
 * - ignores one copy matching ember-data's copy if ember-data is present
 * - filters out duplicates
 *
 * @param {*} checker instance of a (ProjectWide) VersionChecker
 * @param {*} pkgName the name of the package to look for
 * @param {*} m3Versions the versions of packages brought by ember-m3 itself
 * @param {*} dataInfo if the full ember-data package is present, info about it
 */
function checkForPackage(checker, pkgName, m3Versions, dataInfo) {
  let depInstances = checker.filterAddonsByName(pkgName);
  let m3Version = m3Versions[pkgName];

  // if ember-m3 brings all of ember-data, fall back
  // e.g. ember-m3 may not bring `@ember-data/adapter` but if
  // it brings `ember-data` then it does indirectly at
  // the same version
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

/**
 * Runs various assertions to ensure that consuming applications
 * don't have multiple or invalid versions of data dependencies.
 *
 * This enforces lockstep for ember-data & @ember-data/* packages
 * as well as the highlander rule for these packages + ember-inflector
 *
 * It also ensures that @ember-data/* packages are not used prior
 * to ember-m3's ability to use them {minVersionForUsingOwnPackages}
 *
 * @param {*} checker
 * @param {*} m3Versions
 * @param {*} dataInfo
 */
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

/**
 * retrieve the installed versions of M3 dependencies
 * (@ember-data/* | ember-inflector | ember-data)
 *
 * We do this because the entry in package.json may allow semver drift
 */
function getOwnVersions() {
  let versions = {};
  M3DataDeps.forEach(name => {
    versions[name] = require(`${name}/package.json`).version;
  });

  return versions;
}

/**
 * Throws errors if invalid ember-inflector, ember-data or ember-m3
 * configurations are detected.
 *
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
