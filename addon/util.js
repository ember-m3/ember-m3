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

export function isObject(value) {
  return value !== null && typeof value === 'object' && value.constructor !== Date;
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
 * After the updates are merged, the function returns the list of changed
 * properties in the existing data hash.
 *
 * The changed properties in a nested hash are represented as
 * an array, whose first element is the name of the property, holding the
 * the nested hash value and the rest of the elements are the changed
 * properties in the nested hash.
 *
 * For example:
 * ```javascript
 * let data = {
 *   foo: 1,
 *   bar: {
 *     baz: 1,
 *   },
 * };
 * let updates = {
 *   foo: 2,
 *   bar: {
 *     baz: 2,
 *   },
 * };
 * ```
 * The list of changed properties will be:
 *
 *    `['foo', ['bar', 'baz']]`
 *
 * This structure is recursive, e.g. if `baz` is a hash with changed properties,
 * it will be represented as an array as well:
 *
 *   `['foo', ['bar', ['baz', 'bazChangedProperty']]]`
 *
 * If a hash is replaced with a non-hash value, then the whole property is
 * considered changed and no changes for the nested properties are sent.
 */
export function merge(data, updates) {
  let changedKeys = [];
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
    // only recursively merge if both new and old values are objects
    if (isObject(newValue) && isObject(data[key])) {
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
