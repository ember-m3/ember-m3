import { isEqual, isNone } from '@ember/utils';
import { dasherize } from '@ember/string';
import { assign, merge } from '@ember/polyfills';
import { copy } from './utils/copy';
import { assert } from '@ember/debug';
import Ember from 'ember';
import { recordDataToRecordMap, recordDataToQueryCache } from './utils/caches';
import { CUSTOM_MODEL_CLASS } from 'ember-m3/-infra/features';

const emberAssign = assign || merge;

function pushDataAndNotify(recordData, updates) {
  recordData.pushData({ attributes: updates }, true, true);
}

function commitDataAndNotify(recordData, updates) {
  recordData.didCommit({ attributes: updates }, true);
}

function notifyProperties(storeWrapper, modelName, id, clientId, changedKeys) {
  Ember.beginPropertyChanges();
  for (let i = 0; i < changedKeys.length; i++) {
    storeWrapper.notifyPropertyChange(modelName, id, clientId, changedKeys[i]);
  }
  Ember.endPropertyChanges();
}

/**
 * A public interface for getting and setting attribute of the underlying
 * recordData, and track dependent keys resolved by ref key.
 *
 * @class M3SchemaInterface
 */
class M3SchemaInterface {
  /**
   * @param {M3RecordData} recordData
   */
  constructor(recordData) {
    this.recordData = recordData;
    this._keyBeingResolved = null;
    this._refKeyDepkeyMap = {};
    this._suppressNotifications = false;
  }

  /**
   * @param {string} key
   * @private
   */
  _beginDependentKeyResolution(key) {
    assert(
      'Do not invoke `SchemaInterface` method `_beginDependentKeyResolution` without ending the resolution of previous key.',
      this._keyBeingResolved === null
    );
    this._keyBeingResolved = key;
  }

  /**
   * @param {string} key
   * @private
   */
  _endDependentKeyResolution(key) {
    assert(
      'Do not invoke `SchemaInterface` method `_endDependentKeyResolution` without begining the resolution of the key.',
      key && this._keyBeingResolved === key
    );
    this._keyBeingResolved = null;
  }

  _getDependentResolvedKeys(refKey) {
    return this._refKeyDepkeyMap[refKey];
  }

  /**
   * Get the attribute name from the model.
   * This can be useful if your payload keys are different from your attribute names;
   * e.g. if your api adds a prefix to attributes that should be interpreted as references.
   *
   * @param {string} name name of the attribute
   * @returns {Object} value of the attribute
   */
  getAttr(name) {
    let value = this.recordData.getAttr(name);
    const keyBeingResolved = this._keyBeingResolved;
    assert(
      'Do not manually call methods on `schemaInterface` outside of schema resolution hooks such as `computeAttributeReference`',
      keyBeingResolved
    );

    if (keyBeingResolved !== name) {
      // it might be nice to avoid doing this if we know that we don't need to
      // support depkeys from the server changing between requests
      this._refKeyDepkeyMap[name] = this._refKeyDepkeyMap[name] || [];
      let refKeyMap = this._refKeyDepkeyMap[name];
      if (refKeyMap.indexOf(keyBeingResolved) < 0) {
        refKeyMap.push(this._keyBeingResolved);
      }
    }

    return value;
  }

  /**
   * Set attribute for the recordData
   *
   * @param {string} key
   * @param {Object} value
   */
  setAttr(key, value) {
    this.recordData.setAttr(key, value, this._suppressNotifications);
  }

  /**
   * Delete attribute for the record data
   *
   * @param {string} attrName name of the attribute to delete
   */
  deleteAttr(attrName) {
    this.recordData._deleteAttr(attrName);
  }
}

