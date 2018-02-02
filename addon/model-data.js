import { isEqual } from '@ember/utils';
import { assign, merge } from '@ember/polyfills';
import { copy } from '@ember/object/internals';
import { assert } from '@ember/debug';
import { coerceId } from 'ember-data/-private';
import Ember from 'ember';
import { isEmbeddedObject } from './util';

const emberAssign = assign || merge;

function pushDataAndNotify(modelData, updates) {
  let changedKeys = modelData.pushData({ attributes: updates });

  modelData._notifyRecordProperties(changedKeys);
}

function commitDataAndNotify(modelData, updates) {
  let changedKeys = modelData.didCommit({ attributes: updates });

  modelData._notifyRecordProperties(changedKeys);
}

class NestedModelDataWrapper {
  constructor(nestedInternalModel) {
    this.internalModel = nestedInternalModel;
  }

  notifyPropertyChange(modelName, id, clientId, key) {
    // TODO enhance this assert
    assert('TODO', modelName === this.internalModel.modelName && id === this.internalModel.id);

    if (this.internalModel.hasRecord) {
      this.internalModel._record.notifyPropertyChange(key);
    }
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
    let changedKeys = this._mergeUpdates(data.attributes, pushDataAndNotify, calculateChange);

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
    // TODO Iterate over nested models as well
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
    this.__nestedModelsData = null;
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

    // TODO Rollback nested models
    // TODO How to do rollback of nested models inside an array as we don't track them

    return dirtyKeys;
  }

  didCommit(data) {
    if (data) {
      data = data.attributes;
    }

    let changedKeys;

    // TODO This only iterates over nested models if we have updates for them
    emberAssign(this._data, this._inFlightAttributes);
    if (data) {
      changedKeys = this._mergeUpdates(data, commitDataAndNotify);
    }

    this._inFlightAttributes = null;

    this._updateChangedAttributes();

    return changedKeys || [];
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

    // TODO Reject inflight for nested models as well
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

  destroy() {
    this.isDestroyed = true;
    this.storeWrapper.disconnectRecord(this.modelName, this.id, this.clientId);
  }

  removeFromInverseRelationships() {}

  clientDidCreate() {}

  getOrCreateNestedModelData(key, modelName, id, internalModel) {
    let nestedModelData = this._nestedModelDatas[key];
    if (!nestedModelData) {
      nestedModelData = this._nestedModelDatas[key] = this.createNestedModelData(
        modelName,
        id,
        internalModel
      );
    }
    return nestedModelData;
  }

  createNestedModelData(modelName, id, internalModel) {
    let storeWrapper = new NestedModelDataWrapper(internalModel);
    return new M3ModelData(modelName, id, null, storeWrapper, this.store);
  }

  destroyNestedModelData(key) {
    let nestedModelData = this._nestedModelDatas[key];
    if (nestedModelData) {
      // destroy
      delete this._nestedModelDatas[key];
    }
  }

  hasNestedModelData(key) {
    return !!this._nestedModelDatas[key];
  }

  get _attributes() {
    if (this.__attributes === null) {
      this.__attributes = Object.create(null);
    }
    return this.__attributes;
  }

  set _attributes(v) {
    this.__attributes = v;
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

  get _nestedModelDatas() {
    if (this.__nestedModelsData === null) {
      this.__nestedModelsData = Object.create(null);
    }
    return this.__nestedModelsData;
  }

  /**
   *
   * @param updates
   * @param nestedCallback a callback for updating the data of a nested model-data instance
   * @returns {Array}
   * @private
   */
  _mergeUpdates(updates, nestedCallback, calculateChanges = true) {
    let data = this._data;

    let changedKeys;
    if (calculateChanges) {
      changedKeys = [];
    }

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

      if (this.hasNestedModelData(key)) {
        let nested = this.getOrCreateNestedModelData(key);

        if (isEmbeddedObject(newValue)) {
          nestedCallback(nested, newValue);
          continue;
        }

        // not an embedded object, destroy the nested model data
        this.destroyNestedModelData(key);
      }

      if (calculateChanges) {
        changedKeys.push(key);
      }
      data[key] = newValue;
    }

    return changedKeys;
  }

  _notifyRecordProperties(changedKeys) {
    Ember.beginPropertyChanges();
    for (let i = 0; i < changedKeys.length; i++) {
      this.storeWrapper.notifyPropertyChange(
        this.modelName,
        this.id,
        this.clientId,
        changedKeys[i]
      );
    }
    Ember.endPropertyChanges();
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

  toString() {
    return `<${this.modelName}:${this.id}>`;
  }
}
