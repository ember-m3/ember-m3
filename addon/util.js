import Ember from 'ember';

const { setOwner, isEqual } = Ember;

export function setDiff(a, b) {
  let result = [];
  for (let i=0, j=0; i < a.length; ++i) {
    for (; j<b.length && b[j] < a[i]; ++j);

    if (j < b.length && a[i] === b[j]) {
      continue;
    } else {
      result.push(a[i]);
    }
  }
  return result;
}

export const OWNER_KEY = (function() {
  let f = Object.create(null);
  let u = {};
  setOwner(f, u);
  for (let ownerSymbol in f) {
    return ownerSymbol;
  }
})();

function isObject(value) {
  return typeof value === 'object' && value.constructor !== Date;
}

export function merge(data, updates) {
  let changedKeys = [];
  let updatedKeys = Object.keys(updates);
  for (let i = 0; i < updatedKeys.length; i++) {
    let key = updatedKeys[i];
    let newValue = updates[key];
    if (isEqual(data[key], newValue)) {
      // values are equal, nothing to do
      // note, updates to objects should always result in new object or there will be nothing to update
      continue;
    }
    if (data[key] == null || newValue == null) {
      // reseting a value to null or assigning a value for first time can be handled for all cases
      data[key] = newValue;
      changedKeys.push(key);
      continue;
    }
    if (Array.isArray(newValue)) {
      data[key] = newValue;
      changedKeys.push(key);
      continue;
    }
    if (isObject(newValue)) {
      // it's an object, check for recursion
      // TODO Optimize the checks here
      let nestedChanges = merge(data[key], newValue);
      if (nestedChanges.length) {
        changedKeys.push([key].concat(nestedChanges));
      }
      continue;
    }
    // the most straight forward case
    changedKeys.push(key);
    data[key] = newValue;
  }
  return changedKeys;
}