export default class M3RecordData {
  /**
   * @param {string} modelName
   * @param {string} id
   * @param {number} [clientId]
   * @param {Store} storeWrapper
   * @param {SchemaManager} schemaManager
   * @param {M3RecordData} [parentRecordData]
   * @param {M3RecordData} [baseRecordData]
   */
  constructor(
    modelName,
    id,
    clientId,
    storeWrapper,
    schemaManager,
    parentRecordData,
    baseRecordData,
    globalM3CacheRD
  ) {
    this.modelName = modelName;
    this.clientId = clientId;
    this.id = id;
    this.storeWrapper = storeWrapper;
    if (CUSTOM_MODEL_CLASS) {
      this.globalM3CacheRD = globalM3CacheRD;
      if (!baseRecordData && !parentRecordData && id) {
        this.globalM3CacheRD[this.id] = this;
      }
      this._isNew = false;
      this._isDeleted = false;
      this._isLoaded = false;
      this._isDeletionCommited = false;
    } else {
      this._embeddedInternalModel = null;
    }
    this.isDestroyed = false;
    this._data = null;
    this._attributes = null;
    this.__inFlightAttributes = null;
    // Properties related to child recordDatas
    this._parentRecordData = parentRecordData;
    this.__childRecordDatas = null;
    this._schema = schemaManager;
    this.schemaInterface = new M3SchemaInterface(this);

    // Properties related to projections
    this._baseRecordData = baseRecordData;
    this._projections = null;
    this._initBaseRecordData();
  }

  get _recordArrays() {
    if (!this.__recordArrays) {
      this.__recordArrays = new Set();
    }
    return this.__recordArrays;
  }

  // PUBLIC API
  getResourceIdentifier() {
    return {
      id: this.id,
      type: this.modelName,
      clientId: this.clientId,
    };
  }

  /**
   * Notify this `RecordData` that it has new attributes from the server.
   *
   * @param {Object} jsonApiResource the payload resource to use for updating
   * the server attributes
   * @param {boolean} calculateChange Whether or not changes that result from
   * this resource being pushed should be calculated.
   * @param {boolean} [notifyRecord=false]
   * @params {boolean} [suppressProjectionNotifications=false]
   * @returns {Array<string>} The list of changed keys if `calculateChange
   * === true` and `[]` otherwise.
   */
  pushData(
    jsonApiResource,
    calculateChange,
    notifyRecord = false,
    suppressProjectionNotifications = false
  ) {
    if (CUSTOM_MODEL_CLASS) {
      this._isLoaded = true;
    }
    if (this._baseRecordData) {
      this._baseRecordData.pushData(
        jsonApiResource,
        calculateChange,
        notifyRecord,
        suppressProjectionNotifications
      );
      // we don't need to return any changed keys, because properties will be invalidated
      // as part of notifying all projections
      return [];
    }
    let changedKeys;
    if (jsonApiResource.attributes) {
      changedKeys = this._mergeUpdates(
        jsonApiResource.attributes,
        pushDataAndNotify,
        // if we need to notify the record, we must calculate the changes
        calculateChange || notifyRecord || !!this._projections
      );
      changedKeys = this._filterChangedKeys(changedKeys);
    }

    if (this.__attributes !== null) {
      // only do if we have attribute changes
      this._updateChangedAttributes();
    }

    if (jsonApiResource.id) {
      // TODO Which cases do we need to initialize the id here?
      this.id = jsonApiResource.id + '';
    }

    if (CUSTOM_MODEL_CLASS) {
      if (!this._baseRecordData && !this._parentRecordData && this.id) {
        this.globalM3CacheRD[this.id] = this;
      }
    }

    // by default, always notify projections when we receive data.  We might
    // not have been asked to calculate changes if the base record data has
    // no record, but we might still have records instantiated for our
    // projections.
    //
    // Notifications are explicitly suppressed when we're using `pushData`
    // synthetically while resolving nested record data
    if (!suppressProjectionNotifications && this._notifyProjectionProperties(changedKeys)) {
      return [];
    }

    if (notifyRecord) {
      this._notifyRecordProperties(changedKeys);
    }

    return changedKeys || [];
  }

  willCommit() {
    if (this._baseRecordData) {
      return this._baseRecordData.willCommit();
    }
    this._inFlightAttributes = this._attributes;
    this._attributes = null;

    if (this.__childRecordDatas) {
      let nestedKeys = Object.keys(this._childRecordDatas);
      for (let i = 0; i < nestedKeys.length; ++i) {
        let childKey = nestedKeys[i];
        let childRecordData = this._childRecordDatas[childKey];
        if (!Array.isArray(childRecordData)) {
          childRecordData.willCommit();
        } else {
          childRecordData.forEach(child => child.willCommit());
        }
      }
    }
  }

