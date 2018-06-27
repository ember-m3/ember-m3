import { isEqual, isNone } from '@ember/utils';
import { dasherize } from '@ember/string';
import { assign, merge } from '@ember/polyfills';
import { copy } from '@ember/object/internals';
import SchemaManager from 'ember-m3/schema-manager';
import { assert } from '@ember/debug';
import Ember from 'ember';

const emberAssign = assign || merge;

function pushDataAndNotify(modelData, updates) {
  modelData.pushData({ attributes: updates }, true, true);
}

function commitDataAndNotify(modelData, updates) {
  modelData.didCommit({ attributes: updates }, true);
}

function notifyProperties(storeWrapper, modelName, id, clientId, changedKeys) {
  Ember.beginPropertyChanges();
  for (let i = 0; i < changedKeys.length; i++) {
    storeWrapper.notifyPropertyChange(modelName, id, clientId, changedKeys[i]);
  }
  Ember.endPropertyChanges();
}

class M3SchemaInterface {
  constructor(modelData) {
    this.modelData = modelData;
    this._keyBeingResolved = null;
    this._refKeyDepkeyMap = {};
  }

  _beginDependentKeyResolution(key) {
    assert(
      'Do not invoke `SchemaInterface` method `_beginDependentKeyResolution` without ending the resolution of previous key.',
      this._keyBeingResolved === null
    );
    this._keyBeingResolved = key;
  }

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

  getAttr(name) {
    let value = this.modelData.getAttr(name);
    const keyBeingResolved = this._keyBeingResolved;
    assert(
      'Do not manually call methods on `schemaInterface` outside of schema resolution hooks such as `computeAttributeReference`',
      keyBeingResolved
    );

    if (name && typeof value !== 'undefined') {
      this._refKeyDepkeyMap[name] = this._refKeyDepkeyMap[name] || [];
      let refKeyMap = this._refKeyDepkeyMap[name];
      if (refKeyMap.indexOf(keyBeingResolved) < 0) {
        refKeyMap.push(this._keyBeingResolved);
      }
    }

    return value;
  }

  setAttr(key, value) {
    this.modelData.setAttr(key, value);
  }
}

export default class M3ModelData {
  constructor(modelName, id, clientId, storeWrapper, parentModelData, baseModelData) {
    this.modelName = modelName;
    this.clientId = clientId;
    this.id = id;
    this.storeWrapper = storeWrapper;
    this.isDestroyed = false;
    this._data = null;
    this._attributes = null;
    this.__inFlightAttributes = null;

    // Properties related to child model datas
    this._parentModelData = parentModelData;
    this._embeddedInternalModel = null;
    this.__childModelDatas = null;
    this._schema = SchemaManager;

    this.schemaInterface = new M3SchemaInterface(this);

    // Properties related to projections
    this._baseModelData = baseModelData;
    this._projections = null;

    this._initBaseModelData();
  }

  // PUBLIC API

  getResourceIdentifier() {
    return {
      id: this.id,
      type: this.modelName,
      clientId: this.clientId,
    };
  }

