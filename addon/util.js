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

export function isEmbeddedObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Merges an updates hash into an existing data hash.
 *
 * The merge is done recursively for hash values, e.g. if updates contains
 * a property, whose value is a hash and if the corresponding property in
 * the data hash also has hash value, the function will call itself on the
 * data hash objects.
 *
 * If the a value is an array, it is overwritten and not recursively merged.
 *
 * If a property is available only `data` and not in the `updates`, then the
 * value in data is left intact.
 *
 * After the updates are merged, the function returns a hash of the changed
 * properties in the existing data hash. Each key in the resulting hash
 * indicates a property changed on the data. The corresponding value can be
 * either `true` or another hash, which describes changes to a nested
 * model, e.g.:
 * ```
 * {
 *    foo: true,
 *    bar: {
 *      baz: true,
 *    },
 * }
 * ```
 * Indicates changes to the following paths:
 * - `foo`
 * - `bar.baz`
 */
export function merge(data, updates) {
  let changedKeys = Object.create(null);
  if (!updates) {
    // no changes
    return changedKeys;
  }
  let updatedKeys = Object.keys(updates);
  for (let i = 0; i < updatedKeys.length; i++) {
    let key = updatedKeys[i];
    let newValue = updates[key];
    if (isEqual(data[key], newValue)) {
      // values are equal, nothing to do
      // note, updates to objects should always result in new object or there will be nothing to update
      continue;
    }
    // only recursively merge if both new and old values are objects
    if (isEmbeddedObject(newValue) && isEmbeddedObject(data[key])) {
      // it's an object, check for recursion
      // TODO Optimize the checks here
      let nestedChanges = merge(data[key], newValue);
      if (Object.keys(nestedChanges).length > 0) {
        changedKeys[key] = nestedChanges;
      }
      continue;
    }
    // the most straight forward case
    changedKeys[key] = true;
    data[key] = newValue;
  }
  return changedKeys;
}