  hasChangedAttributes() {
    if (this._baseRecordData) {
      return this._baseRecordData.hasChangedAttributes();
    } else {
      let isDirty = this.__attributes !== null && Object.keys(this.__attributes).length > 0;
      if (isDirty) {
        return true;
      }
      let recordDatas = Object.keys(this._childRecordDatas).map(key => this._childRecordDatas[key]);
      recordDatas.forEach(child => {
        if (!Array.isArray(child)) {
          if (child.hasChangedAttributes()) {
            isDirty = true;
          }
        } else {
          isDirty = isDirty || child.some(rd => rd.hasChangedAttributes());
        }
      });
      return isDirty;
    }
  }

  addToHasMany() {}

  removeFromHasMany() {}

  _initRecordCreateOptions(options) {
    return options !== undefined ? options : {};
  }

  didCommit(jsonApiResource, notifyRecord = false) {
    if (CUSTOM_MODEL_CLASS) {
      this._isNew = false;
      if (this._isDeleted) {
        this._isDeletionCommited = true;
        this.removeFromRecordArrays();
      }
    }
    if (jsonApiResource && jsonApiResource.id) {
      this.id = '' + jsonApiResource.id;
    }
    if (CUSTOM_MODEL_CLASS) {
      if (!this._baseRecordData && !this._parentRecordData && this.id) {
        this.globalM3CacheRD[this.id] = this;
      }
    }
    if (!this._parentRecordData) {
      // only set the record ID if it is a top-level recordData
      this.storeWrapper.setRecordId(this.modelName, this.id, this.clientId);
    }

    if (this._baseRecordData) {
      this._baseRecordData.didCommit(jsonApiResource, notifyRecord);
      // we don't need to return any changed keys, because properties will be invalidated
      // as part of notifying all projections
      return [];
    }

    // If the server returns a payload
    let attributes;
    if (jsonApiResource) {
      attributes = jsonApiResource.attributes;
    }
    // We need to sync nested models in case of partial updates from server and local.
    this._syncNestedModelUpdates(attributes);

    emberAssign(this._data, this._inFlightAttributes);
    this._inFlightAttributes = null;

    let changedKeys;
    changedKeys = this._mergeUpdates(attributes, commitDataAndNotify, true);
    changedKeys = this._filterChangedKeys(changedKeys);
    // At this point, all of the nestedModels has been updated, so we can add their updates to the current model's data.
    this._mergeNestedModelData();

    this._updateChangedAttributes();

    if (this._notifyProjectionProperties(changedKeys)) {
      return [];
    }

    if (CUSTOM_MODEL_CLASS) {
      this._notifyRecordProperties(changedKeys);
    } else {
      if (notifyRecord) {
        this._notifyRecordProperties(changedKeys);
      }
    }

    return changedKeys || [];
  }

  getHasMany() {}

  setHasMany() {}

  commitWasRejected() {
    if (this._baseRecordData) {
      return this._baseRecordData.commitWasRejected();
    }
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

    if (this.__childRecordDatas) {
      let nestedKeys = Object.keys(this._childRecordDatas);
      for (let i = 0; i < nestedKeys.length; ++i) {
        let childKey = nestedKeys[i];
        let childRecordDatas = this._childRecordDatas[childKey];
        if (Array.isArray(childRecordDatas)) {
          for (let j = 0; j < childRecordDatas.length; ++j) {
            childRecordDatas[j].commitWasRejected();
          }
        } else {
          childRecordDatas.commitWasRejected();
        }
      }
    }
  }

  getBelongsTo() {}

  setBelongsTo() {}

  /**
   * @param {string} key
   * @param {Object} value
   * @param {boolean} _suppressNotifications
   * @private
   */
  setAttr(key, value, _suppressNotifications) {
    if (this._baseRecordData) {
      return this._baseRecordData.setAttr(key, value, _suppressNotifications);
    }

    let originalValue;

    if (key in this._inFlightAttributes) {
      originalValue = this._inFlightAttributes[key];
    } else {
      originalValue = this._data[key];
    }
    // If we went back to our original value, we shouldn't keep the attribute around anymore
    if (value === originalValue) {
      delete this._attributes[key];
    } else {
      // Add the new value to the changed attributes hash
      this._attributes[key] = value;
    }

    if (!_suppressNotifications && !this._notifyProjectionProperties([key])) {
      this._notifyRecordProperties([key]);
    }
  }

