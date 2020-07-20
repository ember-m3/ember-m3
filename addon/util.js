import { setOwner } from '@ember/application';

export const OWNER_KEY = (function () {
  let f = Object.create(null);
  let u = {};
  setOwner(f, u);
  for (let ownerSymbol in f) {
    return ownerSymbol;
  }
})();
