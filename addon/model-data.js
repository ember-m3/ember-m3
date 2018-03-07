import { isEqual } from '@ember/utils';
import { assign, merge } from '@ember/polyfills';
import { copy } from '@ember/object/internals';
import { setDiff } from 'ember-m3/util';

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
  constructor(
    modelName,
    id,
    clientId,
    storeWrapper,
    parentModelData,
    parentKey,
    parentValueIsArray,
    embeddedInternalModel
  ) {
    this.modelName = modelName;
    this.clientId = clientId;
    this.id = id;
    this.storeWrapper = storeWrapper;
    this.isDestroyed = false;
    this._data = null;
    this._attributes = null;
    this.__inFlightAttributes = null;

    this._parentModelData = parentModelData;
    this.__childModelDatas = null;
    if (parentKey !== undefined && parentKey !== null) {
      let parentChildren = this._parentModelData._childModelDatas;
      if (parentValueIsArray) {
        parentChildren[parentKey] = parentChildren[parentKey] || [];
        parentChildren[parentKey].push(this);
      } else {
        parentChildren[parentKey] = this;
      }
    }
    this._embeddedInternalModel = embeddedInternalModel;

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

  pushData(jsonApiResource, calculateChange, notifyRecord = false) {
    let changedKeys;

    if (calculateChange) {
      changedKeys = this._changedKeys(jsonApiResource.attributes);
    }

    if (jsonApiResource.attributes !== undefined) {
      this._data = jsonApiResource.attributes;
    }
    if (this.__attributes !== null) {
      // only do if we have attribute changes
      this._updateChangedAttributes();
    }

    if (jsonApiResource.id) {
      this.id = jsonApiResource.id + '';
    }

    if (this.__childModelDatas) {
      let nestedKeys = Object.keys(this._childModelDatas);
      for (let i = 0; i < nestedKeys.length; ++i) {
        let childKey = nestedKeys[i];
        let childModelData = this._childModelDatas[childKey];
        let newAttrs = this._data[childKey];

        if (newAttrs === null || typeof newAttrs !== 'object' || Array.isArray(childModelData)) {
          // changing from nested model -> primitive we don't update inline,
          // just discard the child model data similarly we don't push changes
          // down to arrays of nested models because we don't associate an
          // individual model data with its position in an array
          //
          // this also means that nested m3 models within arrays are not
          // re-used between pushes of data
          delete this._childModelDatas[childKey];
        } else {
          childModelData.pushData({ attributes: this._data[childKey] }, true, true);
        }
      }
    }

    if (notifyRecord) {
      this._embeddedInternalModel.record._notifyProperties(changedKeys);
    }

    return changedKeys;
  }

  willCommit() {
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
    return this.__attributes !== null && Object.keys(this.__attributes).length > 0;
  }

  addToHasMany() {}

  removeFromHasMany() {}

  didCommit(jsonApiResource, notifyRecord = false) {
    let attributes;
    if (jsonApiResource) {
      attributes = jsonApiResource.attributes;
    }
    let changedKeys = this._changedKeys(attributes);

    emberAssign(this._data, this._inFlightAttributes);
    if (attributes !== undefined) {
      this._data = attributes;
    }

    this._inFlightAttributes = null;

    this._updateChangedAttributes();

    if (this.__childModelDatas) {
      let nestedKeys = Object.keys(this._childModelDatas);
      for (let i = 0; i < nestedKeys.length; ++i) {
        let childKey = nestedKeys[i];
        let childModelData = this._childModelDatas[childKey];
        let newAttrs = this._data[childKey];

        if (newAttrs === null || typeof newAttrs !== 'object' || Array.isArray(childModelData)) {
          // we don't re-use nested models within arrays so there's no need to
          // propagate willCommit/didCommit
          delete this._childModelDatas[childKey];
        } else {
          childModelData.didCommit({ attributes: this._data[childKey] }, true);
        }
      }
    }

    if (notifyRecord) {
      this._embeddedInternalModel.record._notifyProperties(changedKeys);
    }

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
    this.destroy();
  }

  isRecordInUse() {
    return this.storeWrapper.isRecordInUse(this.modelName, this.id, this.clientId);
  }

  removeFromInverseRelationships() {}

  clientDidCreate() {}

  // INTERNAL API

  /*
    Returns an object, whose keys are changed properties, and value is an
    [oldProp, newProp] array.

    @method changedAttributes
    @private
  */
  changedAttributes() {
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

    if (notifyRecord) {
      this._embeddedInternalModel.record._notifyProperties(dirtyKeys);
    }

    return dirtyKeys;
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
          // checking via `isEqual` means we'll treat all array and object properties as changed
          changedKeys.push(key);
        }
      }

      let omittedKeys = setDiff(Object.keys(original).sort(), Object.keys(updates).sort());
      changedKeys = changedKeys.concat(omittedKeys);
    }

    return changedKeys;
  }

  toString() {
    return `<${this.modelName}:${this.id}>`;
  }
}