  isNew() {
    return this._isNew;
  }

  setIsDeleted(value) {
    this._isDeleted = value;
  }

  isDeleted() {
    return this._isDeleted;
  }

  isDeletionCommitted() {
    return this._isDeletionCommited;
  }

  /**
   * @param {string} key
   * @private
   */
  getAttr(key) {
    if (this._baseRecordData) {
      return this._baseRecordData.getAttr(key);
    } else if (key in this._attributes) {
      return this._attributes[key];
    } else if (key in this._inFlightAttributes) {
      return this._inFlightAttributes[key];
    } else {
      return this._data[key];
    }
  }

  /**
   * @param {string} key
   * @private
   */
  _deleteAttr(key) {
    if (this._baseRecordData) {
      return this._baseRecordData._deleteAttr(key);
    } else {
      delete this._attributes[key];
      delete this._data[key];
    }
  }

  /**
   * @param {string} key
   * @returns {boolean}
   */
  hasAttr(key) {
    if (this._baseRecordData) {
      return this._baseRecordData.hasAttr(key);
    } else {
      return key in this._attributes || key in this._inFlightAttributes || key in this._data;
    }
  }

  /**
   * @param {string} key
   * @returns {boolean}
   */
  hasLocalAttr(key) {
    if (this._baseRecordData) {
      return this._baseRecordData.hasLocalAttr(key);
    } else {
      return key in this._attributes;
    }
  }

  /**
   * @param {string} key
   * @returns {boolean}
   */
  getServerAttr(key) {
    if (this._baseRecordData) {
      return this._baseRecordData.getServerAttr(key);
    } else {
      return this._data[key];
    }
  }

  unloadRecord() {
    if (CUSTOM_MODEL_CLASS) {
      delete this.globalM3CacheRD[this.id];
    }
    if (this.isDestroyed) {
      return;
    }
    if (CUSTOM_MODEL_CLASS) {
      this.removeFromRecordArrays();
      let queryCache = recordDataToQueryCache.get(this);
      let record = recordDataToRecordMap.get(this);
      if (record) {
        queryCache.unloadRecord(record);
      }
    }
    if (this._baseRecordData || this._areAllProjectionsDestroyed()) {
      this._destroy();
    }
  }

  removeFromRecordArrays() {
    if (CUSTOM_MODEL_CLASS) {
      this._recordArrays.forEach(recordArray => {
        recordArray._removeRecordData(this);
      });
    }
  }
  /**
   * @returns {boolean}
   */
  isRecordInUse() {
    return this.storeWrapper.isRecordInUse(this.modelName, this.id, this.clientId);
  }

  removeFromInverseRelationships() {}

  clientDidCreate() {
    if (CUSTOM_MODEL_CLASS) {
      this._isLoaded = true;
      this._isNew = true;
    }
  }

  // INTERNAL API

  /**
   * Iterates through the attributes in-flight attrs and data of the model,
   * calling the passed function.
   *
   * @param {Function} callback
   * @param {*} binding
   */
  eachAttribute(callback, binding) {
    if (this._baseRecordData) {
      return this._baseRecordData.eachAttribute(callback, binding);
    }

    if (this.__attributes !== null) {
      Object.keys(this._attributes).forEach(callback, binding);
    }

    if (this.__inFlightAttributes !== null) {
      Object.keys(this._inFlightAttributes).forEach(callback, binding);
    }

    if (this.__data !== null) {
      this._schema
        .computeAttributes(Object.keys(this._data), this.modelName)
        .forEach(callback, binding);
    }
  }

  // Exposes attribute keys for the schema service to be able to iterate over the props
  // Expected by the ED and snapshot interfaces. Longer term TODO is to look into decoupling
  // things more so this is not required
  attributesDefinition() {
    let attrs = {};
    this.eachAttribute(attr => {
      attrs[attr] = { key: attr };
    });
    return attrs;
  }

