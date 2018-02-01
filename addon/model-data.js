import { isEqual } from '@ember/utils';
import { assign, merge } from '@ember/polyfills';
import { copy } from '@ember/object/internals';
import { coerceId } from 'ember-data/-private';

const emberAssign = assign || merge;

class M3SchemaInterface {
  constructor(modelData) {
    this.modelData = modelData;
  }

  getAttr(name) {
    return this.modelData.getAttr(name);
  }
}

export default class M3ModelData {
  constructor(modelName, id, clientId, storeWrapper, store) {
    this.store = store;
    this.modelName = modelName;
    this.clientId = clientId;
    this.id = id;
    this.storeWrapper = storeWrapper;
    this.isDestroyed = false;
    this.reset();

    this.schemaInterface = new M3SchemaInterface(this);
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

    emberAssign(this._data, data.attributes);
    if (this.__attributes) {
      // only do if we have attribute changes
      this._updateChangedAttributes();
    }

    if (data.id) {
      this.id = coerceId(data.id);
    }

    return changedKeys;
  }

  willCommit() {
    this._inFlightAttributes = this._attributes;
    this._attributes = null;
  }

  hasChangedAttributes() {
    return this.__attributes !== null && Object.keys(this.__attributes).length > 0;
  }

  reset() {
    this._data = null;
    this._attributes = null;
    this.__inFlightAttributes = null;
  }

  addToHasMany() {}

  removeFromHasMany() {}

  /*
    Returns an object, whose keys are changed properties, and value is an
    [oldProp, newProp] array.

    @method changedAttributes
    @private
  */
  changedAttributes() {
    let oldData = this._data;
    let currentData = this._attributes;
    let inFlightData = this._inFlightAttributes;
    let newData = emberAssign(copy(inFlightData), currentData);
    let diffData = Object.create(null);
    let newDataKeys = Object.keys(newData);

    for (let i = 0, length = newDataKeys.length; i < length; i++) {
      let key = newDataKeys[i];
      diffData[key] = [oldData[key], newData[key]];
    }

    return diffData;
  }

  rollbackAttributes() {
    let dirtyKeys;
    if (this.hasChangedAttributes()) {
      dirtyKeys = Object.keys(this._attributes);
      this._attributes = null;
    }

    this._inFlightAttributes = null;

    return dirtyKeys;
  }

  didCommit(data) {
    if (data) {
      data = data.attributes;
    }
    let changedKeys = this._changedKeys(data);

    emberAssign(this._data, this._inFlightAttributes);
    if (data) {
      emberAssign(this._data, data);
    }

    this._inFlightAttributes = null;

    this._updateChangedAttributes();

    return changedKeys;
  }

  getHasMany() {}

  setHasMany() {}

  commitWasRejected() {
    let keys = Object.keys(this._inFlightAttributes);
    if (keys.length > 0) {
      let attrs = this._attributes;
      for (let i = 0; i < keys.length; i++) {
        if (attrs[keys[i]] === undefined) {
          attrs[keys[i]] = this._inFlightAttributes[keys[i]];
        }
      }
    }
    this._inFlightAttributes = null;
  }

  getBelongsTo() {}

  setBelongsTo() {}

  setAttr(key, value) {
    let originalValue;
    // Add the new value to the changed attributes hash
    this._attributes[key] = value;

    if (key in this._inFlightAttributes) {
      originalValue = this._inFlightAttributes[key];
    } else {
      originalValue = this._data[key];
    }
    // If we went back to our original value, we shouldn't keep the attribute around anymore
    if (value === originalValue) {
      delete this._attributes[key];
    }
  }

  getAttr(key) {
    if (key in this._attributes) {
      return this._attributes[key];
    } else if (key in this._inFlightAttributes) {
      return this._inFlightAttributes[key];
    } else {
      return this._data[key];
    }
  }

  hasAttr(key) {
    return key in this._attributes || key in this._inFlightAttributes || key in this._data;
  }

  unloadRecord() {
    if (this.isDestroyed) {
      return;
    }
    this.reset();
    this.destroy();
  }

  isRecordInUse() {
    return this.storeWrapper.isRecordInUse(this.modelName, this.id, this.clientId);
  }

  removeFromInverseRelationships() {}

  clientDidCreate() {}

  // INTERNAL API

  get _attributes() {
    if (this.__attributes === null) {
      this.__attributes = Object.create(null);
    }
    return this.__attributes;
  }

  set _attributes(v) {
    this.__attributes = v;
  }

  destroy() {
    this.isDestroyed = true;
    this.storeWrapper.disconnectRecord(this.modelName, this.id, this.clientId);
  }

  get _data() {
    if (this.__data === null) {
      this.__data = Object.create(null);
    }
    return this.__data;
  }

  set _data(v) {
    this.__data = v;
  }

  get _inFlightAttributes() {
    if (this.__inFlightAttributes === null) {
      this.__inFlightAttributes = Object.create(null);
    }
    return this.__inFlightAttributes;
  }

  set _inFlightAttributes(v) {
    this.__inFlightAttributes = v;
  }

  /*
    Checks if the attributes which are considered as changed are still
    different to the state which is acknowledged by the server.

    This method is needed when data for the internal model is pushed and the
    pushed data might acknowledge dirty attributes as confirmed.

    @method updateChangedAttributes
    @private
   */
  _updateChangedAttributes() {
    let changedAttributes = this.changedAttributes();
    let changedAttributeNames = Object.keys(changedAttributes);
    let attrs = this._attributes;

    for (let i = 0, length = changedAttributeNames.length; i < length; i++) {
      let attribute = changedAttributeNames[i];
      let data = changedAttributes[attribute];
      let oldData = data[0];
      let newData = data[1];

      if (oldData === newData) {
        delete attrs[attribute];
      }
    }
  }

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
  /*
      TODO IGOR DAVID
      There seems to be a potential bug here, where we will return keys that are not
      in the schema
  */
  _changedKeys(updates) {
    let changedKeys = [];

    if (updates) {
      let original, i, value, key;
      let keys = Object.keys(updates);
      let length = keys.length;
      let hasAttrs = this.hasChangedAttributes();
      let attrs;
      if (hasAttrs) {
        attrs = this._attributes;
      }

      original = emberAssign(Object.create(null), this._data);
      original = emberAssign(original, this._inFlightAttributes);

      for (i = 0; i < length; i++) {
        key = keys[i];
        value = updates[key];

        // A value in _attributes means the user has a local change to
        // this attributes. We never override this value when merging
        // updates from the backend so we should not sent a change
        // notification if the server value differs from the original.
        if (hasAttrs === true && attrs[key] !== undefined) {
          continue;
        }

        if (!isEqual(original[key], value)) {
          changedKeys.push(key);
        }
      }
    }

    return changedKeys;
  }

  toString() {
    return `<${this.modelName}:${this.id}>`;
  }
}
