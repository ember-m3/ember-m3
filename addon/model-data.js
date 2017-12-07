import { isEqual } from '@ember/utils';
import { coerceId } from 'ember-data/-private';
import { setDiff } from './util';

export default class M3ModelData {
  constructor(modelName, id, clientId, storeWrapper, store) {
    this.store = store;
    this.modelName = modelName;
    this.clientId = clientId;
    this.id = id;
    this.storeWrapper = storeWrapper;
    this.isDestroyed = false;
    this.reset();
  }

  // PUBLIC API

  getResourceIdentifier() {
    return {
      id: this.id,
      type: this.modelName,
      clientId: this.clientId,
    };
  }

  pushData(data, calculateChange) {
    let changedKeys;

    if (calculateChange) {
      changedKeys = this._changedKeys(data.attributes);
    }

    this._data = data.attributes || {};

    if (data.id) {
      this.id = coerceId(data.id);
    }

    return changedKeys;
  }

  willCommit() {}

  hasChangedAttributes() {
    return false;
  }

  reset() {
    this._data = null;
  }

  addToHasMany() {}

  removeFromHasMany() {}

  changedAttributes() {
    return {};
  }

  rollbackAttributes() {}

  didCommit(data) {
    if (data) {
      data = data.attributes;
    }
    let changedKeys = this._changedKeys(data);

    this._data = data;

    return changedKeys;
  }

  getHasMany() {}

  setHasMany() {}

  commitWasRejected() {}

  getBelongsTo() {}

  setBelongsTo() {}

  setAttr(key, value) {
    this._data[key] = value;
  }

  getAttr(key) {
    return this._data[key];
  }

  hasAttr(key) {
    return key in this._data;
  }

  unloadRecord() {
    if (this.isDestroyed) {
      return;
    }
    this.reset();
    this.destroy();
  }

  destroy() {
    this.isDestroyed = true;
    this.storeWrapper.disconnectRecord(this.modelName, this.id, this.clientId);
  }

  isRecordInUse() {
    return this.storeWrapper.isRecordInUse(this.modelName, this.id, this.clientId);
  }

  isAttrDirty() {
    return false;
  }

  removeFromInverseRelationships() {}

  get _data() {
    if (this.__data === null) {
      this.__data = Object.create(null);
    }
    return this.__data;
  }

  set _data(v) {
    this.__data = v;
  }

  clientDidCreate() {}

  /*
    Ember Data has 3 buckets for storing the value of an attribute on an internalModel.

    `_data` holds all of the attributes that have been acknowledged by
    a backend via the adapter. When rollbackAttributes is called on a model all
    attributes will revert to the record's state in `_data`.

    `_attributes` holds any change the user has made to an attribute
    that has not been acknowledged by the adapter. Any values in
    `_attributes` are have priority over values in `_data`.

    `_inFlightAttributes`. When a record is being synced with the
    backend the values in `_attributes` are copied to
    `_inFlightAttributes`. This way if the backend acknowledges the
    save but does not return the new state Ember Data can copy the
    values from `_inFlightAttributes` to `_data`. Without having to
    worry about changes made to `_attributes` while the save was
    happenign.


    Changed keys builds a list of all of the values that may have been
    changed by the backend after a successful save.

    It does this by iterating over each key, value pair in the payload
    returned from the server after a save. If the `key` is found in
    `_attributes` then the user has a local changed to the attribute
    that has not been synced with the server and the key is not
    included in the list of changed keys.



    If the value, for a key differs from the value in what Ember Data
    believes to be the truth about the backend state (A merger of the
    `_data` and `_inFlightAttributes` objects where
    `_inFlightAttributes` has priority) then that means the backend
    has updated the value and the key is added to the list of changed
    keys.

    @method _changedKeys
    @private
  */
  _changedKeys(updates) {
    if (!updates) {
      return [];
    }
    return calculateChangedKeys(this._data, updates);
  }

  toString() {
    return `<${this.modelName}:${this.id}>`;
  }
}

/**
  Calculate the changed keys from prior and new `data`s.  This follows similar
  semantics to `InternalModel._changedKeys`.
  The key difference is that omitted attributes and new attributes are treated
  as changes, instead of ignored.
  There is another difference, which is that there's no notion of
  `_inflightAttributes` or `_attributes`, but this will likely need to change
  when m3 composes a write story.
*/
function calculateChangedKeys(oldValue, newValue) {
  let oldKeys = Object.keys(oldValue).sort();
  let newKeys = Object.keys(newValue).sort();
  // omitted keys are treated as changes
  let result = setDiff(oldKeys, newKeys);

  for (let i = 0; i < newKeys.length; ++i) {
    let key = newKeys[i];
    if (!isEqual(oldValue[key], newValue[key])) {
      result.push(key);
    }
  }

  return result;
}