  /**
   * Returns an object, whose keys are changed properties, and value is an
   * [oldProp, newProp] array.
   *
   * @method changedAttributes
   * @returns {Obejct}
   * @private
   */
  changedAttributes() {
    if (this._baseRecordData) {
      return this._baseRecordData.changedAttributes();
    }
    let serverState = this._data;
    let localChanges = this._attributes;
    let inFlightData = this._inFlightAttributes;
    // TODO: test that we copy here
    let newData = emberAssign(copy(inFlightData), localChanges);
    let _changedAttributes = Object.create(null);
    let newDataKeys = Object.keys(newData);

    for (let i = 0, length = newDataKeys.length; i < length; i++) {
      let key = newDataKeys[i];
      _changedAttributes[key] = [serverState[key], newData[key]];
    }

    if (this.__childRecordDatas) {
      let nestedKeys = Object.keys(this._childRecordDatas);
      for (let i = 0; i < nestedKeys.length; ++i) {
        let childKey = nestedKeys[i];
        let childRecordDatas = this._childRecordDatas[childKey];
        if (Array.isArray(childRecordDatas)) {
          let changes = null;
          for (let j = 0; j < childRecordDatas.length; ++j) {
            let individualChildRecordData = childRecordDatas[j];
            let childChangedAttributes = individualChildRecordData.changedAttributes();
            if (Object.keys(childChangedAttributes).length > 0) {
              if (changes == null) {
                changes = new Array(childRecordDatas.length);
              }
              changes[j] = childChangedAttributes;
            }
          }
          if (changes !== null) {
            _changedAttributes[childKey] = changes;
          }
        } else {
          let childChangedAttributes = childRecordDatas.changedAttributes();
          if (Object.keys(childChangedAttributes).length > 0) {
            if (
              this.getServerAttr(childKey) !== null &&
              this.getServerAttr(childKey) !== undefined
            ) {
              _changedAttributes[childKey] = childChangedAttributes;
            } else {
              _changedAttributes[childKey] = [this.getServerAttr(childKey), childChangedAttributes];
            }
          }
        }
      }
    }

    return _changedAttributes;
  }

  rollbackAttributes(notifyRecord = false) {
    if (this._baseRecordData) {
      return this._baseRecordData.rollbackAttributes(...arguments);
    }
    let dirtyKeys;
    if (this.hasChangedAttributes()) {
      dirtyKeys = Object.keys(this._attributes);
      this._attributes = null;
    }

    this._inFlightAttributes = null;

    if (this.__childRecordDatas) {
      let nestedKeys = Object.keys(this._childRecordDatas);
      for (let i = 0; i < nestedKeys.length; ++i) {
        let childKey = nestedKeys[i];
        let childRecordData = this._childRecordDatas[childKey];
        if (Array.isArray(childRecordData)) {
          for (let j = 0; j < childRecordData.length; ++j) {
            childRecordData[j].rollbackAttributes(true);
          }
        } else {
          childRecordData.rollbackAttributes(true);
        }
      }
    }

    if (!(dirtyKeys && dirtyKeys.length > 0)) {
      // nothing dirty on this record and we've already handled nested records
      return;
    }

    if (this._notifyProjectionProperties(dirtyKeys)) {
      // notifyProjectionProperties already invalidated all relevant records' properties
      return [];
    }

    if (notifyRecord) {
      this._notifyRecordProperties(dirtyKeys);
    }

    return dirtyKeys;
  }

  /**
   * @param {string} key
   * @returns {boolean}
   */
  isAttrDirty(key) {
    if (this._baseRecordData) {
      return this._baseRecordData.isAttrDirty(...arguments);
    }
    if (!(key in this._attributes)) {
      return false;
    }
    let originalValue;
    if (this._inFlightAttributes[key] !== undefined) {
      originalValue = this._inFlightAttributes[key];
    } else {
      originalValue = this._data[key];
    }

    return originalValue !== this._attributes[key];
  }