  pushData(jsonApiResource, calculateChange, notifyRecord = false) {
    if (this._baseModelData) {
      this._baseModelData.pushData(jsonApiResource, calculateChange, notifyRecord);
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

    if (this._notifyProjectionProperties(changedKeys)) {
      return [];
    }

    if (notifyRecord) {
      this._notifyRecordProperties(changedKeys);
    }

    return changedKeys || [];
  }

  willCommit() {
    if (this._baseModelData) {
      return this._baseModelData.willCommit();
    }
    this._inFlightAttributes = this._attributes;
    this._attributes = null;

    if (this.__childModelDatas) {
      let nestedKeys = Object.keys(this._childModelDatas);
      for (let i = 0; i < nestedKeys.length; ++i) {
        let childKey = nestedKeys[i];
        let childModelData = this._childModelDatas[childKey];
        if (!Array.isArray(childModelData)) {
          // we don't re-use nested models within arrays so there's no need to
          // propagate willCommit/didCommit
          childModelData.willCommit();
        }
      }
    }
  }

  hasChangedAttributes() {
    if (this._baseModelData) {
      return this._baseModelData.hasChangedAttributes();
    } else {
      return this.__attributes !== null && Object.keys(this.__attributes).length > 0;
    }
  }

  addToHasMany() {}

  removeFromHasMany() {}

  _initRecordCreateOptions(options) {
    return options !== undefined ? options : {};
  }

  didCommit(jsonApiResource, notifyRecord = false) {
    if (jsonApiResource && jsonApiResource.id) {
      this.id = '' + jsonApiResource.id;
    }
    if (!this._parentModelData) {
      // only set the record ID if it is a top-level model data
      this.storeWrapper.setRecordId(this.modelName, this.id, this.clientId);
    }

    if (this._baseModelData) {
      this._baseModelData.didCommit(jsonApiResource, notifyRecord);
      // we don't need to return any changed keys, because properties will be invalidated
      // as part of notifying all projections
      return [];
    }
    let attributes;
    if (jsonApiResource) {
      attributes = jsonApiResource.attributes;
    }

    emberAssign(this._data, this._inFlightAttributes);
    this._inFlightAttributes = null;

    let changedKeys;
    if (attributes !== undefined) {
      changedKeys = this._mergeUpdates(attributes, commitDataAndNotify, true);
      changedKeys = this._filterChangedKeys(changedKeys);
    }

    this._updateChangedAttributes();

    if (this._notifyProjectionProperties(changedKeys)) {
      return [];
    }

    if (notifyRecord) {
      this._notifyRecordProperties(changedKeys);
    }

    return changedKeys || [];
  }

  getHasMany() {}

  setHasMany() {}

  commitWasRejected() {
    if (this._baseModelData) {
      return this._baseModelData.commitWasRejected();
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

    if (this.__childModelDatas) {
      let nestedKeys = Object.keys(this._childModelDatas);
      for (let i = 0; i < nestedKeys.length; ++i) {
        let childKey = nestedKeys[i];
        let childModelData = this._childModelDatas[childKey];
        if (Array.isArray(childModelData)) {
          for (let j = 0; j < childModelData.length; ++j) {
            childModelData[j].commitWasRejected();
          }
        } else {
          childModelData.commitWasRejected();
        }
      }
    }
  }

  getBelongsTo() {}

  setBelongsTo() {}

  setAttr(key, value) {
    if (this._baseModelData) {
      return this._baseModelData.setAttr(key, value);
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

    if (!this._notifyProjectionProperties([key])) {
      this._notifyRecordProperties([key]);
    }
  }

  getAttr(key) {
    if (this._baseModelData) {
      return this._baseModelData.getAttr(key);
    } else if (key in this._attributes) {
      return this._attributes[key];
    } else if (key in this._inFlightAttributes) {
      return this._inFlightAttributes[key];
    } else {
      return this._data[key];
    }
  }

  hasAttr(key) {
    if (this._baseModelData) {
      return this._baseModelData.hasAttr(key);
    } else {
      return key in this._attributes || key in this._inFlightAttributes || key in this._data;
    }
  }

  hasLocalAttr(key) {
    return key in this._attributes;
  }

  unloadRecord() {
    if (this.isDestroyed) {
      return;
    }
    if (this._baseModelData || this._areAllProjectionsDestroyed()) {
      this._destroy();
    }
  }

  isRecordInUse() {
    return this.storeWrapper.isRecordInUse(this.modelName, this.id, this.clientId);
  }

  removeFromInverseRelationships() {}

  clientDidCreate() {}

  // INTERNAL API

  eachAttribute(callback, binding) {
    if (this.__attributes !== null) {
      Object.keys(this._attributes).forEach(callback, binding);
    }

    if (this.__inFlightAttributes !== null) {
      Object.keys(this._inFlightAttributes).forEach(callback, binding);
    }

    if (this.__data !== null) {
      this._schema.computeAttributes(Object.keys(this._data)).forEach(callback, binding);
    }
  }

  /*
    Returns an object, whose keys are changed properties, and value is an
    [oldProp, newProp] array.

    @method changedAttributes
    @private
  */
  changedAttributes() {
    if (this._baseModelData) {
      return this._baseModelData.changedAttributes();
    }
    let serverState = this._data;
    let localChanges = this._attributes;
    let inFlightData = this._inFlightAttributes;
    let newData = emberAssign(copy(inFlightData), localChanges);
    let _changedAttributes = Object.create(null);
    let newDataKeys = Object.keys(newData);

    for (let i = 0, length = newDataKeys.length; i < length; i++) {
      let key = newDataKeys[i];
      _changedAttributes[key] = [serverState[key], newData[key]];
    }

    if (this.__childModelDatas) {
      let nestedKeys = Object.keys(this._childModelDatas);
      for (let i = 0; i < nestedKeys.length; ++i) {
        let childKey = nestedKeys[i];
        let childModelData = this._childModelDatas[childKey];
        if (Array.isArray(childModelData)) {
          let changes = null;
          for (let j = 0; j < childModelData.length; ++j) {
            let individualChildModelData = childModelData[j];
            let childChangedAttributes = individualChildModelData.changedAttributes();
            if (Object.keys(childChangedAttributes).length > 0) {
              if (changes == null) {
                changes = new Array(childModelData.length);
              }
              changes[j] = childChangedAttributes;
            }
          }
          if (changes !== null) {
            _changedAttributes[childKey] = changes;
          }
        } else {
          let childChangedAttributes = childModelData.changedAttributes();
          if (Object.keys(childChangedAttributes).length > 0) {
            _changedAttributes[childKey] = childChangedAttributes;
          }
        }
      }
    }

    return _changedAttributes;
  }

  rollbackAttributes(notifyRecord = false) {
    let dirtyKeys;
    if (this.hasChangedAttributes()) {
      dirtyKeys = Object.keys(this._attributes);
      this._attributes = null;
    }

    this._inFlightAttributes = null;

    if (this.__childModelDatas) {
      let nestedKeys = Object.keys(this._childModelDatas);
      for (let i = 0; i < nestedKeys.length; ++i) {
        let childKey = nestedKeys[i];
        let childModelData = this._childModelDatas[childKey];
        if (Array.isArray(childModelData)) {
          for (let j = 0; j < childModelData.length; ++j) {
            childModelData[j].rollbackAttributes(true);
          }
        } else {
          childModelData.rollbackAttributes(true);
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

  isAttrDirty(key) {
    if (this._attributes[key] === undefined) {
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

  get _childModelDatas() {
    if (this.__childModelDatas === null) {
      this.__childModelDatas = Object.create(null);
    }
    return this.__childModelDatas;
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

  _initBaseModelData() {
    if (!this._baseModelData) {
      let baseModelName = this._schema.computeBaseModelName(this.modelName);
      if (!baseModelName) {
        return;
      }

      this._baseModelData = this.storeWrapper.modelDataFor(
        dasherize(baseModelName),
        this.id,
        this.clientId
      );
    }

    if (this._baseModelData) {
      this._baseModelData._registerProjection(this);
    }
  }

  _getChildModelData(key, idx, modelName, id, embeddedInternalModel) {
    let childModelData;
    if (idx !== undefined && idx !== null) {
      let childModelDatas = this._childModelDatas[key];
      if (!childModelDatas) {
        childModelDatas = this._childModelDatas[key] = [];
      }
      childModelData = childModelDatas[idx];
      if (!childModelData) {
        childModelData = childModelDatas[idx] = this._createChildModelData(key, idx, modelName, id);
      }
    } else {
      childModelData = this._childModelDatas[key];
      if (!childModelData) {
        childModelData = this._childModelDatas[key] = this._createChildModelData(
          key,
          null,
          modelName,
          id
        );
      }
    }
    if (!childModelData._embeddedInternalModel) {
      childModelData._embeddedInternalModel = embeddedInternalModel;
    }
    return childModelData;
  }

  _createChildModelData(key, idx, modelName, id) {
    let baseChildModelData;
    if (this._baseModelData) {
      // use the base model name if it is available, but otherwise just use the model name - it might be already
      // the base one
      let childBaseModelName = this._schema.computeBaseModelName(modelName) || modelName;
      baseChildModelData = this._baseModelData._getChildModelData(
        key,
        idx,
        childBaseModelName,
        id,
        null
      );
    }

    return new M3ModelData(modelName, id, null, this.storeWrapper, this, baseChildModelData);
  }

  _destroyChildModelData(key) {
    if (!this.__childModelDatas) {
      return;
    }
    let childModelData = this._childModelDatas[key];
    if (childModelData) {
      // destroy
      delete this._childModelDatas[key];
    }
    if (this._projections) {
      // TODO Add a test for this destruction
      // start from 1 as we know the first projection is the model data
      for (let i = 1; i < this._projections.length; i++) {
        this._projections[i]._destroyChildModelData(key);
      }
    }
  }

  /*
    Returns an existing child model data, which can be reused for merging updates or undefined if
    there is no such child model data.

    @param {string} key - The key, which to apply an update to
    @param {Mixed} newValue - The updates, which needs to be merged
    @return {M3ModelData} The child model data, which can be reused or undefined if there is none.
   */
  _getExistingChildModelData(key, newValue) {
    if (
      !this.__childModelDatas ||
      !this.__childModelDatas[key] ||
      Array.isArray(this.__childModelDatas[key])
    ) {
      return undefined;
    }
    let nested = this._childModelDatas[key];

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

  _registerProjection(modelData) {
    if (!this._projections) {
      // we ensure projections contains the base as well
      // so we have complete list of all related model datas
      this._projections = [this];
    }
    this._projections.push(modelData);
  }

  _unregisterProjection(modelData) {
    if (!this._projections) {
      return;
    }
    let idx = this._projections.indexOf(modelData);
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
    if (this._baseModelData) {
      this._baseModelData._unregisterProjection(this);
    }
  }

  /*
    Checks if the attributes which are considered as changed are still
    different to the state which is acknowledged by the server.

    This method is needed when data for the internal model is pushed and the
    pushed data might acknowledge dirty attributes as confirmed.

    @method _updateChangedAttributes
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
    Filters keys, which have local changes in _attributes, because even their value on
    the server has changed, their local value is not and no property notification should
    be sent for them.
    @method _filterChangedKeys
    @private
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
    // if this model data is the last one in the projections list, then all of the others have been destroyed
    // note: should not be possible to get into state of no projections (projections.length === 0)
    return this._projections.length === 1 && this._projections[0] === this;
  }

  /*
    Merges updates from the server and delegates changes in nested objects to their respective
    child model data.

    Returns the list of changed keys ignoring any changes in its children.

    @param updates
    @param nestedCallback a callback for updating the data of a nested model-data instance
    @returns {Array}
    @private
   */
  _mergeUpdates(updates, nestedCallback, calculateChanges) {
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

      let reusableChild = this._getExistingChildModelData(key, newValue);
      if (reusableChild) {
        nestedCallback(reusableChild, newValue);
        continue;
      }
      // not an embedded object, destroy the nested model data
      this._destroyChildModelData(key);

      if (calculateChanges) {
        changedKeys.push(key);
      }
      data[key] = newValue;
    }

    return changedKeys;
  }

  _notifyRecordProperties(changedKeys) {
    if (this._embeddedInternalModel) {
      this._embeddedInternalModel.record._notifyProperties(changedKeys);
    } else if (!this._parentModelData) {
      // only notify through the store if it is not a child model data
      notifyProperties(this.storeWrapper, this.modelName, this.id, this.clientId, changedKeys);
    }
    // else base model data that was initialized by a projection but never
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

  toString() {
    return `<${this.modelName}:${this.id}>`;
  }
}
