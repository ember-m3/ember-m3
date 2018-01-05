import Ember from 'ember';
import { isEqual } from '@ember/utils';
import { assert } from '@ember/debug';
import { dasherize } from '@ember/string';
import { isNone } from '@ember/utils';
import SchemaManager from './schema-manager';
import { coerceId } from 'ember-data/-private';

class M3SchemaInterface {
  constructor(modelData) {
    this.modelData = modelData;
  }

  getAttr(name) {
    return this.modelData.getAttr(name);
  }
}

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
    this.__data = null;
    this.__nestedModelsData = null;

    this.schemaInterface = new M3SchemaInterface(this);
    this._schema = SchemaManager;
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

    if (data.id) {
      this.id = coerceId(data.id);
    }

    return changedKeys;
  }

  willCommit() {}

  hasChangedAttributes() {
    return false;
  }

  addToHasMany() {}

  removeFromHasMany() {}

  changedAttributes() {
    return {};
  }

  rollbackAttributes() {}

  didCommit(data) {
    let changedKeys;
    if (data) {
      changedKeys = this._mergeUpdates(data.attributes, commitDataAndNotify);
    }

    return changedKeys || [];
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
    this.destroy();
  }

  isAttrDirty() {
    return false;
  }

  removeFromInverseRelationships() {}

  clientDidCreate() {}

  // INTERNAL API

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

  destroy() {
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

        // we need to compute the new nested type, hopefully it is not too slow
        let newNestedDef = this._schema.computeNestedModel(key, newValue, this.modelName);
        let newType = newNestedDef && newNestedDef.type && dasherize(newNestedDef.type);
        let isSameType =
          newType === nested.modelName || (isNone(newType) && isNone(nested.modelName));

        let newId = newNestedDef && newNestedDef.id;
        let isSameId = newId === nested.id || (isNone(newId) && isNone(nested.id));

        if (newNestedDef && isSameType && isSameId) {
          nestedCallback(nested, newValue);
          continue;
        }

        // not an embedded object anymore or type changed, destroy the nested model data
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

  toString() {
    return `<${this.modelName}:${this.id}>`;
  }
}