  /**
   * @readonly
   * @returns {Object}
   */
  get _childRecordDatas() {
    if (this.__childRecordDatas === null) {
      this.__childRecordDatas = Object.create(null);
    }
    return this.__childRecordDatas;
  }

  /**
   * @readonly
   * @returns {Object}
   */
  get _attributes() {
    if (this.__attributes === null) {
      this.__attributes = Object.create(null);
    }
    return this.__attributes;
  }

  set _attributes(v) {
    this.__attributes = v;
  }

  /**
   * @readonly
   * @returns {Object}
   */
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

  _initBaseRecordData() {
    if (!this._baseRecordData) {
      let baseModelName = this._schema.computeBaseModelName(this.modelName);
      if (!baseModelName) {
        return;
      }

      this._baseRecordData = this.storeWrapper.recordDataFor(dasherize(baseModelName), this.id);
    }

    if (this._baseRecordData) {
      this._baseRecordData._registerProjection(this);
    }
  }

  /**
   * @param {string} key
   * @param {string} idx
   * @param {string} modelName
   * @param {string} id
   * @param {_embeddedInternalModel} embeddedInternalModel
   * @returns {M3RecordData}
   */
  _getChildRecordData(key, idx, modelName, id, embeddedInternalModel) {
    let childRecordData;

    if (idx !== undefined && idx !== null) {
      let childRecordDatas = this._childRecordDatas[key];

      if (!childRecordDatas) {
        childRecordDatas = this._childRecordDatas[key] = [];
      }
      childRecordData = childRecordDatas[idx];
      if (!childRecordData) {
        childRecordData = childRecordDatas[idx] = this._createChildRecordData(
          key,
          idx,
          modelName,
          id
        );
      }
    } else {
      childRecordData = this._childRecordDatas[key];
      if (!childRecordData) {
        childRecordData = this._childRecordDatas[key] = this._createChildRecordData(
          key,
          null,
          modelName,
          id
        );
      }
    }
    if (!CUSTOM_MODEL_CLASS) {
      if (!childRecordData._embeddedInternalModel) {
        childRecordData._embeddedInternalModel = embeddedInternalModel;
      }
    }
    return childRecordData;
  }

  /**
   * @param {string} key
   * @param {string} idx
   * @param {string} modelName
   * @param {string} id
   * @returns {M3RecordData}
   */
  _createChildRecordData(key, idx, modelName, id) {
    let baseChildRecordData;

    if (this._baseRecordData) {
      // use the base model name if it is available, but otherwise just use the model name - it might be already
      // the base one
      let childBaseModelName = this._schema.computeBaseModelName(modelName) || modelName;
      baseChildRecordData = this._baseRecordData._getChildRecordData(
        key,
        idx,
        childBaseModelName,
        id,
        null
      );
    }

    return new M3RecordData(
      modelName,
      id,
      null,
      this.storeWrapper,
      this._schema,
      this,
      baseChildRecordData,
      this.globalM3CacheRD
    );
  }

  _debugJSON() {
    // if the model is a projection, delegate to the base record to get the JSON
    if (this._baseRecordData) {
      return this._baseRecordData._debugJSON();
    }

    return this._data;
  }

  _destroyChildRecordData(key) {
    if (this._baseRecordData) {
      return this._baseRecordData._destroyChildRecordData(key);
    }
    if (!this.__childRecordDatas) {
      return;
    }

    return this.__destroyChildRecordData(key);
  }

  __destroyChildRecordData(key) {
    if (!this.__childRecordDatas) {
      return;
    }
    let childRecordData = this._childRecordDatas[key];

    if (childRecordData) {
      // destroy
      delete this._childRecordDatas[key];
    }

    if (this._projections) {
      // TODO Add a test for this destruction
      // start from 1 as we know the first projection is the recordData
      for (let i = 1; i < this._projections.length; i++) {
        this._projections[i].__destroyChildRecordData(key);
      }
    }
  }

