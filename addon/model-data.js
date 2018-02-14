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

/**
 * Model Data Wrapper used by nested models.
 *
 * The wrapper does not implement the whole API, only the minimal set, which
 * is required by M3 ModelData.
 */
class NestedModelDataWrapper {
  constructor(nestedInternalModel) {
    this.internalModel = nestedInternalModel;
  }

  notifyPropertyChange(modelName, id, clientId, key) {
    assert(
      `Nested model datas can only notify of property changes their associated record. Blocked an attempt to notify ${modelName} with ID ${id} for ${key} property`,
      modelName === this.internalModel.modelName && id === this.internalModel.id
    );

    if (this.internalModel.hasRecord) {
      this.internalModel._record.notifyPropertyChange(key);
    }
  }
}

export default class M3ModelData {
  constructor(modelName, id, clientId, storeWrapper) {
    this.modelName = modelName;
    this.clientId = clientId;
    this.id = id;
    this.storeWrapper = storeWrapper;
    this.schemaInterface = new M3SchemaInterface(this);

    this.__data = null;
    this.__nestedModelsData = null;
    this.__projections = null;

    this._schema = SchemaManager;

    this.baseModelName = this._schema.computeBaseModelName(this.modelName);

    if (this.baseModelName) {
      // TODO we may not have ID yet?
      this._initBaseModelData(this.baseModelName, id);
    } else {
      this.baseModelData = null;
    }
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
    if (!calculateChange) {
      // check whether we have projections, which will require notifications
      calculateChange = this._projections && this._projections.length > 0;
    }
    let changedKeys = this._mergeUpdates(data.attributes, pushDataAndNotify, calculateChange);

    if (calculateChange) {
      this._notifyProjectionProperties(changedKeys);
    }

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
      this._notifyProjectionProperties(changedKeys);
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

  isAttrDirty() {
    return false;
  }

  unloadRecord() {
    this.destroy();
  }

  removeFromInverseRelationships() {}

  clientDidCreate() {}

  // INTERNAL API

  /**
   * Returns an associated nested model data for given property in the current one.
   *
   * Nested model datas created through this function are tracked in the parent, which
   * allows updates to nested models to be merged with existing data instead of completely
   * overwritten.
   *
   * @param {string} key - The name of the field, holding the nested model
   * @param {string} modelName - The model name of the nested model as computed by the schema
   * @param {string} id - The ID of the nested model as computed by the schema.
   * @param {EmbeddedInternalModel} internalModel - The internal model, backing the nested model.
   * @return {M3ModelData}
   * @private
   */
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

  /**
   * Creates new nested model data.
   *
   * @param {string} modelName - The model name of the nested model as computed by the schema
   * @param {string} id - The ID of the nested model as computed by the schema.
   * @param {EmbeddedInternalModel} internalModel - The internal model, backing the nested model.
   * @return {M3ModelData}
   * @private
   */
  createNestedModelData(modelName, id, internalModel) {
    let storeWrapper = new NestedModelDataWrapper(internalModel);
    return new M3ModelData(modelName, id, null, storeWrapper);
  }

  /**
   * Destroys nested model data for given key, when it is no longer needed.
   *
   * @param {string} key - The name of the field, holding the nested model.
   * @private
   */
  destroyNestedModelData(key) {
    let nestedModelData = this._nestedModelDatas[key];
    if (nestedModelData) {
      // destroy
      delete this._nestedModelDatas[key];
    }
  }

  /**
   * Returns whether a nested model data exist for given key or not.
   *
   * @param {string} key - The name of the field, which may hold a nested model.
   * @return {M3ModelData}
   * @private
   */
  hasNestedModelData(key) {
    return !!this._nestedModelDatas[key];
  }

  destroy() {
    this.storeWrapper.disconnectRecord(this.modelName, this.id, this.clientId);
  }

  get _data() {
    if (this.baseModelData !== null) {
      return this.baseModelData._data;
    }
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

  get _projections() {
    if (this.baseModelData !== null) {
      return this.baseModelData._projections;
    }
    return this.__projections;
  }

  _initBaseModelData(modelName, id) {
    this.baseModelData = this.storeWrapper.modelDataFor(modelName, id);
    this.baseModelData._registerProjection(this);
  }

  _registerProjection(modelData) {
    if (!this.__projections) {
      // we ensure projections contains the base as well
      // so we have complete list of all related model datas
      this.__projections = [this];
    }
    this.__projections.push(modelData);
  }

  /**
   *
   * @param updates
   * @param nestedCallback a callback for updating the data of a nested model-data instance.
   *                       Main reason to delegate this to a separate function is to be able
   *                       to distinguish between updates from `pushData` and `didCommit`.
   * @returns {Array}
   * @private
   */
  _mergeUpdates(updates, nestedCallback) {
    let data = this._data;

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

      if (this.hasNestedModelData(key)) {
        let nested = this.getOrCreateNestedModelData(key);

        // we need to compute the new nested type, hopefully it is not too slow
        let newNestedDef = this._schema.computeNestedModel(
          key,
          newValue,
          this.modelName,
          this.schemaInterface
        );
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

      changedKeys.push(key);
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

  _notifyProjectionProperties(changedKeys) {
    let projections = this._projections;
    if (projections) {
      for (let i = 0; i < projections.length; i++) {
        if (projections[i] !== this) {
          projections[i]._notifyRecordProperties(changedKeys);
        }
      }
    }
  }

  toString() {
    return `<${this.modelName}:${this.id}>`;
  }
}
