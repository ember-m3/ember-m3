import Ember from 'ember';

const { setOwner } = Ember;

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