  /**
   * Returns an existing child recordData, which can be reused for merging updates or undefined if
   * there is no such child recordData.
   *
   * @param {string} key - The key, which to apply an update to
   * @param {Mixed} newValue - The updates, which needs to be merged
   * @return {M3RecordData} The child record data, which can be reused or undefined if there is none.
   */
  _getExistingChildRecordData(key, newValue) {
    if (
      !this.__childRecordDatas ||
      !this.__childRecordDatas[key] ||
      Array.isArray(this.__childRecordDatas[key])
    ) {
      return undefined;
    }
    let nested = this._childRecordDatas[key];

    // we need to compute the new nested type, hopefully it is not too slow
    let newNestedDef = this._schema.computeNestedModel(
      key,
      newValue,
      this.modelName,
      this.schemaInterface
    );
    let newType = newNestedDef && newNestedDef.type && dasherize(newNestedDef.type);
    let isSameType = newType === nested.modelName || (isNone(newType) && isNone(nested.modelName));

    let newId = newNestedDef && newNestedDef.id;
    let isSameId = newId === nested.id || (isNone(newId) && isNone(nested.id));

    return newNestedDef && isSameType && isSameId ? nested : null;
  }

  /**
   * Updates the childRecordDatas for a key, which is an array,
   * upon any updates to resolved tracked array.
   * @param {string} key
   * @param {string} idx
   * @param {string} removeLength
   * @param {string} addLength
   */
  _resizeChildRecordData(key, idx, removeLength, addLength) {
    const childRecordDatas = this._childRecordDatas && this._childRecordDatas[key];
    if (!childRecordDatas) {
      return;
    }

    assert(
      `Cannot invoke '_resizeChildRecordData' as childRecordData for ${key} is not an array`,
      Array.isArray(childRecordDatas)
    );

    const newItemsInChildRecordData = new Array(addLength);
    Array.prototype.splice.apply(
      childRecordDatas,
      [idx, removeLength].concat(newItemsInChildRecordData)
    );
  }

  _setChildRecordData(key, idx, recordData) {
    if (recordData._baseRecordData && this._baseRecordData) {
      this._baseRecordData._setChildRecordData(key, idx, recordData._baseRecordData);
    } else if (!recordData._baseRecordData && !this._baseRecordData) {
      // TODO assert against one of these being set but the other one not
      if (idx !== undefined && idx !== null) {
        let childRecordDatas = this._childRecordDatas[key];
        if (childRecordDatas === undefined) {
          childRecordDatas = this._childRecordDatas[key] = [];
        }
        childRecordDatas[idx] = recordData;
      } else {
        this._childRecordDatas[key] = recordData;
      }
    } else {
      assert(
        'Projection levels match between the nested recordData being set and the parent recordData',
        false
      );
    }
  }

  _registerProjection(recordData) {
    if (!this._projections) {
      // we ensure projections contains the base as well
      // so we have complete list of all related recordDatas
      this._projections = [this];
    }
    this._projections.push(recordData);
  }

  _unregisterProjection(recordData) {
    if (!this._projections) {
      return;
    }
    let idx = this._projections.indexOf(recordData);
    if (idx === -1) {
      return;
    }
    this._projections.splice(idx, 1);

    // if all projetions have been destroyed and the record is not use, destroy as well
    if (this._areAllProjectionsDestroyed() && !this.isRecordInUse()) {
      this._destroy();
    }
  }

  _destroy() {
    this.isDestroyed = true;
    this.storeWrapper.disconnectRecord(this.modelName, this.id, this.clientId);
    if (this._baseRecordData) {
      this._baseRecordData._unregisterProjection(this);
    }
  }

  /**
   * Checks if the attributes which are considered as changed are still
   * different to the state which is acknowledged by the server.
   *
   * This method is needed when data for the internal model is pushed and the
   * pushed data might acknowledge dirty attributes as confirmed.
   *
   * @method _updateChangedAttributes
   * @private
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

  /**
   * Filters keys, which have local changes in _attributes, because even their value on
   * the server has changed, their local value is not and no property notification should
   * be sent for them.
   *
   * @method _filterChangedKeys
   * @param {Array<string>} changedKeys
   * @returns {Array<string>}
   * @private
   */
  _filterChangedKeys(changedKeys) {
    if (!changedKeys || changedKeys.length === 0) {
      return changedKeys;
    }
    if (!this.hasChangedAttributes()) {
      return changedKeys;
    }
    let attrs = this._attributes;

    return changedKeys.filter(key => attrs[key] === undefined);
  }

