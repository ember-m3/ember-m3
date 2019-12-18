function _getAddonPackage(dep, packageName, seen, _visited) {
  _visited = _visited || new Set();
  if (seen.has(packageName)) {
    return seen.get(packageName);
  }

  if (_visited.has(dep)) {
    return false;
  }
  _visited.add(dep);

  let depName;
  if (typeof dep.name === 'function') {
    depName = dep.name();
  } else {
    depName = dep.name;
  }

  seen.set(depName, dep);

  // we are the package
  if (depName === packageName) {
    return dep;
  }

  // we don't have any immediate dependencies
  // but we can't set seen to false as elsewhere may discover still
  if (!dep.addonPackages) {
    return false;
  }

  // the addon package is an immediate dependency
  let maybePkg = dep.addonPackages[packageName];
  if (maybePkg) {
    seen.set(packageName, maybePkg);
    return maybePkg;
  }

  // check for sub-dependencies
  for (let i = 0; i < dep.addons.length; i++) {
    let pkg = _getAddonPackage(dep.addons[i], packageName, seen, _visited);
    if (pkg) {
      return pkg;
    }
  }

  // we didn't find it as a dependency or sub-dependency,
  // but we can't set seen to false as elsewhere may discover still
  return false;
}

function getAddon(project, packageName, seen) {
  let pkg = _getAddonPackage(project, packageName, seen);
  if (!pkg) {
    // not found at all, cache the not-found
    seen.set(packageName, false);
  }
  return pkg;
}

module.exports = function buildHelper(project) {
  let seen = new Map();
  return {
    getAddon(packageName) {
      return getAddon(project, packageName, seen);
    },
    hasAddon(packageName) {
      return !!getAddon(project, packageName, seen);
    },
  };
};
