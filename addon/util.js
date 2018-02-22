import { setOwner } from '@ember/application';

export function setDiff(a, b) {
  let result = [];
  for (let i = 0, j = 0; i < a.length; ++i) {
    for (; j < b.length && b[j] < a[i]; ++j);

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