  _areAllProjectionsDestroyed() {
    if (!this._projections) {
      // no projections were ever registered
      return true;
    }
    // if this recordData is the last one in the projections list, then all of the others have been destroyed
    // note: should not be possible to get into state of no projections (projections.length === 0)
    return this._projections.length === 1 && this._projections[0] === this;
  }

  /**
   * Merges updates from the server and delegates changes in nested objects to their respective
   * child recordData.
   *
   * @param {Object} updates
   * @param {Function} nestedCallback a callback for updating the data of a nested RecordData instance
   * @param {boolean} calculateChanges
   * @returns {Array<string>} The list of changed keys ignoring any changes in its children.
   * @private
   */
  _mergeUpdates(updates, nestedCallback, calculateChanges) {
    let data = this._data;

    let changedKeys;
    if (calculateChanges) {
      changedKeys = [];
    }

    if (!updates) {
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

      let reusableChild = this._getExistingChildRecordData(key, newValue);
      if (reusableChild) {
        nestedCallback(reusableChild, newValue);
        continue;
      }
      // not an embedded object, destroy the nested recordData
      this._destroyChildRecordData(key);

      if (calculateChanges) {
        changedKeys.push(key);
      }
      data[key] = newValue;
    }

    return changedKeys;
  }

  _notifyRecordProperties(changedKeys) {
    if (CUSTOM_MODEL_CLASS) {
      let record = recordDataToRecordMap.get(this);
      if (record) {
        record._notifyProperties(changedKeys);
      }
    } else {
      if (this._embeddedInternalModel) {
        this._embeddedInternalModel.record._notifyProperties(changedKeys);
      } else if (!this._parentRecordData) {
        notifyProperties(this.storeWrapper, this.modelName, this.id, this.clientId, changedKeys);
      }
    }
    // else base recordData that was initialized by a projection but never
    // fetched via `unknownProperty`, which is the only case where we have no
    // record, and therefore nothing to notify
  }

  _notifyProjectionProperties(changedKeys) {
    if (!changedKeys || !changedKeys.length) {
      return false;
    }
    let projections = this._projections;
    if (!projections) {
      return false;
    }
    for (let i = 0; i < projections.length; i++) {
      projections[i]._notifyRecordProperties(changedKeys);
    }
    return true;
  }

  /**
   * If there are local changes that are not altered by the server payload, we need to manually call didCOmmit
   * on them to sync their states.
   */
  _syncNestedModelUpdates(attributes) {
    // Iterate through the children and call didCommit on it to ensure the childRecordData has the correct state.
    const childRecordDatas = this._getChildRecordDatas();
    childRecordDatas.forEach(childRecordData => {
      // Don't do anything if the key is inside the server payload
      if (attributes && childRecordData.key in attributes) {
        return;
      }

      if (!Array.isArray(childRecordData.data)) {
        childRecordData.data.didCommit();
      } else {
        childRecordData.data.forEach(child => child.didCommit());
      }
    });
  }

  /**
   * Merge data from nested models into parent, so its data is correctly in sync with its children.
   */
  _mergeNestedModelData() {
    // We need to recursively copy the childRecordDatas into data, to ensure the top level model knows about the change.
    const childRecordDatas = this._getChildRecordDatas();
    childRecordDatas.forEach(childRecordData => {
      if (!Array.isArray(childRecordData.data)) {
        this._data[childRecordData.key] = childRecordData.data._data;
      } else {
        this._data[childRecordData.key] = childRecordData.data.map(child => child._data);
      }
    });
  }

  /**
   * Helper function for returning childRecordDatas in {key, value} format
   * e.g, [{childKey, childRecordData}, {...}]
   */
  _getChildRecordDatas() {
    if (this.__childRecordDatas) {
      let nestedKeys = Object.keys(this._childRecordDatas);
      return nestedKeys.map(nestedKey => {
        return {
          key: nestedKey,
          data: this._childRecordDatas[nestedKey],
        };
      });
    }
    return [];
  }

  toString() {
    return `<${this.modelName}:${this.id}>`;
  }
}
