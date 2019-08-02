// This weakmap is used to keep track of all record types recognized by the m3 schema
// It will be keyed on a per store basis
let seenTypesPerStore = new WeakMap();
export default seenTypesPerStore;
